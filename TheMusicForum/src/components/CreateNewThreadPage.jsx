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
  const [originalThreadPost, setOriginalThreadPost] = useState('');
  let navigate = useNavigate();

  useEffect(() => {
    (async () => {
      let result = await (await fetch('/api/login')).json();
      if (!result) {
        navigate('/');
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let threadInfo = {
      title: threadTitle,
      groupName: window.location.pathname.split('/')[2],
      originalThreadPost: originalThreadPost,
    };

    fetch('/api/createNewThread', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(threadInfo),
    }).then(async (data) => {
      let myThread = await data.json();
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
      <div>
        <form onSubmit={handleSubmit} className='threadForm'>
          <label>
            <p>Thread Title</p>
            <input
              type='text'
              onChange={(e) => setThreadTitle(e.target.value)}
            />
          </label>
          <label>
            <p>First Post</p>
            <textarea
              onChange={(e) => setOriginalThreadPost(e.target.value)}
              className='firstPostInput'
              rows='5'
              cols='50'
            ></textarea>
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
