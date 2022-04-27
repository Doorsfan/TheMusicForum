const path = require('path');
const betterSqlite3 = require('better-sqlite3');
const db = betterSqlite3(path.join(__dirname, '../database', 'musicforum.db'));

const port = process.env.PORT || 4000;
const express = require('express');

const app = express();

app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

app.use(express.static(path.join(__dirname, '../dist')));

app.use(express.json({ limit: '100MB' }));

app.listen(port, () => console.log('Listening on http://localhost:' + port));
const login = require('./login.js');

login(app, db);

const setupRESTapi = require('./rest-api');
setupRESTapi(app, db);

// To make frontend work hard reloads serve index.html
// if no other match
app.all('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});
