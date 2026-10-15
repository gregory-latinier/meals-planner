import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useRealtime(onHouseholdUpdate?: (data: { type: string; payload: unknown }) => void) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const onUpdateRef = useRef(onHouseholdUpdate)

  useEffect(() => {
    onUpdateRef.current = onHouseholdUpdate
  }, [onHouseholdUpdate])

  useEffect(() => {
    // In Vite dev and production, socket connects to window.location.origin (proxied or served together)
    const socket = io({
      withCredentials: true,
      transports: ['websocket', 'polling'],
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
      if (onUpdateRef.current) {
        onUpdateRef.current(data)
      }
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
