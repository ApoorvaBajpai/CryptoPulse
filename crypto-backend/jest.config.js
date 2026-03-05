module.exports = {
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**/*.js",
        "middleware/**/*.js",
        "config/**/*.js",
        "!src/__tests__/**"
    ],
    coverageDirectory: "coverage",
    testEnvironment: "node",
};
