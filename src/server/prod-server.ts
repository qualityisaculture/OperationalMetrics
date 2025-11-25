import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { metricsRoute } from './routes/metricsRoute';

// Get the project root directory (where package.json is)
const projectRoot = process.cwd();
const distPath = path.join(projectRoot, 'dist');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist directory
app.use(express.static(distPath));

// API routes
app.use('/api', metricsRoute);

// Serve favicon
app.get('/favicon.svg', (req, res) => {
  console.log('Favicon Request received ' + req.url);
  res.sendFile(path.join(distPath, 'favicon.svg'));
});

// Serve index.html for all other routes (SPA routing)
app.get('*', (req, res) => {
  console.log('Request received ' + req.url);
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

