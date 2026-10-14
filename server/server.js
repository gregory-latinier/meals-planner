// Phusion Passenger / cPanel Node.js startup wrapper for server
const path = require('path')
process.env.NODE_ENV = 'production'
process.chdir(__dirname)

require('./dist/index.js')
