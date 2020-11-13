/**
 * @author: @AngularClass
 */
require('dotenv').config();

const helpers = require('./helpers');
const buildUtils = require('./build-utils');

/**
 * Used to merge webpack configs
 */
const webpackMerge = require('webpack-merge');

/**
 * The settings that are common to prod and dev
 */
const commonConfig = require('./webpack.common.js');

/**
 * Webpack Plugins
 */
const DefinePlugin = require('webpack/lib/DefinePlugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HashedModuleIdsPlugin = require('webpack/lib/HashedModuleIdsPlugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const NormalModuleReplacementPlugin = require('webpack/lib/NormalModuleReplacementPlugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const OptimizeJsPlugin = require('optimize-js-plugin');

/**
 * Webpack Constants
 */
const ENV = (process.env.NODE_ENV = process.env.ENV = 'production');
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 8080;
const AOT = process.env.BUILD_AOT || helpers.hasNpmFlag('aot');
const METADATA = {
    host: HOST,
    port: PORT,
    ENV: ENV,
    HMR: false,
    AOT: AOT
};
const sourceMapEnabled = process.env.SOURCE_MAP === '1';
const supportES2015 = buildUtils.supportES2015(buildUtils.DEFAULT_METADATA.tsConfigPath);

const CAMPAIGN_FORM_ENABLED = process.env.CAMPAIGN_FORM_ENABLED;

/**
   * Ref: https://github.com/mishoo/UglifyJS2/tree/harmony#minify-options
   * @param supportES2015
   * @param enableCompress disabling compress could improve the performance,
   * see https://github.com/webpack/webpack/issues/4558#issuecomment-352255789
   * @returns {{ecma: number, warnings: boolean, ie8: boolean, mangle: boolean,
   * compress: {pure_getters: boolean, passes: number}, output: {ascii_only: boolean, comments: boolean}}}
 */
function getUglifyOptions(supportES2015, enableCompress) {
    const uglifyCompressOptions = {

        /* buildOptimizer */
        pure_getters: true,
        // PURE comments work best with 3 passes.
        // See https://github.com/webpack/webpack/issues/2899#issuecomment-317425926.
        /* buildOptimizer */
        passes: 2
    };

    return {
        ecma: supportES2015 ? 6 : 5,
        warnings: false,
        ie8: false,
        mangle: true,
        compress: enableCompress ? uglifyCompressOptions : false,
        output: {
            ascii_only: true,
            comments: false
        }
    };
}

// eslint-disable-next-line
module.exports = function(env) {
    return webpackMerge(
        commonConfig({
            env: ENV
        }),
        {
            mode: 'production',

            /**
             * Developer tool to enhance debugging
             *
             * See: http://webpack.github.io/docs/configuration.html#devtool
             * See: https://github.com/webpack/docs/wiki/build-performance#sourcemaps
             */
            devtool: 'source-map',

            /**
             * Options affecting the output of the compilation.
             *
             * See: http://webpack.github.io/docs/configuration.html#output
             */
            output: {

                /**
                 * The output directory as absolute path (required).
                 *
                 * See: http://webpack.github.io/docs/configuration.html#output-path
                 */
                path: helpers.root('dist'),

                /**
                 * Specifies the name of each output file on disk.
                 * IMPORTANT: You must not specify an absolute path here!
                 *
                 * See: http://webpack.github.io/docs/configuration.html#output-filename
                 */
                filename: '[name].[chunkhash].bundle.js',

                /**
                 * The filename of the SourceMaps for the JavaScript files.
                 * They are inside the output.path directory.
                 *
                 * See: http://webpack.github.io/docs/configuration.html#output-sourcemapfilename
                 */
                sourceMapFilename: '[file].map',

                /**
                 * The filename of non-entry chunks as relative path
                 * inside the output.path directory.
                 *
                 * See: http://webpack.github.io/docs/configuration.html#output-chunkfilename
                 */
                chunkFilename: '[name].[chunkhash].chunk.js'
            },

            optimization: {
                minimizer: [

                    /**
                     * Plugin: UglifyJsPlugin
                     * Description: Minimize all JavaScript output of chunks.
                     * Loaders are switched into minimizing mode.
                     *
                     * See: https://webpack.js.org/plugins/uglifyjs-webpack-plugin/
                     *
                     * NOTE: To debug prod builds uncomment //debug lines and comment //prod lines
                     */
                    new UglifyJsPlugin({
                        sourceMap: sourceMapEnabled,
                        parallel: true,
                        cache: helpers.root('webpack-cache/uglify-cache'),
                        uglifyOptions: getUglifyOptions(supportES2015, true)
                    })
                ],
                splitChunks: {
                    chunks: 'all'
                }
            },


            module: {
                rules: [

                    /**
                     * Extract CSS files from .src/styles directory to external CSS file
                     */
                    {
                        test: /\.css$/,
                        use: [MiniCssExtractPlugin.loader, 'css-loader'],
                        include: [helpers.root('src', 'styles')]
                    },

                    /**
                     * Extract and compile SCSS files from .src/styles directory to external CSS file
                     */
                    {
                        test: /\.scss$/,
                        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
                        include: [helpers.root('src', 'styles')]
                    }
                ]
            },

            /**
             * Add additional plugins to the compiler.
             *
             * See: http://webpack.github.io/docs/configuration.html#plugins
             */
            plugins: [

                /**
                 * Webpack plugin to optimize a JavaScript file for faster initial load
                 * by wrapping eagerly-invoked functions.
                 *
                 * See: https://github.com/vigneshshanmugam/optimize-js-plugin
                 */
                new OptimizeJsPlugin({
                    sourceMap: false
                }),

                new MiniCssExtractPlugin({ filename: '[name]-[hash].css', chunkFilename: '[name]-[chunkhash].css' }),

                /**
                 * Plugin: DefinePlugin
                 * Description: Define free variables.
                 * Useful for having development builds with debug logging or adding global constants.
                 *
                 * Environment helpers
                 *
                 * See: https://webpack.github.io/docs/list-of-plugins.html#defineplugin
                 */
                // NOTE: when adding more properties make sure you include them in custom-typings.d.ts
                new DefinePlugin({
                    ENV: JSON.stringify(METADATA.ENV),
                    HMR: METADATA.HMR,
                    AOT: METADATA.AOT,
                    'process.env': {
                        ENV: JSON.stringify(METADATA.ENV),
                        NODE_ENV: JSON.stringify(METADATA.ENV),
                        HMR: METADATA.HMR,
                        CAMPAIGN_FORM_ENABLED: JSON.stringify(CAMPAIGN_FORM_ENABLED),
                        MOCK: 'false',
                        MOCK_EXCEPTIONS: JSON.stringify([
                            'auth/login',
                            'auth/register',
                            'auth/logout',
                            'auth/logout-others',
                            'auth/logout-all',
                            'auth/session',
                            'auth/refresh',
                            'auth/forgot-password',
                            'auth/password-reset',
                            'auth/password-change',
                            'auth/change-email'
                        ])
                    }
                }),

                /**
                 * Plugin: NormalModuleReplacementPlugin
                 * Description: Replace resources that matches resourceRegExp with newResource
                 *
                 * See: http://webpack.github.io/docs/list-of-plugins.html#normalmodulereplacementplugin
                 */
                new NormalModuleReplacementPlugin(
                    /(angular2|@angularclass)((\\|\/)|-)hmr/,
                    helpers.root('config/empty.js')
                ),

                new NormalModuleReplacementPlugin(
                    /zone\.js(\\|\/)dist(\\|\/)long-stack-trace-zone/,
                    helpers.root('config/empty.js')
                ),

                new HashedModuleIdsPlugin(),

                /**
                 * AoT
                 * Manually remove compiler just to make sure it's gone
                 */
                AOT
                    ? new NormalModuleReplacementPlugin(/@angular(\\|\/)compiler/, helpers.root('config/empty.js'))
                    : new LoaderOptionsPlugin({}),

                /**
                 * Plugin LoaderOptionsPlugin (experimental)
                 *
                 * See: https://gist.github.com/sokra/27b24881210b56bbaff7
                 */
                new LoaderOptionsPlugin({
                    minimize: true,
                    debug: false,
                    options: {

                        /**
                         * Html loader advanced options
                         *
                         * See: https://github.com/webpack/html-loader#advanced-options
                         */
                        // TODO: Need to workaround Angular 2's html syntax => #id [bind] (event) *ngFor
                        htmlLoader: {
                            minimize: true,
                            removeAttributeQuotes: false,
                            caseSensitive: true,
                            customAttrSurround: [
                                [/#/, /(?:)/],
                                [/\*/, /(?:)/],
                                [/\[?\(?/, /(?:)/]
                            ],
                            customAttrAssign: [/\)?\]?=/]
                        }
                    }
                })

                /**
                 * Plugin: BundleAnalyzerPlugin
                 * Description: Webpack plugin and CLI utility that represents
                 * bundle content as convenient interactive zoomable treemap
                 *
                 * `npm run build:prod -- --env.analyze` to use
                 *
                 * See: https://github.com/th0r/webpack-bundle-analyzer
                 */
            ],

            /**
             * Include polyfills or mocks for various node stuff
             * Description: Node configuration
             *
             * See: https://webpack.github.io/docs/configuration.html#node
             */
            node: {
                global: true,
                crypto: 'empty',
                process: false,
                module: false,
                clearImmediate: false,
                setImmediate: false
            }
        }
    );
};
