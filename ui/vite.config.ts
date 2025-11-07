import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Note: COOP/COEP headers are removed to avoid conflicts with Coinbase Wallet SDK
  // FHEVM SDK may work without these headers, or we can use a different approach
  // If WebAssembly threads are needed, consider using a service worker or web worker
})
