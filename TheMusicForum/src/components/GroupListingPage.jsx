import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom';

export default function GroupListingPage() {
  const [relevantUsers, setRelevantUsers] = useState([]);
  const [isAnAdmin, setIsAnAdmin] = useState(false);
  const [isAnOwner, setIsAnOwner] = useState(false);
  const [personToInvite, setPersonToInvite] = useState();
  const [moderatorLevel, setModeratorLevel] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    invitePerson(personToInvite);
  };

  function unblockFromGroup(username) {
    let relevantInfo = {
      relevantUser: username,
      groupName: window.location.pathname.split('/')[2],
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
        let loggedIn = await (await fetch('/api/login')).json();
        for (let user of relevantInfo) {
          if (
            (user['moderatorLevel'] == 'owner' ||
              user['moderatorLevel'] == 'admin' ||
              user['moderatorLevel'] == 'moderator') &&
            user['relevantUsername'] == loggedIn?.username
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
    };

    fetch(`/api/blockUserFromGroup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relevantInfo),
    }).then(async (data) => {
      let result = await await (
        await fetch(
          '/api/getGroupMembers/' + window.location.pathname.split('/')[2]
        )
      ).json();
      let emptyArray = [];
      for (let i = 0; i < result.length; i++) {
        emptyArray.push(result[i]);
      }

      setRelevantUsers(emptyArray);
    });
  }

  function removeFromGroup(username) {
    let relevantInfo = {
      relevantUser: username,
      groupName: window.location.pathname.split('/')[2],
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

  useEffect(() => {
    (async () => {
      let adminStatus = await (
        await fetch(
          '/api/whatUserroleAmI/' + window.location.pathname.split('/')[2]
        )
      ).json();

      setModeratorLevel(adminStatus);

      let result = await await (
        await fetch(
          '/api/getGroupMembers/' + window.location.pathname.split('/')[2]
        )
      ).json();
      let emptyArray = [];
      for (let i = 0; i < result.length; i++) {
        emptyArray.push(result[i]);
      }

      setRelevantUsers(emptyArray);
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
        {relevantUsers.map((user) => (
          <div className='memberGrid' key={user.username}>
            {user.blocked === 0 && moderatorLevel != 'user' && (
              <button
                onClick={() => blockFromGroup(user.username)}
                className='blockUserButton'
              >
                Block Users Content
              </button>
            )}
            {user.blocked === 1 && moderatorLevel != 'user' && (
              <button
                onClick={() => unblockFromGroup(user.username)}
                className='blockUserButton'
              >
                Unblock Users Content
              </button>
            )}
            {moderatorLevel == 'user' && (
              <button disabled className='blockUserButton'>
                Block Users Content
              </button>
            )}
            <div className='SpaceBlock' />
            {user.username}
            <div className='SpaceBlock' />
            {user.belongsToGroup}
            <div className='SpaceBlock' />
            {user.moderatorLevel}
            <div className='SpaceBlock' />
            {user.moderatorLevel == 'user' && moderatorLevel != 'user' && (
              <button
                onClick={() => removeFromGroup(user.username)}
                className='removeUserFromGroupButton'
              >
                Remove From Group
              </button>
            )}
            {user.moderatorLevel == 'user' && moderatorLevel == 'user' && (
              <button disabled className='removeUserFromGroupButton'>
                Remove From Group
              </button>
            )}

            {user.moderatorLevel == 'user' && moderatorLevel != 'user' && (
              <button
                onClick={() => promoteUser(user.username)}
                className='promoteUserButton'
              >
                Promote User
              </button>
            )}
            {user.moderatorLevel == 'user' && moderatorLevel == 'user' && (
              <button className='promoteUserButton' disabled>
                Promote User
              </button>
            )}
            {user.moderatorLevel == 'moderator' && moderatorLevel == 'owner' && (
              <div className='promoteDemoteDiv'>
                <button
                  onClick={() => demoteUser(user.username)}
                  className='demoteUser'
                >
                  Demote User
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {moderatorLevel !== 'user' && (
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
