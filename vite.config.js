import { defineConfig } from 'vite';

// La base debe coincidir con el nombre del repositorio en GitHub Pages
// (https://<usuario>.github.io/conducir/). `command` es 'serve' en `npm run dev`
// (base '/') y 'build' al compilar para producción (base '/conducir/').
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/conducir/' : '/',
  build: {
    chunkSizeWarningLimit: 1200,
  },
}));
