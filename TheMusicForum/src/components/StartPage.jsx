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
    });
  }

  // Run this when our component mounts (we can see it on screen)
  useEffect(() => {
    (async () => {
      if (document.cookie) {
        setLoggedIn(true);
      }
      setThreads(await Thread.find());
      setUserGroups(await UserGroup.find());
    })();
  }, []);

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
            <button
              onClick={() => joinGroup(name, document.cookie)}
              className='joinGroupButton'
            >
              Join Group
            </button>
          </div>
        ))}
        {threads.map(({ id, groupId, title, created, locked, postedBy }) => (
          <div className='thread' key={id} onClick={() => alert(title)}>
            <h3 className='topicTitle'>{title}</h3>
            <div className='SpaceBlock' />
            <div className='createdAndPostedDiv'>
              <div className='createdDiv'>
                <p>
                  Created:{' '}
                  {new Date(created)
                    .toLocaleDateString()
                    .replace(',', '')
                    .substring(0, 8) +
                    ' - ' +
                    new Date(created).toLocaleTimeString().substring(0, 8)}
                </p>
              </div>
              <div className='postedDiv'>
                <p>Posted by: {postedBy}</p>
              </div>
            </div>
            <div className='SpaceBlock' />
          </div>
        ))}
      </main>
    </div>
  );
}
