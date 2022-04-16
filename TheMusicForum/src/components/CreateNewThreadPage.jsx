import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom';

export default function CreateNewThreadPage() {
  const [threadTitle, setThreadTitle] = useState();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(e);
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
      <div>
        <form onSubmit={handleSubmit} className='threadForm'>
          <label>
            <p>Thread Title</p>
            <input
              type='text'
              onChange={(e) => setThreadTitle(e.target.value)}
            />
          </label>
          <button
            className='createThreadButton'
            type='submit'
            value='Create New Thread'
          >
            Create New Thread
          </button>
        </form>
      </div>
    </div>
  );
}
