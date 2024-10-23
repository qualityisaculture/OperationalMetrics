import express from 'express';
import webpack from 'webpack';
const webpackDevMiddleware = require('webpack-dev-middleware');
const config = require('../../webpack.config');
const compiler = webpack(config);

const Server = require('./server');
const mode = process.argv[2] || 'dev';

const app = express();
app.use(
  webpackDevMiddleware(compiler, {
    publicPath: '/',
  })
);
Server(mode, app);
app.listen(8080, '127.0.0.1', () => {
  console.log('Starting in dev mode...');
});