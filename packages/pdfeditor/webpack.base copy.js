const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const NODE_ENV = process.env.NODE_ENV || 'production';
const BASE_URL = process.env.BASE_URL || '/';
const BASE_PATH = path.resolve(__dirname, 'src');
const ASSETS_URL = BASE_URL + 'assets/';
const LANG_CODE = 'en';
const LANG_MESSAGES = require('./src/assets/locale/' + LANG_CODE + '.json');

const { generateFontCSS, fontList } = require('./font_list');
generateFontCSS(BASE_PATH + '/assets/fonts.css');


let output = {
    filename: 'js/[name].js?[chunkhash]'
};
let entry = {
    index: './src/entry/index.js'
}
let plugins = [
    new MiniCssExtractPlugin({
        filename: 'css/[id].css?[chunkhash]'
    }),
    new webpack.EnvironmentPlugin({
        PROMISE_QUEUE_COVERAGE: false
    }),
    new webpack.DefinePlugin({
        BASE_PATH: JSON.stringify(BASE_PATH),
        BASE_URL: JSON.stringify(BASE_URL),
        NODE_ENV: JSON.stringify(NODE_ENV),
        ASSETS_URL: JSON.stringify(ASSETS_URL),
        LANG_CODE: JSON.stringify(LANG_CODE),
        LANG_MESSAGES: JSON.stringify(LANG_MESSAGES),
        fontList: JSON.stringify(fontList)
    }),
    new CopyWebpackPlugin({
        patterns: [
            // {
            //     from: path.resolve(__dirname, 'src/assets/hr-technology.pdf'),
            //     to: 'hr-technology.pdf',
            //     noErrorOnMissing: true
            // },
            {
                from: path.resolve(__dirname, 'src/assets'),
                to: 'assets',
                noErrorOnMissing: true
            }
        ]
    }),
    new webpack.ProvidePlugin({
        $L: [ path.resolve(__dirname, 'src/locale.js'), 'Locale']
    })
];
let externals = {
    pdfjsLib: [ BASE_URL + 'assets/js/pdfjs/pdf.min.js', 'pdfjsLib' ],
    // pdfjsLib: [ 'http://localhost/pdf/pdfeditor/src/assets/js/pdfjs/pdf.min.js', 'pdfjsLib' ],
    // 'opentype.js': [ 'http://localhost/pdf/pdfeditor/src/assets/js/opentype/opentype.min.js', 'opentype' ],
    // '@simonwep/pickr': [ 'http://localhost/pdf/pdfeditor/src/assets/js/pickr/pickr.min.js', 'Pickr' ]
    // 'opentype': 'opentype.js',
    // 'Pickr': '@simonwep/pickr'
};

if (NODE_ENV == 'production') {
    // entry = {
    //     pdfeditor: './src/index.js'
    // }
    // output = {
    //     filename: '[name].js',
    //     library: {
    //         name: 'PDFEditor',
    //         type: 'umd'
    //     }
    // };
    externals = {
        pdfjsLib: [ BASE_URL + 'assets/js/pdfjs/pdf.min.js', 'pdfjsLib' ],
        // 'opentype': 'opentype.js',
        // 'Pickr': '@simonwep/pickr'
        // 'opentype.js': [ BASE_URL + 'js/opentype/opentype.min.js', 'opentype' ],
        // '@simonwep/pickr': [ BASE_URL + 'js/pickr/pickr.min.js', 'Pickr' ]
    };
}

const configs = {
    mode: NODE_ENV,
    entry: entry,
    performance: {
        hints: 'warning',
        maxEntrypointSize: 5000000,
        maxAssetSize: 3000000,
        assetFilter: function (assetFilename) {
            return assetFilename.endsWith('.js')
        }
    },
    optimization: {
        splitChunks: false,
        minimize: false
    },
    output: Object.assign(output, {
        publicPath: BASE_URL,
        path: path.resolve(__dirname, 'pdfeditor'),
        clean: true
    }),
    resolve: {
        mainFiles: [
            'index'
        ]
    },
    plugins: plugins,
    devtool: false,
    externalsType: 'script',
    externals: externals,
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            url: false
                        }
                    },
                    'postcss-loader'
                ]
            },
            // {
            //     test: /\.(png|jpe?g|gif|svg|webp)$/i,
            //     loader: 'url-loader'
            // },
            // {
            //     test: /\.(png|jpe?g|gif|svg|webp)$/i,
            //     type: 'asset/resource',
            //     generator: {
            //         filename: 'images/[name][ext][query]'
            //     }
            // },
            {
                test: /\.(html|phtml)$/i,
                loader: 'ejs-loader',
                options: {
                    esModule: false
                }
            }
        ]
    }
};

configs.plugins.push(new HtmlWebpackPlugin({
    title: 'PDF Editor',
    chunks: ['index'],
    filename: 'index.html',
    template: './src/pages/index.html',
    minify: false,
    inject: false,
    scriptLoading: 'blocking',
    favicon: null,
    hash: false
}));
module.exports = configs;