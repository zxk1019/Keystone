// Draws the Keystone icon and saves every size Windows, electron-builder and Android need.
// Run it with Electron (it uses Chromium to render the SVG): npm run icons
const { app, BrowserWindow } = require('electron')
const { existsSync, mkdirSync, writeFileSync } = require('fs')
const { join } = require('path')

const ROOT = join(__dirname, '..')

// A keystone (the wedge at the top of an arch) with a K cut out of it, on a 24-unit grid. One
// path with an even-odd fill, so the K is a hole everywhere: on the tile, in the sidebar
// (components/KeystoneLogo.tsx draws the same path) and in the Android notification icon.
const KEYSTONE =
  'M4.8 5.07Q4.5 3.5 6.1 3.5L17.9 3.5Q19.5 3.5 19.2 5.07L16.6 18.93Q16.3 20.5 14.7 20.5L9.3 20.5Q7.7 20.5 7.4 18.93Z' +
  'M8.75 6.5H10.75V9.58L13.9 6.43L15.31 7.86L11.17 12L15.31 16.14L13.9 17.57L10.75 14.42V17.5H8.75Z'

/** The stone in white, `size` units wide, starting at (offset, offset). */
const STONE = (size, offset) =>
  `<path transform="translate(${offset} ${offset}) scale(${size / 24})" fill="#ffffff" fill-rule="evenodd" d="${KEYSTONE}"/>`

const GRADIENT = `<defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#818cf8"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>`

// White stone on an indigo tile (a circle for the round Android icon).
// Small sizes get a bigger stone so the K is still readable at 16 px.
function svg(small, shape = 'square') {
  const tile =
    shape === 'circle'
      ? '<circle cx="256" cy="256" r="240" fill="url(#tile)"/>'
      : '<rect x="16" y="16" width="480" height="480" rx="112" fill="url(#tile)"/>'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${GRADIENT}
  ${tile}
  ${small ? STONE(424, 44) : STONE(360, 76)}
</svg>`
}

// Android adaptive icons: the stone alone on 108 units, inside the 66-unit area always seen
const FOREGROUND = `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">
  ${STONE(54, 27)}
</svg>`

// Small icon of the Android notifications: Android draws it white on the status bar. The file
// keeps its old name because the notifications already scheduled on the phone point to it.
const NOTIFICATION_ICON = `<?xml version="1.0" encoding="utf-8"?>
<!-- Made by scripts/make-icons.cjs: the Keystone stone for the notifications -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:fillType="evenOdd"
        android:pathData="${KEYSTONE}" />
</vector>
`

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
    writeFileSync(join(folder, 'ic_launcher.png'), await render(window, svg(false), 48 * scale))
    const round = await render(window, svg(false, 'circle'), 48 * scale)
    writeFileSync(join(folder, 'ic_launcher_round.png'), round)
    const foreground = await render(window, FOREGROUND, 108 * scale)
    writeFileSync(join(folder, 'ic_launcher_foreground.png'), foreground)
  }
  writeFileSync(join(res, 'drawable', 'ic_stat_mi_estudio.xml'), NOTIFICATION_ICON)
  console.log(`android icons written: ${Object.keys(ANDROID_DENSITIES).join(', ')}`)
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false })
  await window.loadURL('about:blank')
  const png = (size) => render(window, svg(size <= 32), size)

  const icoImages = []
  for (const size of [16, 24, 32, 48, 64, 128, 256]) icoImages.push({ size, png: await png(size) })
  const icoFile = ico(icoImages)

  mkdirSync(join(ROOT, 'build'), { recursive: true })
  writeFileSync(join(ROOT, 'build', 'icon.svg'), svg(false))
  writeFileSync(join(ROOT, 'build', 'icon.png'), await png(512))
  writeFileSync(join(ROOT, 'build', 'icon.ico'), icoFile)
  writeFileSync(join(ROOT, 'resources', 'icon.png'), await png(256))
  writeFileSync(join(ROOT, 'resources', 'icon.ico'), icoFile)
  console.log(`icons written: ${icoImages.map(({ size }) => size).join(', ')} + 512 px`)
  await androidIcons(window)
  app.quit()
})
