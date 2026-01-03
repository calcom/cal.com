import reactCompiler from 'eslint-plugin-react-compiler';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-compiler': reactCompiler,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      '.wxt/**',
      '.output/**',
      'android/**',
      'ios/**',
      'extension/**',
      '**/*.generated.*',
      '**/*.d.ts',
      'babel.config.js',
      'metro.config.js',
      'tailwind.config.js',
      'wxt.config.ts',
    ],
  }
);

