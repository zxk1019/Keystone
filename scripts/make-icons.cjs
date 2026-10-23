// Draws the Mi Estudio icon and saves every size Windows, electron-builder and Android need.
// Run it with Electron (it uses Chromium to render the SVG): npm run icons
const { app, BrowserWindow } = require('electron')
const { existsSync, mkdirSync, writeFileSync } = require('fs')
const { join } = require('path')

const ROOT = join(__dirname, '..')

// The graduation cap from lucide (the same icon as in the sidebar), on a 24-unit grid
const CAP = (
  strokeWidth,
  transform
) => `<g transform="${transform}" fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
    <path d="M22 10v6"/>
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
  </g>`

const GRADIENT = `<defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#818cf8"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>`

// White cap on an indigo tile (a circle for the round Android icon).
// Small sizes get a thicker line so the cap is still readable at 16 px.
function svg(strokeWidth, shape = 'square') {
  const tile =
    shape === 'circle'
      ? '<circle cx="256" cy="256" r="240" fill="url(#tile)"/>'
      : '<rect x="16" y="16" width="480" height="480" rx="112" fill="url(#tile)"/>'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${GRADIENT}
  ${tile}
  ${CAP(strokeWidth, 'translate(76 76) scale(15)')}
</svg>`
}

// Android adaptive icons: the cap alone on 108 units, inside the 66-unit area that is always seen
const FOREGROUND = `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">
  ${CAP(2, 'translate(27 27) scale(2.25)')}
</svg>`

/** Draws an SVG on a canvas at the exact size, so every size is sharp and keeps transparency. */
async function render(window, svgText, size) {
  const data = Buffer.from(svgText).toString('base64')
  const url = await window.webContents.executeJavaScript(`(async () => {
    const image = new Image()
    image.src = 'data:image/svg+xml;base64,${data}'
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = ${size}
    canvas.getContext('2d').drawImage(image, 0, 0, ${size}, ${size})
    return canvas.toDataURL('image/png')
  })()`)
  return Buffer.from(url.split(',')[1], 'base64')
}

/** An .ico file that stores each size as a PNG (supported since Windows Vista). */
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)])
}

/** Launcher icons for each screen density; adaptive ones (Android 8+) use the foreground. */
const ANDROID_DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

async function androidIcons(window) {
  const res = join(ROOT, 'android', 'app', 'src', 'main', 'res')
  if (!existsSync(res)) return
  for (const [density, scale] of Object.entries(ANDROID_DENSITIES)) {
    const folder = join(res, `mipmap-${density}`)
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'ic_launcher.png'), await render(window, svg(2), 48 * scale))
    const round = await render(window, svg(2, 'circle'), 48 * scale)
    writeFileSync(join(folder, 'ic_launcher_round.png'), round)
    const foreground = await render(window, FOREGROUND, 108 * scale)
    writeFileSync(join(folder, 'ic_launcher_foreground.png'), foreground)
  }
  console.log(`android icons written: ${Object.keys(ANDROID_DENSITIES).join(', ')}`)
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false })
  await window.loadURL('about:blank')
  const png = (size) => render(window, svg(size <= 32 ? 2.6 : 2), size)

  const icoImages = []
  for (const size of [16, 24, 32, 48, 64, 128, 256]) icoImages.push({ size, png: await png(size) })
  const icoFile = ico(icoImages)

  mkdirSync(join(ROOT, 'build'), { recursive: true })
  writeFileSync(join(ROOT, 'build', 'icon.svg'), svg(2))
  writeFileSync(join(ROOT, 'build', 'icon.png'), await png(512))
  writeFileSync(join(ROOT, 'build', 'icon.ico'), icoFile)
  writeFileSync(join(ROOT, 'resources', 'icon.png'), await png(256))
  writeFileSync(join(ROOT, 'resources', 'icon.ico'), icoFile)
  console.log(`icons written: ${icoImages.map(({ size }) => size).join(', ')} + 512 px`)
  await androidIcons(window)
  app.quit()
})
