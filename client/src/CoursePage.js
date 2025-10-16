import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

function CoursePage() {
  const { courseName } = useParams();
  const [courseData, setCourseData] = useState({ files: [], links: [] });
  const [newLink, setNewLink] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [newFileName, setNewFileName] = useState('');

  const fetchCourseData = useCallback(() => {
    fetch(`https://not-paylasim-uygulamasi.onrender.com/api/courses/${courseName}`)
      .then(response => response.json())
      .then(data => setCourseData(data))
      .catch(error => console.error('Error fetching course data:', error));
  }, [courseName]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    fetch(`https://not-paylasim-uygulamasi.onrender.com/api/courses/${courseName}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: newLink }),
    })
    .then(response => response.json())
    .then(() => {
      setNewLink('');
      fetchCourseData();
      setMessage('Link başarıyla eklendi!');
      setTimeout(() => setMessage(''), 3000);
    });
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (newFileName) {
      formData.append('newFileName', newFileName);
    }

    fetch(`https://not-paylasim-uygulamasi.onrender.com/api/courses/${courseName}/upload`, {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json())
    .then(() => {
      setSelectedFile(null);
      setNewFileName('');
      document.getElementById('fileInput').value = null;
      fetchCourseData();
      setMessage('Dosya başarıyla yüklendi!');
      setTimeout(() => setMessage(''), 3000);
    });
  };

  const handleDeleteFile = (fileUrl) => {
    const fileName = decodeURIComponent(fileUrl.split('/').pop());
    const confirmDelete = window.confirm(`'${fileName}' dosyasını silmek istediğinizden emin misiniz?`);

    if (confirmDelete) {
      fetch(`https://not-paylasim-uygulamasi.onrender.com/api/courses/${courseName}/files/${fileName}`, {
        method: 'DELETE',
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('File deletion failed');
        }
        return response.json();
      })
      .then(() => {
        fetchCourseData();
        setMessage('Dosya başarıyla silindi!');
        setTimeout(() => setMessage(''), 3000);
      })
      .catch(error => {
        console.error('Error deleting file:', error);
        setMessage('Dosya silinirken bir hata oluştu.');
        setTimeout(() => setMessage(''), 3000);
      });
    }
  };

  const handleDeleteLink = (linkUrl) => {
    const confirmDelete = window.confirm(`'${linkUrl}' linkini silmek istediğinizden emin misiniz?`);

    if (confirmDelete) {
      fetch(`https://not-paylasim-uygulamasi.onrender.com/api/courses/${courseName}/links`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: linkUrl }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Link deletion failed');
        }
        return response.json();
      })
      .then(() => {
        fetchCourseData();
        setMessage('Link başarıyla silindi!');
        setTimeout(() => setMessage(''), 3000);
      })
      .catch(error => {
        console.error('Error deleting link:', error);
        setMessage('Link silinirken bir hata oluştu.');
        setTimeout(() => setMessage(''), 3000);
      });
    }
  };

  return (
    <div className="container mt-5">
      <Link to="/" className="btn btn-secondary mb-4">Ana Sayfaya Dön</Link>
      <h1>{decodeURIComponent(courseName)}</h1>
      <hr />

      {message && <div className="alert alert-success">{message}</div>}

      <div className="row">
        <div className="col-md-6">
          <h3><i className="bi bi-folder-fill"></i> Ders Notları</h3>
          <ul className="list-group">
            {courseData.files.map((file, index) => {
              const fullFileName = decodeURIComponent(file.split('/').pop());
              const cleanFileName = fullFileName.substring(fullFileName.indexOf('-') + 1);
              return (
                <li className="list-group-item d-flex justify-content-between align-items-center" key={index}>
                  <a href={file} target="_blank" rel="noopener noreferrer">{cleanFileName}</a>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFile(file)}>Sil</button>
                </li>
              );
            })}
            {courseData.files.length === 0 && <li className="list-group-item">Henüz dosya yüklenmemiş.</li>}
          </ul>
        </div>
        <div className="col-md-6">
          <h3><i className="bi bi-youtube"></i> YouTube Oynatma Listeleri</h3>
          <ul className="list-group">
            {courseData.links.map((link, index) => (
              <li className="list-group-item d-flex justify-content-between align-items-center" key={index}>
                <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLink(link)}>Sil</button>
              </li>
            ))}
             {courseData.links.length === 0 && <li className="list-group-item">Henüz link eklenmemiş.</li>}
          </ul>
        </div>
      </div>

      <hr />

      <div className="row mt-4">
        <div className="col-md-6">
          <h4>Yeni Dosya Yükle</h4>
          <div className="input-group">
            <input type="file" className="form-control" id="fileInput" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg,.gif" />
          </div>
          <div className="input-group mt-2">
            <input type="text" className="form-control" placeholder="Yeni dosya adı (isteğe bağlı)" value={newFileName} onChange={(e) => setNewFileName(e.target.value)} />
            <button className="btn btn-primary" onClick={handleFileUpload} disabled={!selectedFile}>Yükle</button>
          </div>
        </div>
        <div className="col-md-6">
          <h4>Yeni Link Ekle</h4>
          <form onSubmit={handleLinkSubmit}>
            <div className="input-group">
              <input type="url" className="form-control" value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="https://youtube.com/playlist?list=..." required />
              <button className="btn btn-primary" type="submit">Ekle</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CoursePage;
