
/* IMPORT */

import esbuild from 'esbuild';
import findUpJson from 'find-up-json';
import fs from 'node:fs';
import path from 'node:path';
import type {Plugin} from 'esbuild';
import type {Options} from 'worktank';

/* HELPERS */

const getBundle = ( filePath: string, plugins: Plugin[] ): esbuild.BuildResult => {

  return esbuild.buildSync ({
    absWorkingDir: path.dirname ( filePath ),
    entryPoints: [filePath],
    tsconfig: findUpJson ( 'tsconfig.json' )?.path,
    plugins,
    format: 'esm',
    platform: 'node',
    target: 'es2018',
    bundle: true,
    minify: true,
    write: false
  });

};

const getWorkerMethods = ( dist: string ): [string, string][] => {

  const names = new Map<string, string> ();
  const lineRe = /(?:^|;)\s*export\s*{\s*([^{}]*?)\s*}/gm;
  const identifierRe = /([a-zA-Z$_][a-zA-Z0-9$_]*)(?:\s+as\s+([a-zA-Z$_][a-zA-Z0-9$_]*))?/gm;

  const lines = Array.from ( dist.matchAll ( lineRe ) ).map ( match => match[1] );

  for ( const line of lines ) {

    const identifiers = Array.from ( line.matchAll ( identifierRe ) ).map ( match => [match[2] || match[1], match[1] || match[2]] );

    for ( const [identifierDist, identifierSrc] of identifiers ) {

      if ( identifierDist === 'pool' ) continue;

      names.set ( identifierDist, identifierSrc );

    }

  }

  return Array.from ( names.entries () );

};

const getWorkerOptions = ( filePath: string, dist: string, source: string, methods: [string, string][] ): Options => {

  const workerBackendModule = getWorkerBackendModule ( dist, methods );
  const name = source.match ( /\/\/.*?WORKTANK_NAME.*?=.*?(\S+)/ )?.[1] || path.basename ( filePath );
  const size = Number ( source.match ( /\/\/.*?WORKTANK_SIZE.*?=.*?(\d+)/ )?.[1] || 1 );

  return {name, size, methods: workerBackendModule};

};

const getWorkerBackendModule = ( dist: string, methods: [string, string][] ): string => {

  const unsupportedRe = /(?:^|;)\s*export\s*(?!\{)/gm;
  const unsupported = Array.from ( dist.matchAll ( unsupportedRe ) );

  if ( unsupported.length ) throw new Error ( 'WorkTank Loader: unsupported export detected, only simple "export {...}" are supported' );

  const supportedRe = /(?:^|;)\s*export\s*{[^{}]*}/gm;
  const supported = dist.replace ( supportedRe, '' );

  const registrations = methods.map ( ([ dist, src ]) => `WorkTankWorkerBackend.register ( '${dist}', ${src} );` ).join ( '' );

  return `${supported}${registrations}`;

};

const getWorkerFrontendModule = ( options: Options, methods: [string, string][] ): string => {

  return [
    `import Pool from 'worktank';`, // Importing WorkTank
    `const pool = new Pool ( ${JSON.stringify ( options )} );`, // Creating a pool
    ...methods.map ( ([ dist ]) => `export const ${dist} = function(){return pool.exec('${dist}',Array.prototype.slice.call(arguments))};` ), // Exporting wrapped methods
    `export {pool};` // Exporting pool
  ].join ( '' );

};

/* MAIN */

const plugin = ({ filter, plugins }: { filter: RegExp, plugins?: Plugin[] }): esbuild.Plugin => {

  return {
    name: 'worktank',
    setup: ( build: esbuild.PluginBuild ): void => {

      build.onLoad ( { filter }, async args => {

        const contents = await transform ( args.path, plugins );
        const loader = path.extname ( args.path ).slice ( 1 ) as 'js' | 'ts';

        return { contents, loader };

      });

    }
  };

};

const transform = async ( filePath: string, plugins: Plugin[] = [] ): Promise<string> => {

  const source = await fs.promises.readFile ( filePath, 'utf8' );

  const bundle = getBundle ( filePath, plugins );

  if ( !bundle.outputFiles || bundle.outputFiles.length < 1 ) throw new Error ( `WorkTank Loader: unsupported worker file "${filePath}", bundling failed` );

  if ( bundle.outputFiles.length > 1 ) throw new Error ( `WorkTank Loader: unsupported worker file "${filePath}", bundling generated multiple output files` );

  const dist = bundle.outputFiles[0].text;

  const workerMethods = getWorkerMethods ( dist );
  const workerOptions = getWorkerOptions ( filePath, dist, source, workerMethods );
  const workerFrontendModule = getWorkerFrontendModule ( workerOptions, workerMethods );

  return workerFrontendModule;

};

/* EXPORT */

export default plugin;
export {transform};
