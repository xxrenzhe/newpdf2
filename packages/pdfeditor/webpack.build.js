const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const { merge } = require('webpack-merge');
const base = require('./webpack.base');

module.exports = merge(base, {
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    format: {
                        comments: false
                    }
                },
                extractComments: true,
                parallel: true
            }),
            new CssMinimizerPlugin()
        ],
        minimize: true
    }
});