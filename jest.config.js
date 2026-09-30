const {
  compilerOptions: { paths },
} = require('./tsconfig.base.json');

const moduleNameMapper = Object.fromEntries(
  Object.entries(paths).map(([key, value]) => {
    return [key.replace(/\*$/, '(.*)'), `<rootDir>/${value[0].replace(/\*$/, '$1')}`];
  }),
);

const config = {
  moduleNameMapper,
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/environments/',
    '/src/main.ts',
    '/src/polyfills.ts',
    '/src/test.ts'
  ],
  detectOpenHandles: true,
  forceExit: false,
  testTimeout: 15000, // Increased timeout to allow for proper cleanup
  clearMocks: true,
  restoreMocks: true,
  // Additional settings to help with resource cleanup
  maxWorkers: 1, // Use single worker to reduce resource contention during CI
};

module.exports = config;
