import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom';

export default function ThreadPage() {

  useEffect(() => {
    (async () => {
      console.log("lol");
      fetch(
        `/api/getThreadsForGroup/678`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      ).then(async (data) => {
        console.log(await data.json());
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
        blahaha
      </div>
    </div>
  );
}
