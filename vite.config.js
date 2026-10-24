import { defineConfig } from 'vite';

// This repo is a GitHub *user* site (<your-username>.github.io), served from the
// domain root, so the base path is "/". For a project site served from
// https://<user>.github.io/<repo>/, set base to "/<repo>/".
export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 800, // three.js is ~600 kB unminified; it loads after the page
    rollupOptions: {
      output: {
        // Keep three.js and GSAP in their own cached files.
        manualChunks: { three: ['three'], gsap: ['gsap'] },
      },
    },
  },
});
