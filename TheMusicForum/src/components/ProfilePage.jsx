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

  let navigate = useNavigate();

  useEffect(() => {
    (async () => {
      let loggedIn = await (await fetch('/api/login')).json();
      fetch(`/api/getUserInfo/${loggedIn?.username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        setUserName(relevantInfo.username);
      });
      fetch(`/api/getGroupsIAmPartOf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let relevantInfo = await data.json();
        setUserGroups(relevantInfo);
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
      <div className='createNewGroupDiv'>
        <Link className='createNewGroupLink' to='/createNewGroup'>
          Create New Group
        </Link>
      </div>
      {userRole && <div className='roleText'>Site Role: {userRole}</div>}
      {username && <div className='usernameText'>Username: {username}</div>}
      {userGroups && (
        <div className='groupsText'>
          Groups:
          {userGroups.map((item) => (
            <div
              className='groupItemInProfile'
              onClick={() => {
                navigate('../../memberListing/' + item);
              }}
              key={item}
            >
              <div className='group'>{item}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
