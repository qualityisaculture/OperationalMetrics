//Create a default express server and listen on port 3000
import express from 'express';
import path from 'path';

let app;

const Server = (mode: 'default' | 'dev' | 'e2e', application?: Express.Application) => {
  app = application || express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '.')));
  app.get('*', (req, res) => {
    console.log('Request received', path.join(__dirname, '../../dist/index.html'));
    res.sendFile(path.join(__dirname, '../../dist/index.html'))
  }
  );

  return app;
};
module.exports = Server;
