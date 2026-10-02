import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

interface AssertSafeRemoteHttpUrlOptions {
  invalidUrlErrorMessage?: string
  disallowedHostErrorMessage?: string
  dnsLookupErrorMessage?: string
}

function parseIpv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  const octets = parts.map((part) => Number.parseInt(part, 10))
  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return null
  }

  return [octets[0], octets[1], octets[2], octets[3]]
}

function isBlockedIpv4(ip: string): boolean {
  const octets = parseIpv4(ip)
  if (!octets) return false

  const [a, b] = octets

  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true

  return false
}

function expandIpv6(ip: string): number[] | null {
  if (ip.includes('%')) {
    ip = ip.slice(0, ip.indexOf('%'))
  }

  if (ip.includes('.')) {
    const lastColon = ip.lastIndexOf(':')
    if (lastColon < 0) return null
    const ipv4Part = ip.slice(lastColon + 1)
    const ipv4 = parseIpv4(ipv4Part)
    if (!ipv4) return null
    const hi = (ipv4[0] << 8) | ipv4[1]
    const lo = (ipv4[2] << 8) | ipv4[3]
    ip = `${ip.slice(0, lastColon)}:${hi.toString(16)}:${lo.toString(16)}`
  }

  const parts = ip.split('::')
  if (parts.length > 2) return null

  const parseSection = (section: string): number[] =>
    section
      .split(':')
      .filter((entry) => entry.length > 0)
      .map((entry) => Number.parseInt(entry, 16))

  const left = parseSection(parts[0] ?? '')
  const right = parseSection(parts[1] ?? '')

  if (left.some((value) => !Number.isInteger(value) || value < 0 || value > 0xffff)) return null
  if (right.some((value) => !Number.isInteger(value) || value < 0 || value > 0xffff)) return null

  const hasCompression = parts.length === 2
  if (!hasCompression && left.length !== 8) return null
  if (hasCompression && left.length + right.length > 8) return null

  const fillCount = hasCompression ? 8 - left.length - right.length : 0
  return [...left, ...Array.from({ length: fillCount }, () => 0), ...right]
}

function isBlockedIpv6(ip: string): boolean {
  const groups = expandIpv6(ip)
  if (!groups || groups.length !== 8) return false

  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0 &&
    groups[6] === 0 &&
    groups[7] === 1
  ) {
    return true
  }

  const first = groups[0]
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link-local

  // ::ffff:0:0/96 mapped IPv4
  const isMappedV4 =
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff

  if (isMappedV4) {
    const ipv4 = `${(groups[6] >> 8) & 0xff}.${groups[6] & 0xff}.${(groups[7] >> 8) & 0xff}.${groups[7] & 0xff}`
    return isBlockedIpv4(ipv4)
  }

  return false
}

function isBlockedIpAddress(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isBlockedIpv4(ip)
  if (version === 6) return isBlockedIpv6(ip)
  return false
}

export async function assertSafeRemoteHttpUrl(
  inputUrl: string,
  options?: AssertSafeRemoteHttpUrlOptions
): Promise<string> {
  const invalidUrlErrorMessage = options?.invalidUrlErrorMessage ?? 'Invalid URL.'
  const disallowedHostErrorMessage = options?.disallowedHostErrorMessage ?? 'Source URL is not allowed.'
  const dnsLookupErrorMessage = options?.dnsLookupErrorMessage ?? 'Could not fetch source page.'

  let parsed: URL

  try {
    parsed = new URL(inputUrl)
  } catch {
    throw new Error(invalidUrlErrorMessage)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(invalidUrlErrorMessage)
  }

  if (!parsed.hostname) {
    throw new Error(invalidUrlErrorMessage)
  }

  const hostLower = parsed.hostname.toLocaleLowerCase()
  if (hostLower === 'localhost' || hostLower.endsWith('.localhost')) {
    throw new Error(disallowedHostErrorMessage)
  }

  const normalizedHost =
    parsed.hostname.startsWith('[') && parsed.hostname.endsWith(']')
      ? parsed.hostname.slice(1, -1)
      : parsed.hostname

  const hostIpVersion = isIP(normalizedHost)
  if (hostIpVersion > 0) {
    if (isBlockedIpAddress(normalizedHost)) {
      throw new Error(disallowedHostErrorMessage)
    }
    return parsed.toString()
  }

  let resolved
  try {
    resolved = await lookup(normalizedHost, { all: true, verbatim: true })
  } catch {
    throw new Error(dnsLookupErrorMessage)
  }

  if (resolved.length === 0) {
    throw new Error(dnsLookupErrorMessage)
  }

  if (resolved.some((entry) => isBlockedIpAddress(entry.address))) {
    throw new Error(disallowedHostErrorMessage)
  }

  return parsed.toString()
}
