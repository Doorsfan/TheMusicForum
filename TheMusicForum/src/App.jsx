import { useState, useEffect } from 'react';

// a subclass to FetchHelper
import Thread from './utilities/Thread';

// a "lazy"/automatically created subclass to FetchHelper
import { factory } from './utilities/FetchHelper';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import StartPage from './components/StartPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ProfilePage from './components/ProfilePage';
import CreateNewGroupPage from './components/createNewGroupPage';
import GroupPage from './components/GroupPage';
import CreateNewThreadPage from './components/createNewThreadPage';
import ThreadPage from './components/ThreadPage';
import GroupListingPage from './components/GroupListingPage';

const { Book, Author } = factory;

export default function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route exact path='/' element={<StartPage />} />
          <Route exact path='/Login' element={<LoginPage />} />
          <Route exact path='/Register' element={<RegisterPage />} />
          <Route exact path='/Profile/:profileName' element={<ProfilePage />} />
          <Route exact path='/Threads/:groupName' element={<GroupPage />} />
          <Route
            exact
            path='/createNewGroup'
            element={<CreateNewGroupPage />}
          />
          <Route
            exact
            path='/CreateNewThread/:groupName'
            element={<CreateNewThreadPage />}
          />
          <Route
            exact
            path='/postsForThread/:threadName'
            element={<ThreadPage />}
          />
          <Route
            exact
            path='/memberListing/:groupName'
            element={<GroupListingPage />}
          />
        </Routes>
      </Router>
    </>
  );
}
