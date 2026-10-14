// Phusion Passenger / cPanel Node.js startup wrapper for server
process.env.NODE_ENV = 'production'
process.chdir(__dirname)

// dist/index.js only auto-starts when run directly (`node dist/index.js`),
// so when loaded from here we have to start it explicitly.
require('./dist/index.js').start()
