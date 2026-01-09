const webpack = require('webpack');

module.exports = {
    webpack: function override(config) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "process/browser": require.resolve('process/browser'),
        };

        config.plugins = [
            ...config.plugins,
            new webpack.ProvidePlugin({
                process: 'process/browser',
            }),
        ];

        return config;
    },

    // Fix deprecation warnings for webpack-dev-server
    devServer: function (configFunction) {
        return function (proxy, allowedHost) {
            const config = configFunction(proxy, allowedHost);

            // Remove deprecated options
            delete config.onBeforeSetupMiddleware;
            delete config.onAfterSetupMiddleware;

            // Use new setupMiddlewares option
            config.setupMiddlewares = (middlewares, devServer) => {
                return middlewares;
            };

            return config;
        };
    }
};
