import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@stylistic': stylistic,
    },
    rules: {
      // 1. Desativa a regra base do ESLint
      'padding-line-between-statements': 'off',

      // 2. Aplica a versão moderna do Stylistic com suporte a TS e JSX
      '@stylistic/padding-line-between-statements': [
        'error',
        // Linha em branco após declarações de função, classes e métodos
        { blankLine: 'always', prev: ['function', 'class'], next: '*' },

        // Linha em branco após blocos (if, try/catch, switch, loops)
        { blankLine: 'always', prev: 'block-like', next: '*' },

        // Linha em branco antes de 'return'
        { blankLine: 'always', prev: '*', next: 'return' },

        // Linha em branco após declarações de tipos e interfaces
        { blankLine: 'always', prev: ['interface', 'type'], next: '*' },

        // Linha em branco após exportações
        { blankLine: 'always', prev: 'export', next: '*' },

        // Linha em branco entre blocos de import e o resto do código
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },

        // Linha em branco após variáveis/objetos, permitindo agrupamento entre si
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      ],
    },
  },
];