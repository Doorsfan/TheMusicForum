const passwordEncryptor = require('./passwordEncryptor');
const acl = require('./acl');
const specialRestRoutes = require('./special-rest-routes.js');
const { mutateExecOptions } = require('nodemon/lib/config/load');
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
      if (req.session?.user) {
        let relevantGroup = db.prepare(
          `SELECT * FROM userGroup WHERE name = '${req.body.groupName}'`
        );
        let groupResult = relevantGroup.all();

        let myStatement = db.prepare(
          `INSERT INTO thread (id, groupId, title, postedBy) VALUES (NULL, '${groupResult[0]['id']}', '${req.body.title}', '${req.body.postedBy}')`
        );
        let result = myStatement.run();
        res.json('Made a new thread');
      } else {
        throw 'You need to be logged in when making threads.';
      }
    } catch (e) {
      res.json('You need to be logged in when making threads.');
    }
  });

  app.post('/api/createNewGroup', (req, res) => {
    try {
      if (req.session?.user) {
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
      }
    } catch (e) {
      res.json('Failed to create the group.');
    }
  });

  app.post('/api/createInvite', (req, res) => {
    try {
      if (req.session?.user == undefined) {
        throw 'Have to be logged in for that.';
      }
      let targetUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.targetUser}'`
      );
      if (targetUser.all().length > 0) {
        let targetId = targetUser.all()[0]['id'];

        let fromUser = db.prepare(
          `SELECT * FROM users WHERE username = '${req.body.fromUser}'`
        );
        let sentFromId = fromUser.all()[0]['id'];

        let targetGroup = db.prepare(
          `SELECT * FROM userGroup WHERE name = '${req.body.groupName}'`
        );
        let groupId = targetGroup.all()[0]['id'];

        let seeIfInviteAlreadyExists = db.prepare(
          `SELECT * FROM invitation WHERE fromUserId = '${sentFromId}' AND toUserId = '${targetId}' AND groupId = '${groupId}'`
        );

        let seeIfAlreadyInGroup = db.prepare(
          `SELECT * FROM groupMember WHERE userId = '${targetId}' AND belongsToGroup = '${groupId}'`
        );
        let resultOfAlreadyInGroup = seeIfAlreadyInGroup.all();
        if (resultOfAlreadyInGroup.length > 0) {
          res.json('Failed to create invite, person already in group.');
        } else {
          let inviteResult = seeIfInviteAlreadyExists.all();
          if (inviteResult.length > 0) {
            res.json('That person already had an invite to that group.');
          } else {
            let myStatement = db.prepare(
              `INSERT INTO invitation (id, fromUserId, toUserId, groupId) VALUES (NULL,'${sentFromId}','${targetId}', '${groupId}')`
            );
            let result = myStatement.run();

            res.json('Invite sent.');
          }
        }
      } else {
        res.json('That User does not exist.');
      }
    } catch (e) {
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to invite other users to groups.');
      } else {
        res.json('Failed to create invite');
      }
    }
  });

  app.post('/api/createNewPost/:threadName', (req, res) => {
    try {
      if (req.session?.user == undefined) {
        throw 'Have to be logged in for that.';
      }
      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.postedByUsername}'`
      );
      let foundUser = relevantUser.all();
      let id = foundUser[0]['id'];

      let relevantThread = db.prepare(
        `SELECT * FROM thread WHERE title = '${req.params['threadName']}'`
      );
      let threadResult = relevantThread.all()[0]['id'];
      let makeNewPost = db.prepare(
        `INSERT INTO post (id, postedById, content, blocked, threadId) VALUES (NULL, '${id}', '${req.body.content}', '${req.body.blocked}', '${threadResult}')`
      );
      let result = makeNewPost.run();

      let allPostsForThread = db.prepare(
        `SELECT * FROM post WHERE threadId = '${threadResult}'`
      );
      let allThreadsResult = allPostsForThread.all();
      res.json(allThreadsResult);
    } catch (e) {
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to create new posts to threads.');
      } else {
        res.json(e);
      }
    }
  });

  app.get('/api/getThreadsForGroup/:name', (req, res) => {
    try {
      if (req.session?.user == undefined) {
        throw 'Have to be logged in for that.';
      }
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.params.name}'`
      );
      let relevantId = relevantGroup.all()[0]['id'];

      let relevantThreads = db.prepare(
        `SELECT * FROM thread WHERE groupId = '${relevantId}'`
      );
      let theThreads = relevantThreads.all();
      res.json(theThreads);
    } catch (e) {
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to see threads belonging to a group.');
      } else {
        res.json('Found no threads');
      }
    }
  });

  app.get('/api/getPostsForGroup/:name', (req, res) => {
    try {
      if (req.session?.user == undefined) {
        throw 'Have to be logged in for that.';
      }
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
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to get posts for a group.');
      } else {
        res.json('Failed to find any posts for that thread');
      }
    }
  });

  app.put('/api/promoteUser', (req, res) => {
    try {
      if (req.session?.user == undefined) {
        throw 'Have to be logged in for that.';
      }

      let personWantingToPromote = db.prepare(
        `SELECT * FROM users WHERE userId = '${req.body.personTryingToPromote}'`
      );
      let promoteResult = personWantingToPromote.all()[0]['id'];

      let checkIfModerator = db.prepare(
        `SELECT * FROM groupMember WHERE userId = '${promoteResult}'`
      );
      let moderatorResult = checkIfModerator.all();
      if (moderatorResult.length == 0) {
        throw 'No moderator found to promote from.';
      } else if (moderatorResult[0]['moderatorLevel'] == 'user') {
        throw 'No moderator found to promote from.';
      }
      let relevantGroupId = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.body.groupName}'`
      );
      let wantedId = relevantGroupId.all()[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.relevantUser}'`
      );
      let userId = relevantUser.all()[0]['id'];

      let relevantUpdate = db.prepare(
        `UPDATE groupMember SET moderatorLevel = 'moderator' WHERE userId = '${userId}' AND belongsToGroup = '${wantedId}'`
      );
      let relevantResult = relevantUpdate.run();
      res.json('Promoted to Moderator');
    } catch (e) {
      console.log(e);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to promote people.');
      } else {
        res.json('Something went wrong.');
      }
    }
  });

  app.put('/api/demoteUser', (req, res) => {
    try {
      let relevantGroupId = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.body.groupName}'`
      );
      let wantedId = relevantGroupId.all()[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.relevantUser}'`
      );
      let userId = relevantUser.all()[0]['id'];

      let relevantUpdate = db.prepare(
        `UPDATE groupMember SET moderatorLevel = 'user' WHERE userId = '${userId}' AND belongsToGroup = '${wantedId}'`
      );
      let relevantResult = relevantUpdate.run();
      res.json('Demoted to user');
    } catch (e) {
      res.json('Something went wrong.');
    }
  });

  app.put('/api/unblockUserFromGroup', (req, res) => {
    try {
      let relevantGroupId = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.body.groupName}'`
      );
      let wantedId = relevantGroupId.all()[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.relevantUser}'`
      );
      let userId = relevantUser.all()[0]['id'];

      let relevantUpdate = db.prepare(
        `UPDATE groupMember SET blocked = 0 WHERE userId = '${userId}' AND belongsToGroup = '${wantedId}'`
      );
      let relevantResult = relevantUpdate.run();
      res.json('Unblocked user');
    } catch (e) {
      res.json('Something went wrong.');
    }
  });

  app.put('/api/blockUserFromGroup', (req, res) => {
    try {
      let relevantGroupId = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.body.groupName}'`
      );
      let wantedId = relevantGroupId.all()[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.relevantUser}'`
      );
      let userId = relevantUser.all()[0]['id'];

      let relevantUpdate = db.prepare(
        `UPDATE groupMember SET blocked = 1 WHERE userId = '${userId}' AND belongsToGroup = '${wantedId}'`
      );
      let relevantResult = relevantUpdate.run();
      res.json('Blocked user');
    } catch (e) {
      res.json('Something went wrong.');
    }
  });

  app.get('/api/canIPostInThisGroup/:groupName/:username', (req, res) => {
    try {
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.params['groupName']}'`
      );
      let groupId = relevantGroup.all()[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.params['username']}'`
      );
      let userId = relevantUser.all()[0]['id'];

      let canPostRequest = db.prepare(
        `SELECT * FROM groupMember WHERE userId = '${userId}' AND belongsToGroup = '${groupId}'`
      );

      let allowPosting = canPostRequest.all()[0]['blocked'] == 1 ? false : true;
      res.json(allowPosting);
    } catch (e) {
      console.log(e);
      res.json(true);
    }
  });

  app.get('/api/canIPostInThisThread/:title/:username', (req, res) => {
    try {
      let relevantThread = db.prepare(
        `SELECT * FROM thread WHERE title = '${req.params['title']}'`
      );
      let groupId = relevantThread.all()[0]['groupId'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.params['username']}'`
      );
      let userId = relevantUser.all()[0]['id'];

      let canPostRequest = db.prepare(
        `SELECT * FROM groupMember WHERE userId = '${userId}' AND belongsToGroup = '${groupId}'`
      );

      let allowPosting = canPostRequest.all()[0]['blocked'] == 1 ? false : true;

      res.json(allowPosting);
    } catch (e) {
      console.log(e);
      res.json(true);
    }
  });

  app.delete('/api/removeUserFromGroup/:name', (req, res) => {
    try {
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.params.name}'`
      );
      let groupId = relevantGroup.all()[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.body.relevantUser}'`
      );
      let userId = relevantUser.all()[0]['id'];
      let removeUserFromGroup = db.prepare(
        `DELETE FROM groupMember WHERE belongsToGroup = '${groupId}' AND userId = '${userId}'`
      );
      let result = removeUserFromGroup.run();

      res.json(result);
    } catch (e) {
      console.log(e);
      res.json('Something went wrong.');
    }
  });

  app.get('/api/getGroupMembers/:name', (req, res) => {
    try {
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE name = '${req.params['name']}'`
      );
      let groupId = relevantGroup.all()[0]['id'];

      let groupMembersQuery = db.prepare(
        `SELECT * FROM groupMember WHERE belongsToGroup = '${groupId}'`
      );

      let groupMembers = groupMembersQuery.all().map((user) => {
        var info = Object.assign({}, user);

        let groupMemberName = db.prepare(
          `SELECT username FROM users WHERE id = '${info.userId}'`
        );
        info.relevantUsername = groupMemberName.all()[0]['username'];
        info.belongsToGroup = req.params['name'];
        delete info.userId;
        return info;
      });

      res.json(groupMembers);
    } catch (e) {
      res.json('None in the group.');
    }
  });

  app.get('/api/getGroupsIAmPartOf/:username', (req, res) => {
    let groupsIAmPartOf = [];
    try {
      if (req.session?.user == undefined) {
        throw 'Have to be logged in for that.';
      }
      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = '${req.params.username}'`
      );
      let foundUserId = relevantUser.all()[0]['id'];

      let relevantGroups = db.prepare(
        `SELECT * FROM groupMember WHERE userId = '${foundUserId}'`
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
    } catch (e) {
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to see what groups you are part of.');
      } else {
        res.json('Something went wrong.');
      }
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
