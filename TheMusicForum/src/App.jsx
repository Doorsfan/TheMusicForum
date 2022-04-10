import { useState, useEffect } from 'react';

// a subclass to FetchHelper
import Thread from './utilities/Thread';

// a "lazy"/automatically created subclass to FetchHelper
import { factory } from './utilities/FetchHelper';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import StartPage from './components/StartPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

const { Book, Author } = factory;

export default function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route exact path='/' element={<StartPage />} />
          <Route exact path='/Login' element={<LoginPage />} />
          <Route exact path='/Register' element={<RegisterPage />} />
        </Routes>
      </Router>
    </>
  );
}
