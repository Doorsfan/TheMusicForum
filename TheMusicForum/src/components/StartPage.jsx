import { useState, useEffect } from 'react';

// a subclass to FetchHelper
import Thread from '../utilities/Thread';
import LoginPage from './LoginPage';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

// a "lazy"/automatically created subclass to FetchHelper
import { factory } from '../utilities/FetchHelper';

const { Book, Author } = factory;

export default function StartPage() {
  const [threads, setThreads] = useState([]);

  // Run this when our component mounts (we can see it on screen)
  useEffect(() => {
    (async () => {
      // the lazily instantiated classes works too

      // create a new author
      /* let mickey = new Thread({
        title: 'hello',
        created: Date.now(),
        locked: 0,
        postedBy: 'guy',
      });
      await mickey.save(); */

      // Fetch all persons from backend
      setThreads(await Thread.find());

      // We can delete Mickey Mouse that was just created
      /* await mickey.delete(); */
    })();
  }, []);

  return (
    <div className='body'>
      <div className='header'>
        <div className='SpaceBlock' />
        <div className='homeText'></div>
        <div className='SpaceBlock' />
        <div className='ForumText'>The Music Forum</div>
        <div className='SpaceBlock' />
        {sessionStorage.getItem('currentUser') == undefined && (
          <div className='loginText'>
            <Link className='loginLink' to='/Login'>
              Login
            </Link>
          </div>
        )}
        {sessionStorage.getItem('currentUser') != undefined && (
          <div className='profileText'>
            <Link className='profileLink' to='/Profile'>
              My Profile
            </Link>
          </div>
        )}
      </div>
      <main>
        {threads.map(({ id, groupId, title, created, locked, postedBy }) => (
          <div className='thread' key={id} onClick={() => alert(title)}>
            <h3 className='topicTitle'>{title}</h3>
            <div className='SpaceBlock' />
            <div className='createdAndPostedDiv'>
              <div className='createdDiv'>
                <p>
                  Created:{' '}
                  {new Date(created)
                    .toLocaleDateString()
                    .replace(',', '')
                    .substring(0, 8) +
                    ' - ' +
                    new Date(created).toLocaleTimeString().substring(0, 8)}
                </p>
              </div>
              <div className='postedDiv'>
                <p>Posted by: {postedBy}</p>
              </div>
            </div>
            <div className='SpaceBlock' />
          </div>
        ))}
      </main>
    </div>
  );
}
