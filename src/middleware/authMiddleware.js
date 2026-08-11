import { prisma } from '../config/database.js';
import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';
import { AuthenticationError, TokenRevokedError } from '../utils/errors.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import { COOKIE_OPTIONS, ACCESS_COOKIE_OPTIONS } from '../config/constants.js';

export async function requireAuth(req, res, next) {
  try {
    const accessToken = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
      throw new AuthenticationError('Access token is required', ERROR_CODES.AUTHENTICATION_ERROR);
    }

    const decoded = verifyAccessToken(accessToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        avatar: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found', ERROR_CODES.AUTHENTICATION_ERROR);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: [],
        },
      });
    }
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.AUTHENTICATION_ERROR,
          message: 'Authentication required',
          details: [],
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.AUTHORIZATION_ERROR,
          message: 'Insufficient permissions',
          details: [],
        },
      });
    }

    next();
  };
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.AUTHENTICATION_ERROR,
          message: 'Authentication required',
          details: [],
        },
      });
    }

    const rolePermissions = {
      ADMIN: ['*'],
      AUTHOR: ['posts:create', 'posts:read', 'posts:update:own', 'posts:delete:own', 'comments:create', 'comments:read'],
      READER: ['posts:read', 'comments:create', 'comments:read'],
    };

    const userPermissions = rolePermissions[req.user.role] || [];

    const hasPermission = permissions.every((p) =>
      userPermissions.includes('*') || userPermissions.includes(p)
    );

    if (!hasPermission) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.AUTHORIZATION_ERROR,
          message: 'Insufficient permissions',
          details: [],
        },
      });
    }

    next();
  };
}

export async function validateRefreshToken(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required', ERROR_CODES.AUTHENTICATION_ERROR);
    }

    const decoded = verifyRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new TokenRevokedError();
    }

    if (storedToken.user.deletedAt) {
      throw new AuthenticationError('User no longer exists', ERROR_CODES.AUTHENTICATION_ERROR);
    }

    req.refreshToken = storedToken;
    req.user = storedToken.user;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError || error.code === 'TOKEN_REVOKED') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: error.code || ERROR_CODES.AUTHENTICATION_ERROR,
          message: error.message,
          details: [],
        },
      });
    }
    next(error);
  }
}

export function setAuthCookies(res, accessToken, refreshToken, rememberMe = false) {
  const accessOptions = {
    ...ACCESS_COOKIE_OPTIONS,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000,
  };

  res.cookie('accessToken', accessToken, accessOptions);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
}

export function clearAuthCookies(res) {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
}