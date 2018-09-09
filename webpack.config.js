const path = require('path')
const slsw = require('serverless-webpack')
const webpackNodeExternalsPlugin = require('webpack-node-externals')

const absPath = (dir) => path.resolve(process.cwd(), dir)

module.exports = {
  context: absPath('.'),
  entry: slsw.lib.entries,
  output: {
    libraryTarget: 'commonjs2',
    path: absPath('build'),
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }, {
      test: /\.json$/,
      loader: 'json-loader'
    }]
  },
  externals: [webpackNodeExternalsPlugin()],
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production'
}
