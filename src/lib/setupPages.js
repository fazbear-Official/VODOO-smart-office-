import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageDir = (name) =>
  path.join(__dirname, '..', '..', 'public', 'html', `${name}.html`);

function setupPages(app) {
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  app.use(
    '/assets',
    express.static(path.join(__dirname, '..', '..', 'assets'))
  );

  app.get('/', (req, res) => res.sendFile(pageDir('index')));
  app.get('/login', (req, res) => res.sendFile(pageDir('auth')));
  app.get('/home', (req, res) => res.sendFile(pageDir('dashboard')));
  app.get('/console', (req, res) => res.sendFile(pageDir('console')));
}

export default setupPages;
