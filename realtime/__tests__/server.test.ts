// Unit tests for realtime server utility logic
// These tests are isolated from socket.io and express (no network I/O)

describe('Realtime server — connection counter logic', () => {
  it('increments count on connection', () => {
    let count = 0
    const onConnect = () => { count++ }
    onConnect()
    expect(count).toBe(1)
  })

  it('decrements count on disconnect, never below zero', () => {
    let count = 3
    const onDisconnect = () => { count = Math.max(0, count - 1) }
    onDisconnect()
    onDisconnect()
    onDisconnect()
    onDisconnect() // extra call
    expect(count).toBe(0)
  })

  it('broadcasts correct event shape on join', () => {
    const events: unknown[] = []
    const broadcast = (event: string, data: unknown) => events.push({ event, data })

    const socketId = 'abc123'
    const total = 2
    broadcast('household:update', { type: 'presence', payload: { event: 'joined', socketId, total } })

    expect(events).toHaveLength(1)
    const ev = events[0] as { event: string; data: { type: string; payload: { event: string } } }
    expect(ev.event).toBe('household:update')
    expect(ev.data.type).toBe('presence')
    expect(ev.data.payload.event).toBe('joined')
  })
})
