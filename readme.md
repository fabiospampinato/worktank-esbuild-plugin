# WorkTank Esbuild Plugin

Esbuild plugin for WorkTank which enables you to execute whole files in a worker pool, transparently.

## Install

```sh
npm install --save worktank-esbuild-plugin
```

## Usage

For more information read [this](https://github.com/fabiospampinato/worktank-loader).

```ts
import esbuild from 'esbuild';
import worktank from 'worktank-esbuild-plugin';

esbuild.build ({
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'node',
  target: 'es2018',
  entryPoints: ['index.ts'],
  outdir: 'dist',
  plugins: [
    worktank ({
      filter: /\.worker\.(js|ts)$/ // Files matching this regex will be processed
    })
  ]
});
```

## License

MIT © Fabio Spampinato
