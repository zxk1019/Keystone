import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// Unit tests for the logic that does not need Electron or a browser (validation, dates, layout)
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src')
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
})
