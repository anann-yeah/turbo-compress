module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // This tells ts-jest to just ignore the ESM vs CommonJS drama
  transform: {
    '^.+\\.ts$': ['ts-jest', { 
      diagnostics: false,
      isolatedModules: true 
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};