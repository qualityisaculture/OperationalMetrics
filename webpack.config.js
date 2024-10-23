const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
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
    server: './src/client/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist/'),
    publicPath: '/dist/',
    filename: 'index.bundle.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};