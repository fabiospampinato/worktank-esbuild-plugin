
/* IMPORT */

import esbuild from 'esbuild';
import worktank from '../dist/index.js';

/* MAIN */

esbuild.build ({
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'node',
  target: 'es2018',
  entryPoints: ['example.ts'],
  outdir: 'dist',
  plugins: [
    worktank ({
      filter: /\.worker\.(js|ts)$/
    })
  ]
});
