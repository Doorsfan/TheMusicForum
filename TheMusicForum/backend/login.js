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

    /* Current Date reformatting to count days differential */
    let currentDate = new Date();
    let purged = currentDate.toLocaleDateString().replace('/', '');

    purged = purged.replace('/', '');

    let toBuild =
      purged.substring(purged.length - 4) +
      currentDate.toLocaleDateString().substring(2, 5).replace('/', '');

    let toCheck = purged.substring(0, 2);
    if (toCheck >= 10 && toCheck <= 12) {
      toBuild += purged.substring(0, 2);
    } else {
      toBuild += '0' + purged.substring(0, 1);
    }

    /* Last Changed date reformatting to count days differential */
    let myDate = new Date(result.lastChangedPassword);
    let myDatePurged = myDate.toLocaleDateString().replace('/', '');

    myDatePurged = myDatePurged.replace('/', '');

    let lastChangedToBuild =
      myDatePurged.substring(myDatePurged.length - 4) +
      currentDate.toLocaleDateString().substring(2, 5).replace('/', '');

    let toCheckLastChanged = myDatePurged.substring(0, 2);
    if (toCheckLastChanged >= 10 && toCheckLastChanged <= 12) {
      lastChangedToBuild += myDatePurged.substring(0, 2);
    } else {
      lastChangedToBuild += '0' + myDatePurged.substring(0, 1);
    }

    if (toBuild - lastChangedToBuild >= 22) {
      result.needToUpdate =
        'You last changed your password more than 21 days ago. You must update it.';
    }

    delete result.password;
    delete result.lastChangedPassword;
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
