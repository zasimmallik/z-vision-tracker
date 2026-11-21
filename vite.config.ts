import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase-auth': ['firebase/app', 'firebase/auth'],
          'vendor-firebase-db': ['firebase/firestore'],
          'vendor-adhan': ['adhan'],
        },
      },
    },
  },
});
