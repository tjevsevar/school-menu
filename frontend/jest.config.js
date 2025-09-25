module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        '*.js',
        '!node_modules/**',
        '!jest.config.js'
    ],
    verbose: true
};
