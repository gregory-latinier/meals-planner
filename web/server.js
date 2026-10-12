const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const app = next({ dev, dir: __dirname })
const handle = app.getRequestHandler()

const rawPort = process.env.PORT || '3000'
const isSocket = typeof rawPort === 'string' && (rawPort.includes('/') || rawPort.includes('\\'))
const port = isSocket ? rawPort : parseInt(rawPort, 10) || 3000

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  if (isSocket) {
    server.listen(port, () => {
      console.log(`> Next.js Phusion Passenger ready on socket ${port}`)
    })
  } else {
    server.listen(port, '0.0.0.0', () => {
      console.log(`> Next.js Phusion Passenger ready on http://0.0.0.0:${port}`)
    })
  }
}).catch((err) => {
  console.error('> Error starting Next.js server:', err)
  process.exit(1)
})
