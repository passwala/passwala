import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanEnvVar = (val) => {
  if (!val) return val;
  return val.replace(/^\uFEFF/, '').trim();
};

const smtpHost = cleanEnvVar(process.env.SMTP_HOST || 'smtp.gmail.com');
const smtpPort = parseInt(cleanEnvVar(process.env.SMTP_PORT) || '587');
const smtpUser = cleanEnvVar(process.env.SMTP_USER);
const smtpPass = cleanEnvVar(process.env.SMTP_PASS);

const recipient = process.argv[2];

if (!recipient) {
  console.error('❌ Please specify a recipient email address: node test_email.js <email>');
  process.exit(1);
}

if (!smtpUser || !smtpPass) {
  console.error('❌ SMTP_USER or SMTP_PASS is missing in your .env file!');
  process.exit(1);
}

console.log('--- SMTP Configuration ---');
console.log(`Host: ${smtpHost}`);
console.log(`Port: ${smtpPort}`);
console.log(`User: ${smtpUser}`);
console.log(`Port type: ${smtpPort === 465 ? 'Secure' : 'STARTTLS'}`);
console.log('--------------------------');

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

const mailOptions = {
  from: `"Passwala Test" <${smtpUser}>`,
  to: recipient,
  subject: '🧪 Passwala SMTP Test Email',
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #0b0f19; color: #ffffff; text-align: center;">
      <h1 style="color: #ff6f00; margin: 0 0 10px 0;">Passwala</h1>
      <hr style="border: 0; border-top: 1px solid #222; margin: 20px 0;">
      <p>Namaste,</p>
      <p>This is a test email to verify that your Passwala SMTP email configuration is working correctly.</p>
      <p>If you received this, everything is configured properly!</p>
      <p style="font-size: 12px; color: #666; margin-top: 40px; text-align: center;">
        © ${new Date().getFullYear()} Passwala. All rights reserved.
      </p>
    </div>
  `
};

console.log(`⏳ Sending test email to ${recipient}...`);

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Failed to send test email:', error);
    process.exit(1);
  }
  console.log('✅ Email sent successfully!');
  console.log('Message ID:', info.messageId);
  console.log('Response:', info.response);
  process.exit(0);
});
