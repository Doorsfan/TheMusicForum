const passwordEncryptor = require('./passwordEncryptor');
const acl = require('./acl');
const specialRestRoutes = require('./special-rest-routes.js');
const { mutateExecOptions } = require('nodemon/lib/config/load');
const res = require('express/lib/response');
const req = require('express/lib/request');
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
    res.status(403);
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
      res.status(403);
      res.json({ _error: 'Not allowed!' });
      return;
    }
    res.json(tablesAndViews);
  });

  app.get('/api/getAllGroups', (req, res) => {
    try {
      let relevantGroup = db.prepare(`SELECT * FROM userGroup`);
      let groupResult = relevantGroup.all();
      res.status(200);
      res.json(groupResult);
    } catch (e) {
      res.json('Something went wrong.');
    }
  });

  app.post('/api/createNewThread', (req, res) => {
    try {
      console.log(req.session.user);
      if (req.session?.user) {
        let relevantGroup = db.prepare(
          `SELECT * FROM userGroup WHERE userGroup.name = :name`
        );
        let groupResult = relevantGroup.all({
          name: req.body.groupName,
        });

        let myStatement = db.prepare(
          `INSERT INTO thread (id, groupId, title, postedBy, originalThreadPost, blocked) VALUES (NULL, :groupId, :title, :postedBy, :originalThreadPost, 0)`
        );
        let result = myStatement.run({
          groupId: groupResult[0]['id'],
          title: req.body.title,
          postedBy: req.session.user.username,
          originalThreadPost: req.body.originalThreadPost,
        });
        res.status(200);
        res.json('Made a new thread');
      } else {
        throw 'You need to be logged in when making threads.';
      }
    } catch (e) {
      console.log(e);
      res.status(403);
      res.json('You need to be logged in when making threads.');
    }
  });

  app.post('/api/createNewGroup', (req, res) => {
    try {
      if (seeIfIAmLoggedIn(req)) {
        let myStatement = db.prepare(
          `INSERT INTO userGroup (id, description, name) VALUES (NULL, :description , :name)`
        );
        let result = myStatement.run({
          description: req.body.description,
          name: req.body.name,
        });

        let myGroup = db.prepare(
          `SELECT * FROM userGroup WHERE userGroup.name = :name`
        );
        let myGroupResult = myGroup.run({
          name: req.body.name,
        });

        let groupOwner = db.prepare(
          `SELECT * FROM users WHERE users.username = :username`
        );
        let groupOwnerResult = groupOwner.all({
          username: req.session.user.username,
        });

        let createMyGroupMember = db.prepare(
          `INSERT INTO groupMember (userId, belongsToGroup, moderatorLevel) VALUES (:userId, :belongsToGroup, 'owner')`
        );
        let createGroupMemberResult = createMyGroupMember.run({
          userId: groupOwnerResult[0]['id'],
          belongsToGroup: myGroupResult['lastInsertRowid'],
        });
        res.status(200);
        res.json(
          'Successfully made a new group with the name of: ' + req.body.name
        );
      }
    } catch (e) {
      res.status(403);
      res.json('Failed to create the group.');
    }
  });

  app.post('/api/createInvite', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let targetUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      if (
        targetUser.all({
          username: req.body.targetUser,
        }).length > 0
      ) {
        let targetId = targetUser.all({
          username: req.body.targetUser,
        })[0]['id'];

        let fromUser = db.prepare(
          `SELECT * FROM users WHERE users.username = :username`
        );
        let sentFromId = fromUser.all({
          username: req.session.user.username,
        })[0]['id'];

        let targetGroup = db.prepare(
          `SELECT * FROM userGroup WHERE userGroup.name = :name`
        );
        let groupId = targetGroup.all({
          name: req.body.groupName,
        })[0]['id'];

        let seeIfInviteAlreadyExists = db.prepare(
          `SELECT * FROM invitation WHERE invitation.fromUserId = :fromUserId AND invitation.toUserId = :toUserId AND invitation.groupId = :groupId`
        );

        let seeIfAlreadyInGroup = db.prepare(
          `SELECT * FROM groupMember WHERE groupMember.userId = :userId AND groupMember.belongsToGroup = :belongsToGroup`
        );
        let resultOfAlreadyInGroup = seeIfAlreadyInGroup.all({
          userId: targetId,
          belongsToGroup: groupId,
        });
        if (resultOfAlreadyInGroup.length > 0) {
          res.json('Failed to create invite, person already in group.');
        } else {
          let inviteResult = seeIfInviteAlreadyExists.all({
            fromUserId: sentFromId,
            toUserId: targetId,
            groupId: groupId,
          });
          if (inviteResult.length > 0) {
            res.json('That person already had an invite to that group.');
          } else {
            let myStatement = db.prepare(
              `INSERT INTO invitation (id, fromUserId, toUserId, groupId) VALUES (NULL,:fromUserId,:toUserId, :groupId)`
            );
            let result = myStatement.run({
              fromUserId: sentFromId,
              toUserId: targetId,
              groupId: groupId,
            });
            res.status(200);
            res.json('Invite sent.');
          }
        }
      } else {
        res.status(404);
        res.json('That User does not exist.');
      }
    } catch (e) {
      console.log(e);
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to invite other users to groups.');
      } else {
        res.json('Failed to create invite');
      }
    }
  });

  function seeIfIAmLoggedIn(req) {
    return req.session.user != null;
  }

  app.post('/api/createNewPost/:threadName', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let foundUser = relevantUser.all({
        username: req.session.user.username,
      });
      let id = foundUser[0]['id'];

      let relevantThread = db.prepare(
        `SELECT * FROM thread WHERE thread.title = :title`
      );
      let threadResult = relevantThread.all({
        title: req.params['threadName'],
      })[0]['id'];
      let makeNewPost = db.prepare(
        `INSERT INTO post (id, postedById, content, blocked, threadId) VALUES (NULL, :postedById, :content, :blocked, :threadId)`
      );
      let result = makeNewPost.run({
        postedById: id,
        content: req.body.content,
        blocked: req.body.blocked,
        threadId: threadResult,
      });

      let allPostsForThread = db.prepare(
        `SELECT * FROM post WHERE post.threadId = :threadId`
      );
      let allThreadsResult = allPostsForThread.all({
        threadId: threadResult,
      });
      res.status(200);
      res.json(allThreadsResult);
    } catch (e) {
      console.log(e);
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to create new posts to threads.');
      } else {
        res.json(e);
      }
    }
  });

  app.get('/api/getThreadsForGroup/:name', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let relevantId = relevantGroup.all({
        name: req.params['name'],
      })[0]['id'];

      let relevantThreads = db.prepare(
        `SELECT * FROM thread WHERE thread.groupId = :groupId`
      );
      let theThreads = relevantThreads.all({
        groupId: relevantId,
      });
      res.status(200);
      res.json(theThreads);
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to see threads belonging to a group.');
      } else {
        res.json('Found no threads');
      }
    }
  });

  app.get('/api/getPostsForGroup/:name', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let relevantThreads = db.prepare(
        `SELECT * FROM thread WHERE thread.title = :title`
      );
      let threadsResult = relevantThreads.all({
        title: req.params['name'],
      });

      let posts = db.prepare(
        `SELECT * FROM post WHERE post.threadid = :threadid`
      );

      let myPosts = posts.all({
        threadid: threadsResult[0]['id'],
      });

      res.status(200);
      res.json(myPosts);
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to get posts for a group.');
      } else {
        res.json('Failed to find any posts for that thread');
      }
    }
  });

  app.get('/api/whatUserroleAmI/:groupName', (req, res) => {
    //rework prepared to be added by values in a object in all or run
    //utilize req.session.user instead
    let myQuery = db.prepare(`
      SELECT * 
      FROM groupMember, userGroup 
      WHERE groupMember.belongsToGroup = userGroup.id 
      AND userGroup.name = :groupName 
      AND groupMember.userId = :userId
    `);
    let result = myQuery.all({
      groupName: req.params.groupName,
      userId: req.session.user.id,
    });
    res.json((result[0] || {}).moderatorLevel || null);
  });

  app.put('/api/promoteUser', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }

      let personWantingToPromote = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let promoteResult = personWantingToPromote.all({
        username: req.session.user.username,
      })[0]['id'];

      let checkIfModerator = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.userId = :userId`
      );
      let moderatorResult = checkIfModerator.all({
        userId: promoteResult,
      });
      if (moderatorResult.length == 0) {
        throw 'No moderator found to promote from.';
      } else if (moderatorResult[0]['moderatorLevel'] == 'user') {
        throw 'No moderator found to promote from.';
      }
      let relevantGroupId = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let wantedId = relevantGroupId.all({
        name: req.body.groupName,
      })[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let userId = relevantUser.all({
        username: req.body.relevantUser,
      })[0]['id'];

      let relevantUpdate = db.prepare(
        `UPDATE groupMember SET moderatorLevel = 'moderator' WHERE groupMember.userId = :userId AND groupMember.belongsToGroup = :belongsToGroup`
      );
      let relevantResult = relevantUpdate.run({
        userId: userId,
        belongsToGroup: wantedId,
      });
      res.status(200);
      res.json('Promoted to Moderator');
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to promote people.');
      } else {
        res.json('Insufficient rights to do that.');
      }
    }
  });

  app.put('/api/demoteUser', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let personWantingToDemote = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let demoteResult = personWantingToDemote.all({
        username: req.session.user.username,
      })[0]['id'];

      let checkIfModerator = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.userId = :userId`
      );
      let moderatorResult = checkIfModerator.all({
        userId: demoteResult,
      });
      if (moderatorResult.length == 0) {
        throw 'No moderator found to demote from.';
      } else if (moderatorResult[0]['moderatorLevel'] == 'user') {
        throw 'No moderator found to demote from.';
      }
      let relevantGroupId = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let wantedId = relevantGroupId.all({
        name: req.body.groupName,
      })[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE username = :username`
      );
      let userId = relevantUser.all({
        username: req.body.relevantUser,
      })[0]['id'];

      let relevantUpdate = db.prepare(
        `UPDATE groupMember SET moderatorLevel = 'user' WHERE groupMember.userId = :userId AND groupMember.belongsToGroup = :belongsToGroup`
      );
      let relevantResult = relevantUpdate.run({
        userId: userId,
        belongsToGroup: wantedId,
      });
      res.status(200);
      res.json('Demoted to user');
    } catch (e) {
      console.log(e);
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to demote people.');
      } else {
        res.json('Insufficient rights to demote.');
      }
    }
  });

  app.put('/api/unblockUserFromGroup', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let personWantingToUnblock = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let unblockResult = personWantingToUnblock.all({
        username: req.session.user.username,
      })[0]['id'];

      let checkIfModerator = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.userId = :userId`
      );
      let moderatorResult = checkIfModerator.all({
        userId: unblockResult,
      });
      if (moderatorResult.length == 0) {
        throw 'No moderator found to unblock from.';
      } else if (moderatorResult[0]['moderatorLevel'] == 'user') {
        throw 'No moderator found to unblock from.';
      }

      let relevantGroupId = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let wantedId = relevantGroupId.all({
        name: req.body.groupName,
      })[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let userId = relevantUser.all({
        username: req.body.relevantUser,
      })[0]['id'];

      let relevantUpdate = db.prepare(
        `UPDATE groupMember SET blocked = 0 WHERE groupMember.userId = :userId AND groupMember.belongsToGroup = :belongsToGroup`
      );
      let relevantResult = relevantUpdate.run({
        userId: userId,
        belongsToGroup: wantedId,
      });
      res.status(200);
      res.json('Unblocked user');
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to unblock people.');
      } else {
        res.json('Insufficient rights to unblock.');
      }
    }
  });

  app.put('/api/blockUserFromGroup', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }

      let personWantingToBlock = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let blockResult = personWantingToBlock.all({
        username: req.session.user.username,
      })[0]['id'];

      let checkIfModerator = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.userId = :userId`
      );
      let moderatorResult = checkIfModerator.all({
        userId: blockResult,
      });
      if (moderatorResult.length == 0) {
        throw 'No moderator found to block from.';
      } else if (moderatorResult[0]['moderatorLevel'] == 'user') {
        throw 'No moderator found to block from.';
      }

      let relevantGroupId = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let wantedId = relevantGroupId.all({
        name: req.body.groupName,
      })[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let userId = relevantUser.all({
        username: req.body.relevantUser,
      })[0]['id'];

      let relevantUpdate = db.prepare(
        `UPDATE groupMember SET blocked = 1 WHERE groupMember.userId = :userId AND groupMember.belongsToGroup = :belongsToGroup`
      );
      let relevantResult = relevantUpdate.run({
        userId: userId,
        belongsToGroup: wantedId,
      });
      res.status(200);
      res.json('Blocked user');
    } catch (e) {
      res.status(403);
      console.log(e);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to block people.');
      } else {
        res.json('Insufficient rights to block a person.');
      }
    }
  });

  app.get('/api/canIPostInThisGroup/:groupName', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let groupId = relevantGroup.all({
        name: req.params['groupName'],
      })[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let userId = relevantUser.all({
        username: req.session.user.username,
      })[0]['id'];

      let canPostRequest = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.userId = :userId AND groupMember.belongsToGroup = :belongsToGroup`
      );

      let allowPosting = canPostRequest.all({
        userId: userId,
        belongsToGroup: groupId,
      });
      let canPost = false;
      if (allowPosting.length > 0) {
        canPost = true;
      }
      res.status(200);
      res.json(canPost);
    } catch (e) {
      console.log(e);
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to post in threads.');
      } else {
        res.json(false);
      }
    }
  });

  app.get('/api/canIPostInThisThread/:title', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let relevantThread = db.prepare(
        `SELECT * FROM thread WHERE thread.title = :title`
      );
      let groupId = relevantThread.all({
        title: req.params['title'],
      })[0]['groupId'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let userId = relevantUser.all({
        username: req.session.user.username,
      })[0]['id'];

      let canPostRequest = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.userId = :userId AND groupMember.belongsToGroup = :belongsToGroup`
      );

      let allowPosting =
        canPostRequest.all({
          userId: userId,
          belongsToGroup: groupId,
        })[0]['blocked'] == 1
          ? false
          : true;
      res.status(200);
      res.json(allowPosting);
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to perform that action.');
      } else {
        res.json(true);
      }
    }
  });

  app.post('/api/registerNewUser', (req, res) => {
    try {
      let newUser = db.prepare(`
      INSERT INTO users (id, role, blocked, profileimage, username, password, lastChangedPassword) VALUES (NULL, 'user', 0, :profileimage, :username, :password, :lastChangedPassword)
    `);
      newUser.run({
        profileimage: req.body.profileimage,
        username: req.body.username,
        password: passwordEncryptor(req.body.password),
        lastChangedPassword: Date.now(),
      });
      res.status(200);
      res.json('Made a new user.');
    } catch (e) {
      res.status(403);
      res.json('Something went wrong');
    }
  });

  app.delete('/api/leaveGroup/:name', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }

      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let groupId = relevantGroup.all({
        name: req.params['name'],
      })[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let userId = relevantUser.all({
        username: req.session.user.username,
      })[0]['id'];
      let removeUserFromGroup = db.prepare(
        `DELETE FROM groupMember WHERE groupMember.belongsToGroup = :belongsToGroup AND groupMember.userId = :userId`
      );
      let result = removeUserFromGroup.run({
        belongsToGroup: groupId,
        userId: userId,
      });
      res.status(200);
      res.json(result);
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Cannot do that without being logged in.');
      } else {
        res.json('Something went wrong');
      }
    }
  });

  app.delete('/api/removeUserFromGroup/:name', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }

      let personWantingToRemove = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let removeResult = personWantingToRemove.all({
        username: req.session.user.username,
      })[0]['id'];

      let checkIfModerator = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.userId = :userId`
      );
      let moderatorResult = checkIfModerator.all({
        userId: removeResult,
      });

      if (moderatorResult.length == 0) {
        throw 'No moderator found to remove from.';
      } else if (moderatorResult[0]['moderatorLevel'] == 'user') {
        if (!(req.session.user.username == req.body.personTryingToRemove)) {
          throw 'Not allowed to remove a person who is not yourself.';
        }
      }

      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let groupId = relevantGroup.all({
        name: req.params['name'],
      })[0]['id'];

      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let userId = relevantUser.all({
        username: req.body.relevantUser,
      })[0]['id'];
      let removeUserFromGroup = db.prepare(
        `DELETE FROM groupMember WHERE groupMember.belongsToGroup = :belongsToGroup AND groupMember.userId = :userId`
      );
      let result = removeUserFromGroup.run({
        belongsToGroup: groupId,
        userId: userId,
      });
      res.status(200);
      res.json(result);
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Cannot do that without being logged in.');
      } else {
        res.json('Insufficient rights to remove a person');
      }
    }
  });

  app.get('/api/getGroupMembers/:name', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let groupId = relevantGroup.all({
        name: req.params['name'],
      })[0].id;

      let groupMembersQuery = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.belongsToGroup = :belongsToGroup`
      );

      let groupMembers = groupMembersQuery
        .all({
          belongsToGroup: groupId,
        })
        .map((user) => {
          let relevantPerson = db.prepare(
            `SELECT * FROM users WHERE users.id = :id`
          );
          let userResult = relevantPerson.all({
            id: user.userId,
          });
          delete userResult[0].password;
          delete userResult[0].lastChangedPassword;
          userResult[0].belongsToGroup = req.params.name;
          userResult[0].moderatorLevel = user.moderatorLevel;
          userResult[0].blocked = user.blocked;
          return userResult[0];
        });

      res.status(200);
      res.json(groupMembers);
    } catch (e) {
      res.status(403);
      console.log(e);
      if (e == 'Have to be logged in for that.') {
        res.json('Cannot do that without being logged in.');
      } else {
        res.json('Something went wrong');
      }
    }
  });

  app.get('/api/getGroupsIAmPartOf', (req, res) => {
    let groupsIAmPartOf = [];
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      let relevantUser = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let foundUserId = relevantUser.all({
        username: req.session.user.username,
      })[0]['id'];

      let relevantGroups = db.prepare(
        `SELECT * FROM groupMember WHERE groupMember.userId = :userId`
      );

      let allGroups = relevantGroups.all({
        userId: req.session.user.id,
      });
      let groupIDs = [];
      for (let i = 0; i < allGroups.length; i++) {
        groupIDs.push(allGroups[i]['belongsToGroup']);
      }

      for (let e = 0; e < groupIDs.length; e++) {
        let groupIAmOfResult = db.prepare(
          `SELECT * FROM userGroup WHERE userGroup.id = :id`
        );
        let groupIAmOfQueriedResult = groupIAmOfResult.all({
          id: groupIDs[e],
        });
        groupsIAmPartOf.push(groupIAmOfQueriedResult[0]['name']);
      }
      res.status(200);
      res.json(groupsIAmPartOf);
    } catch (e) {
      console.log(e);
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in to see what groups you are part of.');
      } else {
        res.json('Something went wrong.');
      }
    }
  });

  app.get('/api/loggedInUsersUsername', (req, res) => {
    if (req.session.user) {
      res.status(200);
      res.json(req.session.user.username);
    } else {
      res.status(403);
      res.json('Something went wrong.');
    }
  });

  app.post('/api/joinGroup', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }

      let relevantGroup = db.prepare(
        `SELECT * FROM userGroup WHERE userGroup.name = :name`
      );
      let relevantGroupResult = relevantGroup.all({
        name: req.body.name,
      });

      let groupJoiner = db.prepare(
        `SELECT * FROM users WHERE users.username = :username`
      );
      let groupJoinerResult = groupJoiner.all({
        username: req.session.user.username,
      });

      let myStatement = db.prepare(
        `INSERT INTO groupMember (userId, belongsToGroup, moderatorLevel) VALUES (:userId, :belongsToGroup,'user')`
      );
      let result = myStatement.run({
        userId: req.session.user.id,
        belongsToGroup: relevantGroupResult[0].id,
      });
      res.status(200);
      res.json('Successfully joined a group.');
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in for that action.');
      } else {
        res.json('Something went wrong.');
      }
    }
  });

  app.get('/api/getUserInfo/:username', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
      res.status(200);
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
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in for that action.');
      } else {
        res.json('Something went wrong.');
      }
    }
  });

  app.get('/api/whoAmI/:username', (req, res) => {
    try {
      if (!seeIfIAmLoggedIn(req)) {
        throw 'Have to be logged in for that.';
      }
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
    } catch (e) {
      res.status(403);
      if (e == 'Have to be logged in for that.') {
        res.json('Have to be logged in for that action.');
      } else {
        res.json('Something went wrong.');
      }
    }
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
