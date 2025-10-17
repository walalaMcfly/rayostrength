const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configuración completa para resolver el problema de SHA-1
config.watchFolders = [__dirname];
config.resolver = {
  ...config.resolver,
  // Deshabilitar blockList que pueda estar bloqueando tslib
  blockList: undefined,
  // Asegurar que todas las node_modules sean vigiladas
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
  },
  // Resolver el problema de tslib sin usar rutas directas
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === 'tslib') {
      // Dejar que Metro resuelva tslib automáticamente
      // pero forzar la resolución correcta
      return context.resolveRequest(context, 'tslib', platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Configuración específica para desarrollo web
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: false,
    },
  },
};

// Para desarrollo web
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Permitir acceso a tslib
      if (req.url.includes('tslib')) {
        return next();
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;