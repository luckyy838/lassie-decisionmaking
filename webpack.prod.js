const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const merge = require('webpack-merge');
const webpack = require('webpack');
const common = require('./webpack.common');

module.exports = env => {
  const buildMain = !env || env.app !== 'admin';
  const plugins = [
    new CleanWebpackPlugin({
      // Main writes to dist/. Keep dist/admin so the two builds can run in either order.
      cleanOnceBeforeBuildPatterns: buildMain ? ['**/*', '!admin/**', '!admin'] : ['**/*'],
    }),
    new webpack.DefinePlugin({
      'process.env.MODE': JSON.stringify('production')
    })
  ];
  if (buildMain) {
    plugins.push(new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'assets/spirit.mp4'),
          to: 'spirit.mp4'
        }
      ]
    }));
  }
  return merge(common(env), {
    mode: 'production',
    plugins
  });
}
