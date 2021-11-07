import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-vercel';

// Overrides for written code that assumes Node.js
const defines = {
  'process.version': '"1000"', // @torus imports pump which checks for Node 0.x
};

if (process.env.ACTION !== 'BUILD') {
  // borsh
  defines['global.TextDecoder'] = 'TextDecoder';
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: [
    preprocess({
      postcss: true,
    }),
  ],

  kit: {
    adapter: adapter(),
    prerender: {
      entries: ['*'],
    },
    vite: () => ({
      define: defines,
      optimizeDeps: {
        include: ['eventemitter3'],
      },
    }),
    // hydrate the <div id="svelte"> element in src/app.html
    target: '#svelte',
  },
};

export default config;
