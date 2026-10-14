import fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { Server as SocketIOServer } from 'socket.io'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

import { authRoutes } from './routes/auth'
import { cookbookRoutes } from './routes/cookbooks'
import { storeRoutes } from './routes/stores'
import { taxonomyRoutes } from './routes/taxonomy'
import { recipeRoutes } from './routes/recipes'
import { imageRoutes } from './routes/images'
import { settingsRoutes } from './routes/settings'
import { mealPlanRoutes } from './routes/meal-plans'

dotenv.config()

const PORT = parseInt(process.env.PORT || '3001', 10)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export function buildServer() {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'production',
  })

  // CORS
  app.register(cors, {
    origin: (origin, cb) => {
      // allow localhost, custom client url or requests with no origin (e.g. mobile/postman)
      if (!origin || origin === CLIENT_URL || origin.includes('localhost')) {
        cb(null, true)
        return
      }
      cb(null, true) // relaxed for internal / reverse-proxy
    },
    credentials: true,
  })

  // Cookie
  app.register(cookie)

  // Rate Limiting
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Multipart
  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })

  // Static files for uploaded images
  app.register(fastifyStatic, {
    root: UPLOAD_DIR,
    prefix: '/uploads/',
  })

  // Static files for client (if built)
  const clientDist = path.join(__dirname, '../../client/dist')
  if (fs.existsSync(clientDist)) {
    app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
      decorateReply: false,
    })
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
        reply.status(404).send({ error: 'Not found' })
      } else {
        reply.sendFile('index.html', clientDist)
      }
    })
  }

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date() }
  })

  // Socket.IO integration
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // API Routes
  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(cookbookRoutes, { prefix: '/api/cookbooks' })
  app.register(storeRoutes, { prefix: '/api/stores' })
  app.register(taxonomyRoutes, { prefix: '/api' })
  app.register(recipeRoutes, { prefix: '/api/recipes' })
  app.register(imageRoutes, { prefix: '/api' })
  app.register(settingsRoutes, { prefix: '/api/settings' })
  app.register(mealPlanRoutes, { prefix: '/api/meal-plans', io })

  let connectedClients = 0

  io.on('connection', (socket) => {
    connectedClients++
    app.log.info(`[realtime] Client connected: ${socket.id} (total: ${connectedClients})`)

    socket.broadcast.emit('household:update', {
      type: 'presence',
      payload: { event: 'joined', socketId: socket.id, total: connectedClients },
    })

    socket.on('household:update', (data: { type: string; payload: unknown }) => {
      socket.broadcast.emit('household:update', data)
    })

    socket.on('ping', () => {
      socket.emit('ping')
    })

    socket.on('disconnect', (reason) => {
      connectedClients = Math.max(0, connectedClients - 1)
      app.log.info(`[realtime] Client disconnected: ${socket.id} — ${reason}`)
      socket.broadcast.emit('household:update', {
        type: 'presence',
        payload: { event: 'left', socketId: socket.id, total: connectedClients },
      })
    })
  })

  return { app, io }
}

async function start() {
  const { app } = buildServer()
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`[server] Fastify & Socket.IO server running on port ${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

if (require.main === module) {
  start()
}
