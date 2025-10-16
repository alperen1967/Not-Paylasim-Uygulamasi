import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetch('https://not-paylasim-uygulamasi.onrender.com/api/courses')
      .then(response => response.json())
      .then(data => setCourses(data))
      .catch(error => console.error('Error fetching courses:', error));
  }, []);

  return (
    <div className="container mt-5">
      <div className="text-center mb-4">
        <h1>Ders Notu Paylaşım Platformu</h1>
        
      </div>
      <div className="row">
        {courses.map(course => (
          <div className="col-md-4 mb-4" key={course}>
            <div className="card h-100 shadow-sm">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{course}</h5>
                <p className="card-text">Notları ve linkleri görmek için tıkla.</p>
                <Link to={`/courses/${encodeURIComponent(course)}`} className="btn btn-primary mt-auto">Dersi Aç</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;
