import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import CoursePage from './CoursePage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses/:courseName" element={<CoursePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
