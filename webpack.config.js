const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const env = require('yargs').argv.env;
const pkg = require('./package.json');

let libraryName = pkg.name;

if (env === 'build') {

    module.exports = {
        entry: './src/lib/SaiStyleColorPicker.ts',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: libraryName +'.js',
            libraryExport: 'default',
            library: 'SaiStyleColorPicker',
            libraryTarget: 'umd'
        },
        devtool: 'source-map',
        mode: 'production',
        module: {
            rules: [{
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.less$/,
                    use: [{
                        loader: MiniCssExtractPlugin.loader,
                    }, {
                        loader: 'css-loader'
                    }, {
                        loader: 'postcss-loader'
                    }, {
                        loader: 'less-loader'
                    }]
                }
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js']
        },
        plugins: [
            new MiniCssExtractPlugin({
              filename: 'picker-base.css',
            }),
        ],
    };
          
} else {

    module.exports = {
        entry: './src/demo/index.ts',
        output: {
            path: path.resolve(__dirname, 'demo'),
            filename: 'demo_bundle.js',
        },
        devtool: 'inline-source-map',
        mode: 'development',
        module: {
            rules: [{
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.less$/,
                    use: [{
                        loader: 'style-loader'
                    }, {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true
                        }
                    }, {
                        loader: 'postcss-loader'
                    }, {
                        loader: 'less-loader',
                        options: {
                            sourceMap: true
                        }
                    }]
                }
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js']
        },
        devServer: {
            host: '0.0.0.0',
            contentBase: path.resolve(__dirname, 'demo'),
            port: 3100,
            hot: true,
            stats: 'errors-only'
        }
    };
}
