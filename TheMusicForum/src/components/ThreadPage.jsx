import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom';

export default function ThreadPage() {
  const [threads, setThreads] = useState([]);
  const [creatingNewResponse, setCreatingNewResponse] = useState(false);
  const [responseContent, setResponseContent] = useState('');

  function postThreadResponse(responseContent) {
    fetch('/api/createNewPost/' + window.location.pathname.split('/')[2], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }).then(async (data) => {
      let myUser = await data.json();
    });
  }

  function createNewPost() {
    setCreatingNewResponse(true);
  }

  useEffect(() => {
    (async () => {
      console.log('lol');
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
        console.log(foundThreads);
        setThreads(foundThreads);
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
      <button className='createNewPostButton' onClick={createNewPost}>
        Create New Post
      </button>
      {creatingNewResponse && (
        <div className='mainPostInputDiv'>
          <div className='postInputDiv'>
            <textarea
              onChange={(e) => setResponseContent(e.target.value)}
              className='postInput'
              placeholder='Your response..'
              rows='5'
              cols='50'
            ></textarea>
          </div>
          <button
            onClick={() => {
              postThreadResponse(responseContent)
            }}
            className='postResponseButton'
          >
            Post Response
          </button>
        </div>
      )}
      {threads.map(({ id, timestamp, title, content, blocked, created }) => (
        <div
          className='thread'
          key={id}
          onClick={() => {
            if (loggedIn) {
              navigate('./Thread/' + title);
            }
          }}
        >
          <div className='postContent'>{content}</div>
          <div className='postedAt'>{created}</div>
        </div>
      ))}
    </div>
  );
}
