const path = require('path');

module.exports = {
    entry: './src/index.ts',
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
    output: {
        filename: 'index_bundle.js'
    },
    devServer: {
        host: '0.0.0.0',
        contentBase: path.resolve(__dirname),
        port: 3100,
        hot: true,
        stats: 'errors-only'
    }
};