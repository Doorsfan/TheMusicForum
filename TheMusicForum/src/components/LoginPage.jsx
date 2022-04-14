import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom';

export default function LoginPage() {
  const [username, setUserName] = useState();
  const [password, setPassword] = useState();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = await loginUser({
      username,
      password,
    });
  };

  async function loginUser(credentials) {
    return fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }).then(async (data) => {
      let myUser = await data.json();
      if (myUser._error) {
        alert('Incorrect credentials.');
      } else if (myUser.needToUpdate) {
        delete myUser.needToUpdate;

        //GETs to DB instead of Session Storage
        // UseEffect to check if a User is logged in
        window.location.pathname = `/updateUserInfo/${myUser.id}`;
      } else {
        window.location.pathname = '/';
      }
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
      <div>
        <form onSubmit={handleSubmit} className='loginForm'>
          <label>
            <p>Username</p>
            <input type='text' onChange={(e) => setUserName(e.target.value)} />
          </label>
          <label>
            <p>Password</p>
            <input
              type='password'
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className='registerDiv'>
            <button className='submitButton' type='submit'>
              Login
            </button>
          </div>
          <div className='registerLinkDiv'>
            <Link className='registerLink' to='/Register'>
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
