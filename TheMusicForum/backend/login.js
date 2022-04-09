const session = require('express-session');
const store = require('better-express-store');
const acl = require('./acl');
const passwordEncryptor = require('./passwordEncryptor');

module.exports = function (app, db) {
  app.use(
    session({
      secret: 'someUnusualStringThatIsUniqueForThisProject',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: 'auto' },
      store: store({ dbPath: './database/musicforum.db' }),
    })
  );

  app.post('/api/login', (req, res) => {
    if (!acl('login', req)) {
      res.status(405);
      res.json({ _error: 'Not allowed' });
    }
    req.body.password = passwordEncryptor(req.body.password);

    let stmt = db.prepare(`
      SELECT * FROM users
      WHERE username = :username AND password = :password
    `);
    let result = stmt.all(req.body)[0] || { _error: 'No such user.' };
    delete result.password;
    if (!result._error) {
      req.session.user = result;
    }
    res.json(result);
  });

  app.get('/api/login', (req, res) => {
    if (!acl('login', req)) {
      res.status(405);
      res.json({ _error: 'Not allowed' });
    }
    res.json(req.session.user || { _error: 'Not logged in' });
  });

  app.delete('/api/login', (req, res) => {
    if (!acl('login', req)) {
      res.status(405);
      res.json({ _error: 'Not allowed' });
    }
    delete req.session.user;
    res.json({ success: 'logged out' });
  });
};
