const path = require('path');
const webpack = require('webpack');

// Client configuration (for browser)
const clientConfig = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'web',
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
    ],
  },
  entry: './src/client/index.js',
  output: {
    path: path.resolve(__dirname, 'dist/'),
    publicPath: '/dist/',
    filename: 'index.bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};

// Server configuration (for Node.js)
const serverConfig = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
    ],
  },
  entry: {
    server: './src/server/prod-server.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'server.bundle.js',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  externals: [
    // Externalize all node_modules (they're already installed)
    function ({ request }, callback) {
      // If it's not a relative path (doesn't start with . or /), it's a node module
      if (!request.startsWith('.') && !request.startsWith('/')) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ],
};

// Export both configurations
module.exports = [clientConfig, serverConfig];