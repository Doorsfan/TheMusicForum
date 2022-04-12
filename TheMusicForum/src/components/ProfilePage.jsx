import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import FetchHelper from '../utilities/FetchHelper';

export default function ProfilePage() {
  const [userRole, setUserRole] = useState();
  const [username, setUserName] = useState();
  const [userGroups, setUserGroups] = useState();

  useEffect(() => {
    (async () => {
      
      fetch('/api/getSession', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let response = await data.json();
        console.log(response);
        if (response?.session) {
          console.log(document.cookie);
          fetch(`/api/whoAmI/${document.cookie}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(async (data) => {
            let myUserRole = await data.json();
            setUserRole(myUserRole.role);
          });
          fetch(`/api/getUserInfo/${document.cookie}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(async (data) => {
            let relevantInfo = await data.json();
            setUserName(relevantInfo.username)
            setUserGroups('bla');
          });
        }
        else {
          window.location = '/';
        }
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
      <div className="createNewGroupDiv">
        <Link className="createNewGroupLink" to='/createNewGroup'>
          Create New Group
        </Link>
      </div>
      {userRole && <div className='roleText'>Site Role: {userRole}</div>}
      {username && <div className='usernameText'>Username: {username}</div>}
      {userGroups && <div className='groupsText'>Groups: {userGroups}</div>}
    </div>
  );
}
