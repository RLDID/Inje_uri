import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      'create-dirs.js',
      'create-ideal-type-dir.js',
      'make-dirs.js',
    ],
  },
];

export default config;
