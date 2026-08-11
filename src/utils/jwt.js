import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { TokenExpiredError, TokenInvalidError } from './errors.js';

export function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError('Access token has expired');
    }
    throw new TokenInvalidError('Invalid access token');
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError('Refresh token has expired');
    }
    throw new TokenInvalidError('Invalid refresh token');
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}