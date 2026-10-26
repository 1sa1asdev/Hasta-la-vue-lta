import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/vue'
import { afterEach, vi } from 'vitest'
import { settlePendingFetch } from './fetch'

// Vitest runs without globals, so Testing Library cannot clean up on its own.
afterEach(async () => {
  cleanup()
  await settlePendingFetch()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
