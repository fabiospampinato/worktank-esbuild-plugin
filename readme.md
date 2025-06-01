# WorkTank Esbuild Plugin

Esbuild plugin for [WorkTank](https://github.com/fabiospampinato/worktank) which enables you to execute whole files in a worker pool, transparently.

Essentially by just importing from a `*.worker.js` module it will look to you and to TypeScript as if you are just importing async functions, but actually a pool will be created for that module automatically for you, the pool will be proxied, and what you will be actually calling would be those proxied methods.

## Install

```sh
npm install worktank-esbuild-plugin
```

## Usage

First we need to configure the bundler, mainly we need to tell the "worktank" plugin which files to process:

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

Then we can have a worker file like this:

```ts
// example.worker.ts

// You can set any supported WorkTank option like this:
// WORKTANK_OPTIONS = { pool: { name: 'MyExamplePool', size: 5 }, worker: { autoTerminate: 60_000 } }

// Dependencies will be handled automatically
import MyMath from 'some-math-module';

// Some functions to execute in the worker pool
const add = async ( a: number, b: number ) => a + b;
const multiply = async ( a: number, b: number ) => MyMath.multiply ( a * b );

// Exporting all functions
export {add, multiply};
```

Which we can then use like this:

```ts
// index.ts

// Importing functions from the worker file like normal
import {add, multiply} from './example.worker';
// Importing the special injected "pool" export, which is a reference to the `WorkTank` instance that got created automatically for the worker file
import {pool} from './example.worker';

// Calling a function like normal
console.log ( await add ( 5, 10 ) ); // => 15

// Terminating the worker pool, if you want to
pool.terminate ();
```

## Tips

- Setting `WORKTANK_OPTIONS` in the worker file is entirely optional, but worth thinking about it if you need some customization.
- It's important to annotate the returned function as actually being async or otherwise returning a promise, otherwise the expected types and the actual types will not match.
- This plugin will inject a export called "pool" automatically, which will be a reference to the WorkTank instance created for the worker file.
  - If you want to use it you might want to add this dummy export to your worker file to make types just work: `const pool = {} WorkTank<any>; export {pool};`.

## License

MIT © Fabio Spampinato
