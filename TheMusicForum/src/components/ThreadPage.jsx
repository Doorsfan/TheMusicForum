import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom';

export default function ThreadPage() {
  const [posts, setPosts] = useState([]);
  const [creatingNewResponse, setCreatingNewResponse] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [allowPosting, setAllowPosting] = useState(true);

  function postThreadResponse(responseContent) {
    let myResponse = {
      content: responseContent,
      blocked: 0,
    };

    fetch('/api/createNewPost/' + window.location.pathname.split('/')[2], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(myResponse),
    }).then(async (data) => {
      let myPosts = await data.json();
      setPosts(myPosts);
    });
  }

  function createNewPost() {
    setCreatingNewResponse(true);
  }

  useEffect(() => {
    (async () => {
      fetch(
        `/api/canIPostInThisThread/${window.location.pathname.split('/')[2]}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      ).then(async (data) => {
        let result = await data.json();
        setAllowPosting(result);
      });

      fetch(`/api/getPostsForGroup/` + window.location.pathname.split('/')[2], {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (data) => {
        let foundThreads = await data.json();
        setPosts(foundThreads);
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
      {allowPosting && (
        <button className='createNewPostButton' onClick={createNewPost}>
          Create New Post
        </button>
      )}
      {!allowPosting && (
        <div className='blockedDiv'>You are blocked from this group.</div>
      )}
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
              postThreadResponse(responseContent);
            }}
            className='postResponseButton'
          >
            Post Response
          </button>
        </div>
      )}
      {posts.length > 0 &&
        posts.map(({ id, postedById, content, blocked, created }) => (
          <div className='post' key={id}>
            <div className='postContent'>{content}</div>
            <div className='postedAt'>{created}</div>
          </div>
        ))}
    </div>
  );
}
