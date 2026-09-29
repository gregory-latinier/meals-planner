import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)

const PORT = parseInt(process.env.PORT || '3001', 10)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
  pingTimeout: 20000,
  pingInterval: 10000,
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', connections: io.engine.clientsCount })
})

// Track connected clients
let connectedClients = 0

io.on('connection', (socket) => {
  connectedClients++
  console.log(`[realtime] Client connected: ${socket.id} (total: ${connectedClients})`)

  // Broadcast presence update to all other clients
  socket.broadcast.emit('household:update', {
    type: 'presence',
    payload: { event: 'joined', socketId: socket.id, total: connectedClients },
  })

  // Handle household state sync events
  socket.on('household:update', (data: { type: string; payload: unknown }) => {
    // Broadcast to all other clients in the household
    socket.broadcast.emit('household:update', data)
  })

  // Handle ping
  socket.on('ping', () => {
    socket.emit('ping')
  })

  socket.on('disconnect', (reason) => {
    connectedClients = Math.max(0, connectedClients - 1)
    console.log(`[realtime] Client disconnected: ${socket.id} — ${reason} (total: ${connectedClients})`)
    socket.broadcast.emit('household:update', {
      type: 'presence',
      payload: { event: 'left', socketId: socket.id, total: connectedClients },
    })
  })

  socket.on('error', (err) => {
    console.error(`[realtime] Socket error: ${socket.id}`, err)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[realtime] Socket.IO server running on port ${PORT}`)
  console.log(`[realtime] Accepting connections from: ${CLIENT_URL}`)
})

export { io, httpServer }
