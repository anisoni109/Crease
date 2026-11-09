import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
 root:'pages-app',base:'./',publicDir:path.resolve('public'),plugins:[react()],
 build:{outDir:path.resolve('github-pages'),emptyOutDir:true},
});
