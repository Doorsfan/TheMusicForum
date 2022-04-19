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

  app.post('/api/createNewThread', (req, res) => {
    try {
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.body.groupName}'`
      );
      let groupResult = relevantGroup.all();

      let myStatement = db.prepare(
        `INSERT INTO thread (id, groupId, title, postedBy) VALUES (NULL, '${groupResult[0]['id']}', '${req.body.title}', '${req.body.postedBy}')`
      );
      let result = myStatement.run();
      res.json('Made a new thread');
    } catch (e) {
      res.json('Failed to make a new thread');
    }
  });

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

  app.post('/api/createNewPost/:threadName', (req, res) => {
    try {
      let relevantUser = db.prepare(`SELECT * FROM users WHERE username = '${req.body.postedByUsername}'`)
      let foundUser = relevantUser.all();
      let id = foundUser[0]['id'];
      let makeNewPost = db.prepare(
        `INSERT INTO post (id, postedById, content, blocked, threadId) VALUES (NULL, '${id}', '${req.body.content}', '${req.body.blocked}', '7')`
      );
      let result = makeNewPost.run();
      console.log(result);

      let allPostsForThread = db.prepare(
        `SELECT * FROM post WHERE threadId = 7`
      );
      let allThreadsResult = allPostsForThread.all();
      res.json(allThreadsResult);
    } catch (e) {
      console.log(e);
      res.json(e);
    }
  });

  app.get('/api/getThreadsForGroup/:name', (req, res) => {
    try {
      let relevantGroup = db.prepare(`SELECT * FROM userGroup WHERE name = '${req.params.name}'`)
      let relevantId = relevantGroup.all()[0]['id']

      let relevantThreads = db.prepare(`SELECT * FROM thread WHERE groupId = '${relevantId}'`)
      let theThreads = relevantThreads.all();
      res.json(theThreads);
    }
    catch (e) {
      res.json("Found no threads");
    }
  })

  app.get('/api/getPostsForGroup/:name', (req, res) => {
    try {
      let relevantThreads = db.prepare(
        `SELECT * FROM thread WHERE title = '${req.params['name']}'`
      );
      let threadsResult = relevantThreads.all();

      let posts = db.prepare(
        `SELECT * FROM post WHERE threadid = '${threadsResult[0]['id']}'`
      );
      let myPosts = posts.all();
      res.json(myPosts);
    } catch (e) {
      res.json('Failed to find any threads.');
    }
  });

  app.get('/api/getGroupsIAmPartOf', (req, res) => {
    let groupsIAmPartOf = [];
    try {
      if (req.session.user) {
        let relevantGroups = db.prepare(
          `SELECT * FROM groupMember WHERE userId = '${req.session.user.id}'`
        );
        let allGroups = relevantGroups.all();
        let groupIDs = [];
        for (let i = 0; i < allGroups.length; i++) {
          groupIDs.push(allGroups[i]['belongsToGroup']);
        }

        for (let e = 0; e < groupIDs.length; e++) {
          let groupIAmOfResult = db.prepare(
            `SELECT * FROM userGroup WHERE id = '${groupIDs[e]}'`
          );
          let groupIAmOfQueriedResult = groupIAmOfResult.all();
          groupsIAmPartOf.push(groupIAmOfQueriedResult[0]['name']);
        }

        res.json(groupsIAmPartOf);
      }
    } catch (e) {
      res.json('Failed to find any groups.');
    }
  });

  app.post('/api/joinGroup', (req, res) => {
    try {
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.body.name}'`
      );
      let relevantGroupResult = relevantGroup.all();

      let groupJoiner = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.groupJoiner}'`
      );
      let groupJoinerResult = groupJoiner.all();

      let myStatement = db.prepare(
        `INSERT INTO groupMember (userId, belongsToGroup, moderatorLevel) VALUES ('${groupJoinerResult[0].id}','${relevantGroupResult[0].id}','user')`
      );
      let result = myStatement.run();

      res.json('Successfully joined a group.');
    } catch (e) {
      res.json('Failed to join a group.');
    }
  });

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
