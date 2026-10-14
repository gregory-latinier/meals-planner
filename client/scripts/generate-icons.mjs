// Generates the PWA PNG icons from public/favicon.svg.
// One-off script (outputs are committed). Reuses `sharp` from the server workspace:
//   node client/scripts/generate-icons.mjs
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(here, '..', 'public')
const sharp = createRequire(path.join(here, '..', '..', 'server', 'package.json'))('sharp')

const source = readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8')

// Full-bleed variant: no rounded corners (Android/iOS apply their own mask).
// Content is scaled down so it stays inside the 80% maskable safe zone.
const fullBleed = (scale) =>
  source
    .replace(/<rect width="512" height="512" rx="112"/, '<rect width="512" height="512"')
    .replace('<g>', `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">`)

const png = (svg, size, file) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(path.join(publicDir, file))

await png(source, 192, 'pwa-192x192.png')
await png(source, 512, 'pwa-512x512.png')
await png(fullBleed(0.82), 512, 'pwa-maskable-512x512.png')
await png(fullBleed(0.9), 180, 'apple-touch-icon.png')

// favicon.ico: a PNG-compressed single-image ICO (supported by all current browsers)
const ico32 = await sharp(Buffer.from(source), { density: 384 }).resize(32, 32).png().toBuffer()
const header = Buffer.alloc(22)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(1, 4) // image count
header.writeUInt8(32, 6) // width
header.writeUInt8(32, 7) // height
header.writeUInt16LE(1, 10) // color planes
header.writeUInt16LE(32, 12) // bits per pixel
header.writeUInt32LE(ico32.length, 14) // image size in bytes
header.writeUInt32LE(22, 18) // image offset
writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, ico32]))

console.log('Icons generated in', publicDir)
