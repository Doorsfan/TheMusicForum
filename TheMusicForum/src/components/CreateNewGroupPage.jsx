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
import Group from '../utilities/Group';

export default function CreateNewGroupPage() {
  async function createNewGroup() {
    let newGroup = {
      description: 'bla',
      name: 'bla',
    };
    console.log(newGroup);

    fetch('/api/group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newGroup),
    }).then(async (data) => {
      console.log(await data.json());
    });
  }

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
      <button onClick={createNewGroup}>Create New Group</button>
    </div>
  );
}
