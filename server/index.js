
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const db = require('./database');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const app = express();
const port = 3001;


const corsOptions = {
  origin: 'https://not-paylasim-uygulamasi.vercel.app',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());

// Use memory storage for multer because we are going to upload the file to Supabase directly
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/api/courses', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT name FROM courses ORDER BY name');
    res.json(rows.map(c => c.name));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

app.get('/api/courses/:courseName', async (req, res) => {
  try {
    const { rows: courseRows } = await db.query('SELECT id FROM courses WHERE name = $1', [req.params.courseName]);
    const course = courseRows[0];
    if (!course) {
      return res.status(404).send('Course not found');
    }

    const { rows: fileRows } = await db.query('SELECT filename FROM files WHERE course_id = $1', [course.id]);
    const { rows: linkRows } = await db.query('SELECT url FROM links WHERE course_id = $1', [course.id]);

    // Construct public URLs for files from Supabase Storage
    const safeCourseName = req.params.courseName.replace(/ /g, '-');
    const fileUrls = fileRows.map(f => {
        const publicUrl = supabase.storage.from('notes').getPublicUrl(`${safeCourseName}/${f.filename}`);
        return publicUrl.data.publicUrl;
    });

    res.json({
      files: fileUrls,
      links: linkRows.map(l => l.url)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch course data' });
  }
});

app.post('/api/courses/:courseName/upload', upload.single('file'), async (req, res) => {
  try {
    const { newFileName } = req.body;
    const { courseName } = req.params;
    const { file } = req;

    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    const extension = path.extname(file.originalname);
    let baseName;
    if (newFileName && newFileName.trim() !== '') {
      baseName = path.basename(newFileName.trim(), path.extname(newFileName.trim()));
    } else {
      baseName = path.basename(file.originalname, extension);
    }

    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-]/g, '-').replace(/--+/g, '-');
    const finalUniqueName = `${Date.now()}-${sanitizedBaseName}${extension}`;

    const safeCourseName = courseName.replace(/ /g, '-');
    const filePath = `${safeCourseName}/${finalUniqueName}`;

    // Upload file to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('notes')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get course id
    const { rows: courseRows } = await db.query('SELECT id FROM courses WHERE name = $1', [courseName]);
    const course = courseRows[0];
    if (!course) {
      return res.status(404).send('Course not found');
    }

    // Save file metadata to our database
    const fileNameOnly = path.basename(filePath);
    await db.query('INSERT INTO files (course_id, filename) VALUES ($1, $2)', [course.id, fileNameOnly]);
    
    const publicUrl = supabase.storage.from('notes').getPublicUrl(filePath);

    res.status(200).send({ message: 'File uploaded successfully', publicUrl: publicUrl.data.publicUrl });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.post('/api/courses/:courseName/links', async (req, res) => {
  try {
    const { link } = req.body;
    const { courseName } = req.params;

    const { rows: courseRows } = await db.query('SELECT id FROM courses WHERE name = $1', [courseName]);
    const course = courseRows[0];
    if (!course) {
      return res.status(404).send('Course not found');
    }

    await db.query('INSERT INTO links (course_id, url) VALUES ($1, $2)', [course.id, link]);
    res.status(200).send({ message: 'Link added successfully', link });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add link' });
  }
});



app.delete('/api/courses/:courseName/links', async (req, res) => {
  try {
    const { courseName } = req.params;
    const { link } = req.body;

    // Find the course ID
    const { rows: courseRows } = await db.query('SELECT id FROM courses WHERE name = $1', [courseName]);
    const course = courseRows[0];

    if (course) {
      // Delete the link from the database
      await db.query('DELETE FROM links WHERE course_id = $1 AND url = $2', [course.id, link]);
    }

    res.status(200).send({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

app.delete('/api/courses/:courseName/files/:fileName', async (req, res) => {
  try {
    const { courseName, fileName } = req.params;

    // Sanitize course name to build the correct storage path
    const safeCourseName = courseName.replace(/ /g, '-');
    const filePath = `${safeCourseName}/${fileName}`;

    // 1. Delete file from Supabase Storage
    const { error: removeError } = await supabase.storage.from('notes').remove([filePath]);
    if (removeError) {
      // Log the error but don't fail if the file is already gone or path is wrong
      console.error('Supabase storage remove error:', removeError.message);
    }

    // 2. Delete file metadata from the database
    const { rows: courseRows } = await db.query('SELECT id FROM courses WHERE name = $1', [courseName]);
    const course = courseRows[0];
    if (course) {
      await db.query('DELETE FROM files WHERE course_id = $1 AND filename = $2', [course.id, fileName]);
    }

    res.status(200).send({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});