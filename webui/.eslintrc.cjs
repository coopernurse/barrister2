module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "overrides": [
        {
            "files": ["**/*.test.js", "**/*.spec.js"],
            "env": {
                "node": true
            },
            "globals": {
                "global": "readonly",
                "describe": "readonly",
                "it": "readonly",
                "expect": "readonly",
                "beforeEach": "readonly",
                "afterEach": "readonly",
                "vi": "readonly"
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        "no-unused-vars": ["error", {
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_"
        }]
    }
}
