import { prisma } from '../config/database.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendEmail, generateEmailVerificationTemplate, generatePasswordResetTemplate } from '../utils/email.js';
import { generateUniqueSlug } from '../utils/slug.js';
import { createAuditLog } from '../middleware/auditMiddleware.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  TokenRevokedError,
} from '../utils/errors.js';
import { env, isDevelopment } from '../config/env.js';
import crypto from 'crypto';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function registerUser(data, req) {
  const { email, password, name } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (!existingUser.emailVerified) {
      await prisma.user.delete({ where: { id: existingUser.id } });
    } else {
      throw new ConflictError('Email already registered');
    }
  }

  const passwordHash = await hashPassword(password);
  const emailVerifyToken = generateToken();
  const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      emailVerifyToken,
      emailVerifyExpiry,
    },
  });

  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`;
  const emailTemplate = generateEmailVerificationTemplate(name, verifyUrl);

  await sendEmail({
    to: email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  await createAuditLog(user.id, 'REGISTER', 'User', user.id, null, { email, name }, req);

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
}

export async function loginUser(data, req) {
  const { email, password, rememberMe } = data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.deletedAt) {
    throw new AuthenticationError('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AuthenticationError('Invalid credentials');
  }

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000),
    },
  });

  await createAuditLog(user.id, 'LOGIN', 'User', user.id, null, { ip: req.ip }, req);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
    rememberMe,
  };
}

export async function logoutUser(refreshToken, req) {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  }

  if (req.user) {
    await createAuditLog(req.user.id, 'LOGOUT', 'User', req.user.id, null, { ip: req.ip }, req);
  }
}

export async function refreshAccessToken(refreshToken, req) {
  const decoded = verifyRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    throw new TokenRevokedError();
  }

  if (storedToken.user.deletedAt) {
    throw new AuthenticationError('User no longer exists');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  const newAccessToken = generateAccessToken({ userId: storedToken.user.id, role: storedToken.user.role });
  const newRefreshToken = generateRefreshToken({ userId: storedToken.user.id });

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: storedToken.user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await createAuditLog(storedToken.user.id, 'TOKEN_REFRESH', 'User', storedToken.user.id, null, { ip: req.ip }, req);

  return {
    user: {
      id: storedToken.user.id,
      email: storedToken.user.email,
      name: storedToken.user.name,
      role: storedToken.user.role,
      emailVerified: storedToken.user.emailVerified,
      avatar: storedToken.user.avatar,
    },
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function verifyEmail(token) {
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ValidationError('Invalid or expired verification token');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  });

  return { message: 'Email verified successfully' };
}

export async function resendVerificationEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { message: 'If the email exists, a verification link has been sent' };
  }

  if (user.emailVerified) {
    throw new ValidationError('Email already verified');
  }

  const emailVerifyToken = generateToken();
  const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken, emailVerifyExpiry },
  });

  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`;
  const emailTemplate = generateEmailVerificationTemplate(user.name, verifyUrl);

  await sendEmail({
    to: email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  return { message: 'If the email exists, a verification link has been sent' };
}

export async function forgotPassword(email) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.deletedAt) {
    return { message: 'If the email exists, a reset link has been sent' };
  }

  const passwordResetToken = generateToken();
  const passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken, passwordResetExpiry },
  });

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${passwordResetToken}`;
  const emailTemplate = generatePasswordResetTemplate(user.name, resetUrl);

  await sendEmail({
    to: email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  return { message: 'If the email exists, a reset link has been sent' };
}

export async function resetPassword(token, password) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  await prisma.refreshToken.updateMany({
    where: { userId: user.id },
    data: { revoked: true },
  });

  return { message: 'Password reset successfully' };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new NotFoundError('User');
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { revoked: true },
  });

  return { message: 'Password changed successfully' };
}

export async function updateProfile(userId, data) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      avatar: data.avatar,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return { user };
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || user.deletedAt) {
    throw new NotFoundError('User');
  }

  return { user };
}