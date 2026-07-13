import { defineConfig } from 'rollup';

export default defineConfig([
  {
    input: 'src/index.js',
    output: {
      file: 'build/task-center-sdk.es.js',
      format: 'es',
      exports: 'named'
    }
  },
  {
    input: 'src/index.js',
    output: {
      file: 'build/task-center-sdk.umd.js',
      format: 'umd',
      name: 'TaskCenter',
      exports: 'named'
    }
  },
  {
    input: 'src/index.js',
    output: {
      file: 'build/task-center-sdk.iife.js',
      format: 'iife',
      name: 'TaskCenter',
      exports: 'named'
    }
  }
]);
