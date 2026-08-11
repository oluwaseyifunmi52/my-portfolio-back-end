import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      req.body = result.body || req.body;
      req.query = result.query || req.query;
      req.params = result.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Validation failed', details);
      }
      next(error);
    }
  };
}

export function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!key.startsWith('$') && !key.includes('.')) {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
}