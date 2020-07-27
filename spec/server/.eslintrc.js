module.exports = {
    'env': {
        'node': true,
        'es6': true,
        'browser': false,
        'mocha': true
    },
    'plugins': ['jasmine'],
    'extends': 'plugin:jasmine/recommended',
    'rules': {
        'jasmine/missing-expect': 2,
        'jasmine/valid-expect': 0
    },
    'rules': {
        'no-unused-vars': [
            'error',
            {
                'varsIgnorePattern': '[gG]lobal'
            }
        ]
    }
};

