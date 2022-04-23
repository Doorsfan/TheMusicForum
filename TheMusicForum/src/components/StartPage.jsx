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

  let navigate = useNavigate();

  function logout() {
    fetch(`api/logout`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (data) => {
      let loggedout = await data.json();
      setLoggedIn(false);
    });
  }

  function leaveGroup(groupName) {
    console.log('temp');
  }

  function joinGroup(groupName, userName) {
    let groupInfo = {
      name: groupName,
      groupJoiner: document.cookie.split('=')[1],
    };
    fetch(`api/joinGroup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groupInfo),
    }).then(async (data) => {
      let loggedout = await data.json();
      setLoggedIn(false);
      setJoinedNewGroup(false);
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
              onClick={() => leaveGroup(name, document.cookie)}
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
            onClick={() => joinGroup(name, document.cookie)}
            className='joinGroupButton'
          >
            Join Group
          </button>
        );
      }
    }
  };

  // Run this when our component mounts (we can see it on screen)
  useEffect(() => {
    (async () => {
      if (document.cookie) {
        setLoggedIn(true);
      } else {
        setLoggedIn(false);
      }
      setThreads(await Thread.find());
      setUserGroups(await UserGroup.find());
      if (!joinedNewGroup) {
        fetch(`api/getGroupsIAmPartOf/` + document.cookie.split('=')[1], {
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
            <Link className='profileLink' to={`/Profile/${document.cookie}`}>
              My Profile
            </Link>
          </div>
        )}
      </div>
      <main>
        <div className='GroupsTitle'>Groups</div>
        {userGroups.map(({ id, name, description }) => (
          <div
            className='group'
            key={id}
            onClick={() => {
              if (loggedIn) {
                navigate('./Threads/' + name);
              }
            }}
          >
            <h3 className='groupName'>{name}</h3>
            <div className='descriptionDiv'>{description}</div>
            {renderJoinButton(name)}
          </div>
        ))}
      </main>
    </div>
  );
}
