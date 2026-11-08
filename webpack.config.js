const path = require('path');
const merge = require('webpack-merge');
const webpack = require('webpack');
const common = require('./webpack.common');

module.exports = env => {
  return merge(common(env), {
    mode: 'development',
    plugins: [
      new webpack.DefinePlugin({
        'process.env.MODE': JSON.stringify('development')
      })
    ],
    devServer: {
      open: true,
      contentBase: path.join(__dirname, 'assets'),
      proxy: [
        {
          context: ['/process', '/assign_explanation', '/sessions', '/admin/login', '/admin/sessions'],
          target: 'http://127.0.0.1:5000'
        }
      ]
    }
  });
};
