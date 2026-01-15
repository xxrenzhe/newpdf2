
const { merge } = require('webpack-merge');
const base = require('./webpack.base');

module.exports = merge(base, {
    devServer: {
        compress: false,
        host: 'localhost',
        port: 3000,
        server: {
            type: 'https'
        },
        proxy: {
            '/api': {
                target: 'http://localhost/sites/abcdpdf_com/lp/public',
                pathRewrite: {
                    '^/api': ''
                },
                changeOrigin: true,
                secure: false
            }
        },
        hot: false,
        open: false
    }
});