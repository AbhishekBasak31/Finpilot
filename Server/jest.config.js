export default {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  transform: {},
  collectCoverageFrom: [
    "modules/**/*.js",
    "!modules/**/*.routes.js",
  ],
};