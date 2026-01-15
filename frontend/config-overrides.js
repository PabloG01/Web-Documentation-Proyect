const webpack = require('webpack');

module.exports = function override(config, env) {
    // Optimizaciones de memoria
    config.optimization = {
        ...config.optimization,
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    priority: 10,
                    reuseExistingChunk: true,
                },
                common: {
                    minChunks: 2,
                    priority: 5,
                    reuseExistingChunk: true,
                },
            },
        },
        runtimeChunk: false,
    };

    // Reducir uso de memoria en desarrollo
    if (env === 'development') {
        config.optimization.removeAvailableModules = false;
        config.optimization.removeEmptyChunks = false;
        config.optimization.splitChunks = false;
    }

    // Deshabilitar source maps en desarrollo para ahorrar memoria
    config.devtool = env === 'production' ? 'source-map' : false;

    // Configurar límites de memoria para terser (minificación)
    if (env === 'production') {
        const TerserPlugin = require('terser-webpack-plugin');
        config.optimization.minimizer = [
            new TerserPlugin({
                parallel: 2, // Limitar paralelismo
                terserOptions: {
                    compress: {
                        drop_console: true,
                    },
                },
            }),
        ];
    }

    // Configurar cache para mejorar builds incrementales
    config.cache = {
        type: 'filesystem',
        buildDependencies: {
            config: [__filename],
        },
    };

    return config;
};
