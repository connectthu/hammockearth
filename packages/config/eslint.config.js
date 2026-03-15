/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

module.exports = config;
