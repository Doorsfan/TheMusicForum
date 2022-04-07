const passwordEncryptor = require('./passwordEncryptor');
const acl = require('./acl');
const specialRestRoutes = require('./special-rest-routes.js');
const userTable = 'customers';

let db;

function runQuery(tableName, req, res, parameters, sqlForPreparedStatement, onlyOne = false) {

  if (!acl(tableName, req)) {
    res.status(405);
    res.json({ _error: 'Not allowed!' });
    return;
  }

  let result;
  try {
    let stmt = db.prepare(sqlForPreparedStatement);
    let method = sqlForPreparedStatement.trim().toLowerCase().indexOf('select') === 0 ?
      'all' : 'run';
    result = stmt[method](parameters);
  }
  catch (error) {
    result = { _error: error + '' };
  }
  if (onlyOne) { result = result[0]; }
  result = result || null;
  res.status(result ? (result._error ? 500 : 200) : 404);
  setTimeout(() => res.json(result), 1);
}

module.exports = function setupRESTapi(app, databaseConnection) {

  db = databaseConnection;

  let tablesAndViews = db.prepare(`
    SELECT name, type 
    FROM sqlite_schema
    WHERE 
      (type = 'table' OR type = 'view') 
      AND name NOT LIKE 'sqlite_%'
  `).all();

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
      runQuery(name, req, res, {}, `
        SELECT *
        FROM ${name}
      `);
    });

    app.get('/api/' + name + '/:id', (req, res) => {
      runQuery(name, req, res, req.params, `
        SELECT *
        FROM ${name}
        WHERE id = :id
      `, true);
    });

    if (type === 'view') {
      continue;
    }

    app.post('/api/' + name, (req, res) => {
      delete req.body.id;

      if (name === userTable) {
        req.body.userRole = 'user';
        req.body.password =
          passwordEncryptor(req.body.password);
      }

      runQuery(name, req, res, req.body, `
        INSERT INTO ${name} (${Object.keys(req.body)})
        VALUES (${Object.keys(req.body).map(x => ':' + x)})
      `);
    });

    let putAndPatch = (req, res) => {

      if (name === userTable && req.body.password) {
        req.body.password =
          passwordEncryptor(req.body.password);
      }

      runQuery(name, req, res, { ...req.body, ...req.params }, `
        UPDATE ${name}
        SET ${Object.keys(req.body).map(x => x + ' = :' + x)}
        WHERE id = :id
      `);
    };

    app.put('/api/' + name + '/:id', putAndPatch);
    app.patch('/api/' + name + '/:id', putAndPatch);

    app.delete('/api/' + name + '/:id', (req, res) => {
      runQuery(name, req, res, req.params, `
        DELETE FROM ${name}
        WHERE id = :id
      `);
    });

  }

  specialRestRoutes(app, runQuery, db);

  app.all('/api/*', (req, res) => {
    res.status(404);
    res.json({ _error: 'No such route!' });
  });

  app.use((error, req, res, next) => {
    if (error) {
      let result = {
        _error: error + ''
      };
      res.json(result);
    }
    else {
      next();
    }
  });

}