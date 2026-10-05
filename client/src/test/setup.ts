import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/vue'

// Without cleanup every rendered component stays in document.body between tests.
afterEach(() => {
  cleanup()
})
