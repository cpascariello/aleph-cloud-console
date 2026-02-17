import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const consoleSrc = resolve(import.meta.dirname, 'src')
const sdkSrc = resolve(import.meta.dirname, '../aleph-sdk/src')

/**
 * Resolve `@/` imports based on which package the importer
 * lives in. Files inside the SDK resolve to the SDK's src;
 * everything else resolves to the console's src.
 */
function aliasByImporter(): Plugin {
  return {
    name: 'alias-by-importer',
    async resolveId(source, importer, options) {
      if (!source.startsWith('@/')) return null
      const tail = source.slice(2)
      const base =
        importer?.includes('/aleph-sdk/') ? sdkSrc : consoleSrc
      const resolved = resolve(base, tail)
      return this.resolve(resolved, importer, {
        ...options,
        skipSelf: true,
      })
    },
  }
}

export default defineConfig({
  plugins: [aliasByImporter()],
})
