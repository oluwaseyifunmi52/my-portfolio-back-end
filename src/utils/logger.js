import { env, isProduction, isDevelopment } from '../config/env.js';

const logger = isProduction
  ? await import('pino').then(({ default: pino }) =>
      pino({
        level: env.LOG_LEVEL,
        formatters: {
          level: (label) => ({ level: label.toUpperCase() }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      })
    )
  : await import('pino-pretty').then(() =>
      await import('pino').then(({ default: pino }) =>
        pino({
          level: env.LOG_LEVEL,
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
          },
        })
      )
    );

export const logger = logger;

export function createRequestLogger(req, res, next) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

export function logError(error, context = {}) {
  logger.error({
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
    },
  });
}