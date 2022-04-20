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
              user['moderatorLevel'] == 'admin') &&
            user['relevantUsername'] == document.cookie.split('=')[1]
          ) {
            setIsAnAdmin(true);
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
          relevantUsers.map((item) => (
            <div className='userGridInProfile' key={item.relevantUsername}>
              <div className='SpaceBlock' />
              {isAnAdmin &&
                item.relevantUsername != document.cookie.split('=')[1] && (
                  <button
                    onClick={() => removeFromGroup(item.relevantUsername)}
                    className='removeUserFromGroup'
                  >
                    Remove From Group
                  </button>
                )}
              {!isAnAdmin &&
                item.relevantUsername != document.cookie.split('=')[1] && (
                  <div className='SpaceBlock' />
                )}
              {item.relevantUsername == document.cookie.split('=')[1] && (
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
              <button className='demoteUser'>Demote User</button>
              <div className='SpaceBlock' />
            </div>
          ))}
      </div>
    </div>
  );
}
