import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom';

export default function GroupListingPage() {
  const [relevantUsers, setRelevantUsers] = useState();
  const [isAnAdmin, setIsAnAdmin] = useState(false);
  const [isAnOwner, setIsAnOwner] = useState(false);
  const [personToInvite, setPersonToInvite] = useState();

  const handleSubmit = async (e) => {
    e.preventDefault();
    invitePerson(personToInvite);
  };

  function unblockFromGroup(username) {
    let relevantInfo = {
      relevantUser: username,
      groupName: window.location.pathname.split('/')[2],
      personTryingToUnblock: loggedInUsername,
    };

    fetch(`/api/unblockUserFromGroup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relevantInfo),
    }).then(async (data) => {
      let result = await data.json();

      fetch(`/api/getGroupMembers/` + window.location.pathname.split('/')[2], {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        for (let user of relevantInfo) {
          if (
            (user['moderatorLevel'] == 'owner' ||
              user['moderatorLevel'] == 'admin' ||
              user['moderatorLevel'] == 'moderator') &&
            user['relevantUsername'] == (await getLoggedInUser())?.username
          ) {
            setIsAnAdmin(true);
          }
          if (user['moderatorLevel'] == 'owner') {
            setIsAnOwner(true);
          }
        }
        setRelevantUsers(relevantInfo);
      });
    });
  }

  function promoteUser(username) {
    let relevantInfo = {
      personTryingToPromote: loggedInUsername,
      relevantUser: username,
      groupName: window.location.pathname.split('/')[2],
    };

    fetch(`/api/promoteUser`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relevantInfo),
    }).then(async (data) => {
      let result = await data.json();

      fetch(`/api/getGroupMembers/` + window.location.pathname.split('/')[2], {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        for (let user of relevantInfo) {
          if (
            (user['moderatorLevel'] == 'owner' ||
              user['moderatorLevel'] == 'admin' ||
              user['moderatorLevel'] == 'moderator') &&
            user['relevantUsername'] == (await getLoggedInUser())?.username
          ) {
            setIsAnAdmin(true);
          }
          if (user['moderatorLevel'] == 'owner') {
            setIsAnOwner(true);
          }
        }
        setRelevantUsers(relevantInfo);
      });
    });
  }

  function demoteUser(username) {
    let relevantInfo = {
      relevantUser: username,
      groupName: window.location.pathname.split('/')[2],
      personTryingToDemote: loggedInUsername,
    };

    fetch(`/api/demoteUser`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relevantInfo),
    }).then(async (data) => {
      let result = await data.json();

      fetch(`/api/getGroupMembers/` + window.location.pathname.split('/')[2], {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        for (let user of relevantInfo) {
          if (
            (user['moderatorLevel'] == 'owner' ||
              user['moderatorLevel'] == 'admin' ||
              user['moderatorLevel'] == 'moderator') &&
            user['relevantUsername'] == (await getLoggedInUser())?.username
          ) {
            setIsAnAdmin(true);
          }
          if (user['moderatorLevel'] == 'owner') {
            setIsAnOwner(true);
          }
        }
        setRelevantUsers(relevantInfo);
      });
    });
  }

  function invitePerson() {
    let relevantInfo = {
      targetUser: personToInvite,
      fromUser: loggedInUsername,
      groupName: window.location.pathname.split('/')[2],
    };
    fetch('/api/createInvite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relevantInfo),
    }).then(async (data) => {
      let result = await data.json();
    });
  }

  function blockFromGroup(username) {
    let relevantInfo = {
      relevantUser: username,
      groupName: window.location.pathname.split('/')[2],
      personTryingToBlock: loggedInUsername,
    };

    fetch(`/api/blockUserFromGroup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relevantInfo),
    }).then(async (data) => {
      let result = await data.json();

      fetch(`/api/getGroupMembers/` + window.location.pathname.split('/')[2], {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        for (let user of relevantInfo) {
          if (
            (user['moderatorLevel'] == 'owner' ||
              user['moderatorLevel'] == 'admin' ||
              user['moderatorLevel'] == 'moderator') &&
            user['relevantUsername'] == (await getLoggedInUser())?.username
          ) {
            setIsAnAdmin(true);
          }
          if (user['moderatorLevel'] == 'owner') {
            setIsAnOwner(true);
          }
        }
        setRelevantUsers(relevantInfo);
      });
    });
  }

  function removeFromGroup(username) {
    let relevantInfo = {
      relevantUser: username,
      groupName: window.location.pathname.split('/')[2],
      personTryingToRemove: loggedInUsername,
    };
    fetch(
      `/api/removeUserFromGroup/` + window.location.pathname.split('/')[2],
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(relevantInfo),
      }
    ).then(async (data) => {
      fetch(`/api/getGroupMembers/` + window.location.pathname.split('/')[2], {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        setRelevantUsers(relevantInfo);
      });
    });
  }

  const [moderatorLevel, setModeratorLevel] = useState(null);

  useEffect(() => {
    (async () => {
      setModeratorLevel(
        await (
          await fetch(
            '/api/whatUserroleAmI/' + window.location.pathname.split('/')[2]
          )
        ).json()
      );

      fetch(`/api/getGroupMembers/` + window.location.pathname.split('/')[2], {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        console.log('The relevant info in GroupListing page: ', relevantInfo);

        for (let user of relevantInfo) {
          if (
            (user['moderatorLevel'] == 'owner' ||
              user['moderatorLevel'] == 'admin' ||
              user['moderatorLevel'] == 'moderator') &&
            user['relevantUsername'] == (await getLoggedInUser())?.username
          ) {
            setIsAnAdmin(true);
          }
          if (user['moderatorLevel'] == 'owner') {
            setIsAnOwner(true);
          }
        }
        setRelevantUsers(relevantInfo);
      });
    })();
  }, []);

  return (
    <div>
      <div className='header'>
        <div className='SpaceBlock' />
        <div className='homeText'></div>
        <div className='SpaceBlock' />
        <div className='ForumText'>The Music Forum</div>
        <div className='SpaceBlock' />
        <div className='homeText'>
          <Link className='homeLink' to='/'>
            Home
          </Link>
        </div>
      </div>
      <div>
        <div className='titleItemsGrid'>
          <div className='SpaceBlock' />
          Username
          <div className='SpaceBlock' />
          Group Name
          <div className='SpaceBlock' />
          Moderator Level
          <div className='SpaceBlock' />
        </div>
        {relevantUsers &&
          relevantUsers.map(async (item) => (
            <div className='userGridInProfile' key={item.relevantUsername}>
              {isAnAdmin &&
                item.blocked == 0 &&
                item.relevantUsername !=
                  (await getLoggedInUser())?.username && (
                  <button
                    onClick={() => blockFromGroup(item.relevantUsername)}
                    className='blockUserButton'
                  >
                    Block Users Content
                  </button>
                )}
              {isAnAdmin &&
                item.blocked == 1 &&
                item.relevantUsername !=
                  (await getLoggedInUser())?.username && (
                  <button
                    onClick={() => unblockFromGroup(item.relevantUsername)}
                    className='blockUserButton'
                  >
                    Unblock Users Content
                  </button>
                )}
              <div className='SpaceBlock' />
              {isAnAdmin &&
                item.relevantUsername !=
                  (await getLoggedInUser())?.username && (
                  <button
                    onClick={() => removeFromGroup(item.relevantUsername)}
                    className='removeUserFromGroupButton'
                  >
                    Remove From Group
                  </button>
                )}
              {!isAnAdmin &&
                item.relevantUsername !=
                  (await getLoggedInUser())?.username && (
                  <div className='SpaceBlock' />
                )}
              {item.relevantUsername == (await getLoggedInUser())?.username && (
                <button
                  onClick={() => removeFromGroup(item.relevantUsername)}
                  className='removeUserFromGroup'
                >
                  Leave Group
                </button>
              )}

              <div className='SpaceBlock' />
              {item.relevantUsername}
              <div className='SpaceBlock' />
              {item.belongsToGroup}
              <div className='SpaceBlock' />
              {item.moderatorLevel}
              <div className='SpaceBlock' />
              {item.moderatorLevel != 'user' && isAnAdmin && (
                <button
                  onClick={() => demoteUser(item.relevantUsername)}
                  className='demoteUser'
                >
                  Demote User
                </button>
              )}
              {
                /*moderatorLevel !== 'user'*/ [
                  'owner',
                  'admin',
                  'moderator',
                ].includes(moderatorLevel) && (
                  <button
                    onClick={() => promoteUser(item.relevantUsername)}
                    className='promoteUserButton'
                  >
                    Promote User
                  </button>
                )
              }
              {item.moderatorLevel == 'user' && <div className='SpaceBlock' />}
              <div className='SpaceBlock' />
            </div>
          ))}
      </div>
      {isAnAdmin && (
        <form className='invitePersonForm' onSubmit={handleSubmit}>
          <input
            onChange={(e) => setPersonToInvite(e.target.value)}
            type='text'
            className='inviteInput'
            placeholder='Who do you wish to invite?'
          ></input>
          <button className='invitePersonButton' type='submit'>
            Invite
          </button>
        </form>
      )}
    </div>
  );
}
