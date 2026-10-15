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
import { shoppingListRoutes } from './routes/shopping-lists'
import { SESSION_COOKIE, getHouseholdIdForToken, householdRoom, readCookieFromHeader } from './lib/auth'

dotenv.config()

const PORT = parseInt(process.env.PORT || '3001', 10)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export function buildServer() {
  const app = fastify({
    // In production, log errors (incl. every 500 with its stack) to stderr so Passenger captures them.
    logger:
      process.env.NODE_ENV !== 'production'
        ? true
        : { level: process.env.LOG_LEVEL || 'error', stream: process.stderr },
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
  app.register(shoppingListRoutes, { prefix: '/api/shopping-lists', io })

  // Connected clients per household (rooms isolate households from each other).
  const connectedByHousehold = new Map<string, number>()

  // Authenticate every socket with the session cookie and attach it to its household room.
  io.use(async (socket, next) => {
    try {
      const token = readCookieFromHeader(socket.handshake.headers.cookie, SESSION_COOKIE)
      const householdId = await getHouseholdIdForToken(token)
      if (!householdId) {
        next(new Error('Unauthorized'))
        return
      }
      socket.data.householdId = householdId
      next()
    } catch (err) {
      next(err instanceof Error ? err : new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const householdId = socket.data.householdId as string
    const room = householdRoom(householdId)
    const total = (connectedByHousehold.get(householdId) ?? 0) + 1
    connectedByHousehold.set(householdId, total)
    socket.join(room)
    app.log.info(`[realtime] Client connected: ${socket.id} (household total: ${total})`)

    socket.to(room).emit('household:update', {
      type: 'presence',
      payload: { event: 'joined', socketId: socket.id, total },
    })

    socket.on('household:update', (data: { type: string; payload: unknown }) => {
      socket.to(room).emit('household:update', data)
    })

    socket.on('ping', () => {
      socket.emit('ping')
    })

    socket.on('disconnect', (reason) => {
      const remaining = Math.max(0, (connectedByHousehold.get(householdId) ?? 1) - 1)
      if (remaining === 0) connectedByHousehold.delete(householdId)
      else connectedByHousehold.set(householdId, remaining)
      app.log.info(`[realtime] Client disconnected: ${socket.id} — ${reason}`)
      socket.to(room).emit('household:update', {
        type: 'presence',
        payload: { event: 'left', socketId: socket.id, total: remaining },
      })
    })
  })

  return { app, io }
}

export async function start() {
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
