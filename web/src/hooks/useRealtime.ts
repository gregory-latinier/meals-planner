'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3001'

export function useRealtime() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  useEffect(() => {
    const socket = io(REALTIME_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('household:update', (data: { type: string; payload: unknown }) => {
      setLastEvent(`${data.type} @ ${new Date().toLocaleTimeString()}`)
    })

    socket.on('ping', () => {
      setLastEvent(`ping @ ${new Date().toLocaleTimeString()}`)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  function emit(event: string, payload?: unknown) {
    socketRef.current?.emit(event, payload)
  }

  return { connected, lastEvent, emit }
}
