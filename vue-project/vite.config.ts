import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path';


console.log('99999Artifacts path:', path.resolve(__dirname, '../artifacts'));
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 别名 key 自定义，value 是项目根绝对路径，可根据实际调整
      '@artifacts': path.resolve(__dirname, '../artifacts'), 
    },
  },
})
