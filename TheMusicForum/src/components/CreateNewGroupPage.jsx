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
import UserGroup from '../utilities/UserGroup';

export default function CreateNewGroupPage() {
  const [description, setDescription] = useState();
  const [name, setName] = useState();

  const handleSubmit = async (e) => {
    e.preventDefault();

    let newGroup = {
      description: description,
      name: name,
    };

    fetch('/api/createNewGroup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newGroup),
    }).then(async (data) => {
      let myGroupResult = await data.json();

      if (myGroupResult != 'Failed to create the group.') {
        window.location = '/';
      }
    });
  };

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
      <form onSubmit={handleSubmit} className='registerForm'>
        <label>
          <p>Group Name</p>
          <input type='text' onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <p>Group Description</p>
          <input type='text' onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button className='submitButton' type='submit'>
          Create New Group
        </button>
      </form>
    </div>
  );
}
