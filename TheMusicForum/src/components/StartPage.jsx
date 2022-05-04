import { useState, useEffect } from 'react';

// a subclass to FetchHelper
import Thread from '../utilities/Thread';
import UserGroup from '../utilities/UserGroup';
import LoginPage from './LoginPage';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom';

// a "lazy"/automatically created subclass to FetchHelper
import { factory } from '../utilities/FetchHelper';

const { Book, Author } = factory;

export default function StartPage() {
  const [threads, setThreads] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [alreadyPartOfGroups, setAlreadyPartOfGroups] = useState([]);
  const [joinedNewGroup, setJoinedNewGroup] = useState(false);

  function rerender() {
    // Not pretty but works for now - har reload of page
    location.reload();
  }

  let navigate = useNavigate();

  function checkIfIAmLoggedIn() {
    let loggedIn = false;
    fetch(`/api/whoAmI`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (data) => {
      let relevantInfo = await data.json();
      loggedIn = relevantInfo;
    });
    return loggedIn;
  }

  function logout() {
    let loggedInUser = {
      username: loggedInUsername,
    };
    fetch(`/api/logout`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loggedInUser),
    }).then(async (data) => {
      let loggedout = await data.json();
      setLoggedIn(false);
    });
  }

  function leaveGroup(name) {
    let relevantInfo = {
      relevantUser: loggedInUsername,
      name: window.location.pathname.split('/')[2],
      personTryingToRemove: loggedInUsername,
    };
    fetch(`/api/whoAmI`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (data) => {
      let relevantInfo = await data.json();
      console.log(relevantInfo);
    });
    fetch(`/api/removeUserFromGroup/` + name, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(relevantInfo),
    }).then(async (data) => {
      let response = await data.json();
      rerender();
    });
  }

  function joinGroup(groupName, userName) {
    let groupInfo = {
      name: groupName,
      groupJoiner: loggedInUsername,
    };
    fetch(`api/joinGroup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groupInfo),
    }).then(async (data) => {
      setJoinedNewGroup(true);
      rerender();
    });
  }

  const renderJoinButton = (name) => {
    let foundName = false;
    if (loggedIn) {
      for (let e = 0; e < alreadyPartOfGroups.length; e++) {
        if (name == alreadyPartOfGroups[e]) {
          foundName = true;
          return (
            <button
              onClick={() => leaveGroup(name)}
              className='joinGroupButton'
            >
              Leave Group
            </button>
          );
        }
      }
      if (!foundName) {
        return (
          <button
            onClick={async () =>
              joinGroup(name, (await getLoggedInUser())?.username)
            }
            className='joinGroupButton'
          >
            Join Group
          </button>
        );
      }
    }
  };

  const [loggedInUsername, setLoggedInUsername] = useState('');

  // Run this when our component mounts (we can see it on screen)
  useEffect(() => {
    (async () => {
      setLoggedInUsername((await getLoggedInUser())?.username);

      fetch(`/api/whoAmI`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        console.log('Session response from backend: ', relevantInfo);
        if (!relevantInfo) {
          setLoggedIn(false);
        } else {
          setLoggedIn(true);
        }
      });

      fetch(`api/getAllGroups/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let result = await data.json();
        setUserGroups(result);
      });

      if (!joinedNewGroup && (await getLoggedInUser())?.username) {
        fetch(`api/getGroupsIAmPartOf/` + (await getLoggedInUser())?.username, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }).then(async (data) => {
          setAlreadyPartOfGroups(await data.json());
          setJoinedNewGroup(true);
        });
      }
    })();
  }, [alreadyPartOfGroups]);

  return (
    <div className='body'>
      <div className='header'>
        <div className='SpaceBlock' />
        <div className='homeText'></div>
        <div className='SpaceBlock' />
        <div className='ForumText'>The Music Forum</div>
        <div className='SpaceBlock' />
        {!loggedIn && (
          <div className='loginText'>
            <Link className='loginLink' to='/Login'>
              Login
            </Link>
          </div>
        )}
        {loggedIn && (
          <div onClick={logout} className='logOutText'>
            Logout
          </div>
        )}
        {loggedIn && (
          <div className='profileText'>
            <Link className='profileLink' to={`/Profile/${loggedInUsername}`}>
              My Profile
            </Link>
          </div>
        )}
      </div>
      <main>
        <div className='GroupsTitle'>Groups</div>
        {userGroups.map(({ id, name, description }) => (
          <div className='group' key={id}>
            <h3
              className='groupName'
              onClick={() => {
                if (checkIfIAmLoggedIn()) {
                  navigate('./Threads/' + name);
                }
              }}
            >
              {name}
            </h3>
            <div className='descriptionDiv'>{description}</div>
            {renderJoinButton(name)}
          </div>
        ))}
      </main>
    </div>
  );
}
