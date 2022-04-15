const passwordEncryptor = require('./passwordEncryptor');
const acl = require('./acl');
const specialRestRoutes = require('./special-rest-routes.js');
const userTable = 'customers';

let db;

function runMyQuery(
  req,
  res,
  parameters,
  sqlForPreparedStatement,
  onlyOne,
  withResponse = true
) {
  let result;

  try {
    let stmt = db.prepare(sqlForPreparedStatement);
    let method =
      sqlForPreparedStatement.trim().toLowerCase().indexOf('select') === 0
        ? 'all'
        : 'run';
    result = stmt[method](parameters);
  } catch (error) {
    result = { _error: error + '' };
  }
  if (onlyOne) {
    result = result[0];
  }
  result = result || null;

  if (withResponse) {
    res.status(result ? (result._error ? 500 : 200) : 404);
    setTimeout(() => res.json(result), 1);
  } else {
    return result;
  }
}

function runQuery(
  tableName,
  req,
  res,
  parameters,
  sqlForPreparedStatement,
  onlyOne = false
) {
  /*
  if (!acl(tableName, req)) {
    res.status(405);
    res.json({ _error: 'Not allowed!' });
    return;
  } */

  let result;
  try {
    let stmt = db.prepare(sqlForPreparedStatement);
    let method =
      sqlForPreparedStatement.trim().toLowerCase().indexOf('select') === 0
        ? 'all'
        : 'run';
    result = stmt[method](parameters);
  } catch (error) {
    result = { _error: error + '' };
  }
  if (onlyOne) {
    result = result[0];
  }
  result = result || null;
  res.status(result ? (result._error ? 500 : 200) : 404);
  setTimeout(() => res.json(result), 1);
}

module.exports = function setupRESTapi(app, databaseConnection) {
  db = databaseConnection;

  let tablesAndViews = db
    .prepare(
      `
    SELECT name, type 
    FROM sqlite_schema
    WHERE 
      (type = 'table' OR type = 'view') 
      AND name NOT LIKE 'sqlite_%'
  `
    )
    .all();

  app.get('/api/tablesAndViews', (req, res) => {
    if (!acl('tablesAndViews', req)) {
      res.status(405);
      res.json({ _error: 'Not allowed!' });
      return;
    }
    res.json(tablesAndViews);
  });

  for (let { name, type } of tablesAndViews) {
    app.get('/api/' + name, (req, res) => {
      runQuery(
        name,
        req,
        res,
        {},
        `
        SELECT *
        FROM '${name}'
      `
      );
    });

    app.get('/api/' + name + '/:id', (req, res) => {
      runQuery(
        name,
        req,
        res,
        req.params,
        `
        SELECT *
        FROM '${name}'
        WHERE id = :id
      `,
        true
      );
    });

    if (type === 'view') {
      continue;
    }

    app.post('/api/' + name, (req, res) => {
      delete req.body.id;

      if (name === userTable) {
        req.body.userRole = 'user';
        req.body.password = passwordEncryptor(req.body.password);
      }

      if (req.body.password) {
        req.body.password = passwordEncryptor(req.body.password);
      }

      runQuery(
        name,
        req,
        res,
        req.body,
        `
        INSERT INTO '${name}' (${Object.keys(req.body)})
        VALUES (${Object.keys(req.body).map((x) => ':' + x)})
      `
      );
    });

    let putAndPatch = (req, res) => {
      if (name === userTable && req.body.password) {
        req.body.password = passwordEncryptor(req.body.password);
      }

      runQuery(
        name,
        req,
        res,
        { ...req.body, ...req.params },
        `
        UPDATE '${name}'
        SET ${Object.keys(req.body).map((x) => x + ' = :' + x)}
        WHERE id = :id
      `
      );
    };

    app.put('/api/' + name + '/:id', putAndPatch);
    app.patch('/api/' + name + '/:id', putAndPatch);

    app.delete('/api/' + name + '/:id', (req, res) => {
      runQuery(
        name,
        req,
        res,
        req.params,
        `
        DELETE FROM '${name}'
        WHERE id = :id
      `
      );
    });
  }

  app.post('/api/createNewGroup', (req, res) => {
    try {
      let myStatement = db.prepare(
        `INSERT INTO userGroup (id, description, name) VALUES (NULL,'${req.body.description}' , '${req.body.name}')`
      );
      let result = myStatement.run();

      let myGroup = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.body.name}'`
      );
      let myGroupResult = myGroup.run();

      let groupOwner = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.groupOwner}'`
      );
      let groupOwnerResult = groupOwner.all();

      let createMyGroupMember = db.prepare(
        `INSERT INTO groupMember (userId, belongsToGroup, moderatorLevel) VALUES ('${groupOwnerResult[0]['id']}', '${myGroupResult['lastInsertRowid']}', 'owner')`
      );
      let createGroupMemberResult = createMyGroupMember.run();

      res.json(
        'Successfully made a new group with the name of: ' + req.body.name
      );
    } catch (e) {
      res.json('Failed to create the group.');
    }
  });

  app.post('/api/joinGroup', (req, res) => {
    try {
      console.log("FIRST")

      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.body.name}'`
      );
      let relevantGroupResult = relevantGroup.all();
      console.log("relevantGroupREsult:", relevantGroupResult);

      console.log("req body: ", req.body)
      let groupJoiner = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.groupJoiner}'`
      );
      let groupJoinerResult = groupJoiner.all();
      console.log("Groupjoiners ID: ", groupJoinerResult)

      console.log("SECOND")

      let myStatement = db.prepare(
        `INSERT INTO groupMember (userId, belongsToGroup, moderatorLevel) VALUES ('${groupJoinerResult[0].id}','${relevantGroupResult[0].id}','user')`
      );
      let result = myStatement.run();
      console.log("THIRD", result)

      res.json(
        'Successfully joined a group.'
      );
    } catch (e) {
      res.json('Failed to join a group.');
    }
  })

  app.get('/api/getUserInfo/:username', (req, res) => {
    runMyQuery(
      req,
      res,
      req.params,
      `
        SELECT blocked, profileImage, username
        FROM users
        WHERE username = :username
        `,
      true
    );
  });

  app.get('/api/whoAmI/:username', (req, res) => {
    runMyQuery(
      req,
      res,
      req.params,
      `
        SELECT role
        FROM users
        WHERE username = :username
      `,
      true
    );
  });

  app.get('/api/getSession', (req, res) => {
    runMyQuery(
      req,
      res,
      req.params,
      `
        SELECT * FROM sessions
        `,
      true
    );
  });

  specialRestRoutes(app, runQuery, db);

  app.all('/api/*', (req, res) => {
    res.status(404);
    res.json({ _error: 'No such route!' });
  });

  app.use((error, req, res, next) => {
    if (error) {
      let result = {
        _error: error + '',
      };
      res.json(result);
    } else {
      next();
    }
  });
};
