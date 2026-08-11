import nodemailer from 'nodemailer';
import { env, isDevelopment } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (!transporter && env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT || 587,
      secure: env.EMAIL_PORT === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const transporterInstance = getTransporter();

  if (!transporterInstance) {
    if (isDevelopment) {
      console.log('--- EMAIL (DEV MODE) ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text: ${text}`);
      console.log('--- END EMAIL ---');
      return { messageId: 'dev-mode' };
    }
    throw new Error('Email service not configured');
  }

  const info = await transporterInstance.sendMail({
    from: env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject,
    html,
    text,
  });

  return info;
}

export function generateEmailVerificationTemplate(name, verifyUrl) {
  return {
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
            <h1 style="color: #1a1a2e; margin-bottom: 20px;">Welcome to Blog API!</h1>
            <p>Hi ${name},</p>
            <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #1a1a2e; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Verify Email</a>
            </div>
            <p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
            <p>This link expires in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to Blog API!\n\nHi ${name},\n\nThanks for signing up! Please verify your email address: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  };
}

export function generatePasswordResetTemplate(name, resetUrl) {
  return {
    subject: 'Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
            <h1 style="color: #1a1a2e; margin-bottom: 20px;">Password Reset Request</h1>
            <p>Hi ${name},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link expires in 1 hour.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `Password Reset Request\n\nHi ${name},\n\nYou requested to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  };
}