const passwordEncryptor = require('./passwordEncryptor');

module.exports = function (app, runQuery, db) {
  function editMyUserInfo(req, res) {
    let userId = req.session.user?.id;

    delete req.body.userRole;

    let queryParameters = { ...req.body, id: userId };

    if (queryParameters.password) {
      queryParameters.password = passwordEncryptor(queryParameters.password);
    }

    runQuery(
      'edit-my-user-info',
      req,
      res,
      queryParameters,
      `
        UPDATE users
        SET ${Object.keys(req.body).map((x) => x + ' = :' + x)}
        WHERE id = :id
    `
    );

    let stmt = db.prepare('SELECT * FROM users WHERE id = :id');
    let updatedUserInfo = stmt.all({ id: queryParameters.id })[0];
    delete updatedUserInfo.password;
    req.session.user = updatedUserInfo;
  }
  app.put('/api/edit-my-user-info', editMyUserInfo);
  app.patch('/api/edit-my-user-info', editMyUserInfo);
};
