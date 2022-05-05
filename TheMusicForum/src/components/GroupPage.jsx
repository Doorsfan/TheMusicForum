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

export default function GroupPage() {
  const [threads, setThreads] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [canCreateThread, setCanCreateThread] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState('');

  let navigate = useNavigate();

  function logout() {
    fetch(`/api/logout`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (data) => {
      let loggedout = await data.json();
      setLoggedIn(false);
      navigate('/');
    });
  }

  function goToCreateThreadPage() {
    navigate('/CreateNewThread/' + window.location.pathname.split('/')[2]);
  }

  function goToThread(threadName) {
    navigate('/postsForThread/' + threadName);
  }

  // Run this when our component mounts (we can see it on screen)
  useEffect(() => {
    (async () => {
      fetch(`/api/whoAmI`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        if (!relevantInfo) {
          navigate('/');
        } else {
          setLoggedIn(true);
        }
      });

      fetch(`/api/loggedInUsersUsername`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let result = await data.json();
        setLoggedInUsername(result);
      });

      fetch(
        `/api/getThreadsForGroup/` + window.location.pathname.split('/')[2],
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      ).then(async (data) => {
        let foundThreads = await data.json();
        setThreads(foundThreads);
      });

      fetch(`/api/getGroupsIAmPartOf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantGroups = await data.json();
        for (let i = 0; i < relevantGroups.length; i++) {
          if (relevantGroups[i] == window.location.pathname.split('/')[2]) {
            setCanCreateThread(true);
          }
        }
      });

      fetch(
        `/api/canIPostInThisGroup/${window.location.pathname.split('/')[2]}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      ).then(async (data) => {
        let result = await data.json();
        setCanCreateThread(result);
        if (!result) {
          navigate('/');
        }
      });
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
            <Link className='profileLink' to={`/Profile/${loggedInUsername}`}>
              My Profile
            </Link>
          </div>
        )}
      </div>
      <main>
        <div className='GroupsTitle'>Groups</div>
        {canCreateThread && (
          <button
            onClick={() => goToCreateThreadPage()}
            className='createNewThreadButton'
          >
            Create New Thread
          </button>
        )}
        {threads.map(({ id, groupId, title, created, locked, postedBy }) => (
          <div className='thread' key={id} onClick={() => goToThread(title)}>
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
