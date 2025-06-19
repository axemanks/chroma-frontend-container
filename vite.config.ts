import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteVersionPlugin } from './plugins/vite-version-plugin';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), viteVersionPlugin()],
});
