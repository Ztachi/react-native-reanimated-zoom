import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'ReactNativeReanimatedZoom',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-native',
        'react-native-reanimated',
        'react-native-gesture-handler',
      ],
      output: {
        globals: {
          react: 'React',
          'react-native': 'ReactNative',
          'react-native-reanimated': 'Reanimated',
          'react-native-gesture-handler': 'GestureHandler',
        },
      },
    },
  },
});
