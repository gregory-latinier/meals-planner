try {
  require('./dist/index.js')
} catch (err) {
  console.error('> Error starting Realtime Socket.IO server:', err)
  process.exit(1)
}
