import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/vue'

// Utan cleanup ligger varje renderad komponent kvar i document.body mellan testerna.
afterEach(() => {
  cleanup()
})
