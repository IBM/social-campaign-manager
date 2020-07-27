/**
 * @author: @AngularClass
 */

const webpack = require('webpack');
const helpers = require('./helpers');

/**
 * Webpack Plugins
 *
 * problem with copy-webpack-plugin
 */
// const AssetsPlugin = require('assets-webpack-plugin');
// const IgnorePlugin = require('webpack/lib/IgnorePlugin');
// const NormalModuleReplacementPlugin = require('webpack/lib/NormalModuleReplacementPlugin');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
const HtmlElementsPlugin = require('./html-elements-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineManifestWebpackPlugin = require('inline-manifest-webpack-plugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const ngcWebpack = require('ngc-webpack');

/**
 * Webpack Constants
 */
const HMR = helpers.hasProcessFlag('hot');
const AOT = process.env.BUILD_AOT || helpers.hasNpmFlag('aot');
const METADATA = {
    title: 'IBM Social Campaign Manager',
    baseUrl: '/',
    isDevServer: helpers.isWebpackDevServer(),
    HMR: HMR,
    AOT: AOT
};

/**
 * Webpack configuration
 *
 * See: http://webpack.github.io/docs/configuration.html#cli
 */
module.exports = function(options) {
    var isProd = options.env === 'production';
    return {

        /**
         * Cache generated modules and chunks to improve performance for multiple incremental builds.
         * This is enabled by default in watch mode.
         * You can pass false to disable it.
         *
         * See: http://webpack.github.io/docs/configuration.html#cache
         */

        /**
         * The entry point for the bundle
         * Our Angular.js app
         *
         * See: http://webpack.github.io/docs/configuration.html#entry
         */
        entry: {
            polyfills: './src/polyfills.browser.ts',
            twbs: 'bootstrap-loader',
            main: AOT ? './src/main.browser.aot.ts' : './src/main.browser.ts'
        },

        /**
         * Options affecting the resolving of modules.
         *
         * See: http://webpack.github.io/docs/configuration.html#resolve
         */
        resolve: {

            /**
             * An array of extensions that should be used to resolve modules.
             *
             * See: http://webpack.github.io/docs/configuration.html#resolve-extensions
             */
            extensions: ['.ts', '.js', '.json'],

            /**
             * An array of directory names to be resolved to the current directory
             */
            modules: [helpers.root('src'), helpers.root('node_modules')]
        },

        /**
         * Options affecting the normal modules.
         *
         * See: http://webpack.github.io/docs/configuration.html#module
         */
        module: {
            rules: [

                /**
                 * Typescript loader support for .ts
                 *
                 * Component Template/Style integration using `angular2-template-loader`
                 * Angular 2 lazy loading (async routes) via `ng-router-loader`
                 *
                 * `ng-router-loader` expects vanilla JavaScript code, not TypeScript code. This is why the
                 * order of the loader matter.
                 *
                 * See: https://github.com/s-panferov/awesome-typescript-loader
                 * See: https://github.com/TheLarkInn/angular2-template-loader
                 * See: https://github.com/shlomiassaf/ng-router-loader
                 */
                {
                    test: /\.ts$/,
                    use: [
                        {

                            /**
                             *  MAKE SURE TO CHAIN VANILLA JS CODE, I.E. TS COMPILATION OUTPUT.
                             */
                            loader: 'ng-router-loader',
                            options: {
                                loader: 'async-import',
                                genDir: 'compiled',
                                aot: AOT
                            }
                        },
                        {
                            loader: 'awesome-typescript-loader',
                            options: {
                                configFileName: 'tsconfig.webpack.json',
                                useCache: !isProd
                            }
                        },
                        {
                            loader: 'ngc-webpack',
                            options: {
                                disable: !AOT
                            }
                        },
                        {
                            loader: 'angular2-template-loader'
                        }
                    ],
                    exclude: [/\.(spec|e2e)\.ts$/]
                },

                /**
                 * To string and css loader support for *.css files (from Angular components)
                 * Returns file content as string
                 *
                 */
                {
                    test: /\.css$/,
                    use: ['to-string-loader', 'css-loader'],
                    exclude: [helpers.root('src', 'styles')]
                },

                /**
                 * To string and sass loader support for *.scss files (from Angular components)
                 * Returns compiled css content as string
                 *
                 */
                {
                    test: /\.scss$/,
                    use: ['to-string-loader', 'css-loader', 'sass-loader'],
                    exclude: [helpers.root('src', 'styles')]
                },

                /**
                 * Raw loader support for *.html
                 * Returns file content as string
                 *
                 * See: https://github.com/webpack/raw-loader
                 */
                {
                    test: /\.html$/,
                    use: 'raw-loader',
                    exclude: [helpers.root('src/index.html')]
                },

                /**
                 * File loader for supporting images, for example, in CSS files.
                 */
                {
                    test: /\.(jpg|png|gif)$/,
                    use: 'file-loader'
                },

                /*
                 * Bootstrap 4 loader
                 */
                {
                    test: /bootstrap\/dist\/js\/umd\//,
                    use: 'imports-loader?jQuery=jquery'
                },

                /*
                 * Font loaders, required for font-awesome-sass-loader and bootstrap-loader
                 */
                {
                    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    loader:
                        'url-loader?limit=10000&mimetype=application/font-woff'
                },
                {
                    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    loader: 'file-loader'
                }
            ]
        },

        /**
         * Add additional plugins to the compiler.
         *
         * See: http://webpack.github.io/docs/configuration.html#plugins
         */
        plugins: [
            // Remove all locale files in moment with the IgnorePlugin if you don't need them
            // new IgnorePlugin(/^\.\/locale$/, /moment$/),

            // Use for DLLs
            // new AssetsPlugin({
            //   path: helpers.root('dist'),
            //   filename: 'webpack-assets.json',
            //   prettyPrint: true
            // }),

            /**
             * Plugin: ForkCheckerPlugin
             * Description: Do type checking in a separate process, so webpack doesn't need to wait.
             *
             * See: https://github.com/s-panferov/awesome-typescript-loader#forkchecker-boolean-defaultfalse
             */
            new CheckerPlugin(),

            /**
             * Plugin: CommonsChunkPlugin
             * Description: Shares common code between the pages.
             * It identifies common modules and put them into a commons chunk.
             *
             * See: https://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin
             * See: https://github.com/webpack/docs/wiki/optimization#multi-page-app
             */
            new CommonsChunkPlugin({
                name: 'polyfills',
                chunks: ['polyfills']
            }),

            /**
             * Plugin: ContextReplacementPlugin
             * Description: Provides context to Angular's use of System.import
             *
             * See: https://webpack.github.io/docs/list-of-plugins.html#contextreplacementplugin
             * See: https://github.com/angular/angular/issues/11580
             */
            new ContextReplacementPlugin(

                /**
                 * The (\\|\/) piece accounts for path separators in *nix and Windows
                 */

                // location of your src
                /(.+)?angular(\\|\/)core(.+)?/,
                helpers.root('src'),
                {

                    /**
                     * Your Angular Async Route paths relative to this root directory
                     */
                }
            ),

            /**
             * Plugin: CopyWebpackPlugin
             * Description: Copy files and directories in webpack.
             *
             * Copies project static assets.
             *
             * See: https://www.npmjs.com/package/copy-webpack-plugin
             */
            new CopyWebpackPlugin(
                [
                    { from: 'src/assets', to: 'assets' },
                    { from: 'src/meta' },
                    {
                        from: 'node_modules/leaflet/dist/leaflet.css',
                        to: 'assets/leaflet'
                    },
                    {
                        from: 'node_modules/leaflet/dist/images',
                        to: 'assets/leaflet/images'
                    },
                    {
                        from:
                            'node_modules/leaflet.markercluster/dist/MarkerCluster.css',
                        to: 'assets/leaflet'
                    },
                    {
                        from:
                            'node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css',
                        to: 'assets/leaflet'
                    }
                ],
                isProd ? { ignore: ['mock-data/**/*']} : undefined
            ),

            /*
             * Plugin: HtmlWebpackPlugin
             * Description: Simplifies creation of HTML files to serve your webpack bundles.
             * This is especially useful for webpack bundles that include a hash in the filename
             * which changes every compilation.
             *
             * See: https://github.com/ampedandwired/html-webpack-plugin
             */
            new HtmlWebpackPlugin({
                template: 'src/index.html',
                title: METADATA.title,
                chunksSortMode: function(a, b) {
                    const entryPoints = [
                        'inline',
                        'polyfills',
                        'sw-register',
                        'styles',
                        'vendor',
                        'main'
                    ];
                    return (
                        entryPoints.indexOf(a.names[0]) -
                        entryPoints.indexOf(b.names[0])
                    );
                },
                metadata: METADATA,
                inject: 'body'
            }),

            /**
             * Plugin: ScriptExtHtmlWebpackPlugin
             * Description: Enhances html-webpack-plugin functionality
             * with different deployment options for your scripts including:
             *
             * See: https://github.com/numical/script-ext-html-webpack-plugin
             */
            new ScriptExtHtmlWebpackPlugin({
                sync: /polyfills|vendor/,
                defaultAttribute: 'async',
                preload: [/polyfills|vendor|main/],
                prefetch: [/chunk/]
            }),

            /**
             * Plugin: HtmlElementsPlugin
             * Description: Generate html tags based on javascript maps.
             *
             * If a publicPath is set in the webpack output configuration, it will be automatically added to
             * href attributes, you can disable that by adding a "=href": false property.
             * You can also enable it to other attribute by settings "=attName": true.
             *
             * The configuration supplied is map between a location (key) and an element definition object (value)
             * The location (key) is then exported to the template under then htmlElements
             * property in webpack configuration.
             *
             * Example:
             *  Adding this plugin configuration
             *  new HtmlElementsPlugin({
             *    headTags: { ... }
             *  })
             *
             *  Means we can use it in the template like this:
             *  <%= webpackConfig.htmlElements.headTags %>
             *
             * Dependencies: HtmlWebpackPlugin
             */
            new HtmlElementsPlugin({
                headTags: require('./head-config.common')
            }),

            /**
             * Plugin LoaderOptionsPlugin (experimental)
             *
             * See: https://gist.github.com/sokra/27b24881210b56bbaff7
             */
            new LoaderOptionsPlugin({}),

            new ngcWebpack.NgcWebpackPlugin({

                /**
                 * If false the plugin is a ghost, it will not perform any action.
                 * This property can be used to trigger AOT on/off depending on your build target (prod, staging etc...)
                 *
                 * The state can not change after initializing the plugin.
                 * @default true
                 */
                disabled: !AOT,
                tsConfig: helpers.root('tsconfig.webpack.json')
            }),

            /**
             * Plugin: InlineManifestWebpackPlugin
             * Inline Webpack's manifest.js in index.html
             *
             * https://github.com/szrenwei/inline-manifest-webpack-plugin
             */
            new InlineManifestWebpackPlugin(),

            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
                'window.jQuery': 'jquery',
                Tether: 'tether',
                'window.Tether': 'tether',
                Popper: 'popper.js/dist/umd/popper.js',
                Tooltip: 'exports-loader?Tooltip!bootstrap/js/dist/tooltip',
                Alert: 'exports-loader?Alert!bootstrap/js/dist/alert',
                Button: 'exports-loader?Button!bootstrap/js/dist/button',
                Carousel: 'exports-loader?Carousel!bootstrap/js/dist/carousel',
                Collapse: 'exports-loader?Collapse!bootstrap/js/dist/collapse',
                Dropdown: 'exports-loader?Dropdown!bootstrap/js/dist/dropdown',
                Modal: 'exports-loader?Modal!bootstrap/js/dist/modal',
                Popover: 'exports-loader?Popover!bootstrap/js/dist/popover',
                Scrollspy:
                    'exports-loader?Scrollspy!bootstrap/js/dist/scrollspy',
                Tab: 'exports-loader?Tab!bootstrap/js/dist/tab',
                Util: 'exports-loader?Util!bootstrap/js/dist/util',
                L: 'leaflet'
            })
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
            process: true,
            module: false,
            clearImmediate: false,
            setImmediate: false
        }
    };
};
