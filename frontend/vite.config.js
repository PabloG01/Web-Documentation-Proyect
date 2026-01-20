import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: '0.0.0.0', // Permite acceso desde otras máquinas en LAN
        strictPort: true, // Falla si el puerto está ocupado
        open: false, // No abrir automáticamente el navegador
    },
    build: {
        outDir: 'build', // Mantener compatibilidad con scripts existentes
        sourcemap: false, // Similar a tu configuración actual
        chunkSizeWarningLimit: 1000, // Evitar warnings por chunks grandes
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separar vendors grandes para mejor caching
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'swagger': ['swagger-ui-react'],
                    'markdown': ['react-markdown', 'remark-gfm', 'rehype-sanitize'],
                    'syntax': ['react-syntax-highlighter', 'prism-react-renderer'],
                }
            }
        }
    },
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            'axios',
            'lucide-react'
        ]
    }
});
