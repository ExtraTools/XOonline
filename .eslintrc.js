module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'eslint-config-prettier'
  ],
  plugins: [
    'node'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Основные правила
    'no-console': 'off', // Разрешаем console.log для серверных приложений
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    
    // Стиль кода
    'indent': ['error', 4, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // Функции
    'arrow-spacing': 'error',
    'func-call-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    
    // Асинхронный код
    'require-await': 'error',
    'no-return-await': 'error',
    
    // Безопасность
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Node.js специфичные правила
    'node/no-unpublished-import': 'off',
    'node/no-missing-import': 'off', // Отключаем т.к. используем ES modules
    'node/no-unsupported-features/es-syntax': 'off'
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off', // В скриптах разрешаем console
        'no-process-exit': 'off' // В скриптах разрешаем process.exit
      }
    },
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'no-unused-expressions': 'off'
      }
    }
  ]
};