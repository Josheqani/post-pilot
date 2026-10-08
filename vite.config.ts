import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || process.cwd(), './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        configure: (proxy) => {
          (proxy as { on: (event: string, cb: (...args: unknown[]) => void) => void }).on(
            'error',
            (_err: unknown, _req: unknown, res: unknown) => {
              const httpRes = res as {
                writeHead?: (code: number, headers: Record<string, string>) => void;
                headersSent?: boolean;
                end?: (data: string) => void;
              };
              if (httpRes && typeof httpRes.writeHead === 'function' && !httpRes.headersSent) {
                httpRes.writeHead(503, { 'Content-Type': 'application/json' });
                httpRes.end?.(
                  JSON.stringify({
                    error:
                      'Cannot connect to PostPilot Worker API on port 8787. Start both worker and frontend using "pnpm run dev".',
                  })
                );
              }
            }
          );
        },
      },
    },
  },
});
