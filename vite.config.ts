import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/lit-code-editor/',
  resolve: {
    alias: [
      {
        find: 'vscode',
        replacement: path.resolve(__dirname, 'node_modules/@codingame/monaco-languageclient/lib/vscode-compatibility')
      }
    ]
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/code-editor.ts'),
      name: 'MonacoEditorLC',
      fileName: (format) => `moned-lc.${format}.js`,
    },
    rollupOptions: {
      external: ['vscode'],
      output: {
        inlineDynamicImports: true,
        name: 'MonacoEditorLC',
        exports: 'named',
        globals: {
          vscode: 'vscode'
        }
      }
    },
  },
  server: {
    port: 30000
  }
});
