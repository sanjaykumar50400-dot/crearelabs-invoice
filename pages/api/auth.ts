import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const SECRET = process.env.TOKEN_SECRET || 'crearelabs-fallback-secret-key';

function signToken(): string {
  const payload = Buffer.from(JSON.stringify({
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  })).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): boolean {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return false;
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (sig !== expected) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

let memOTP = '';
let memOTPExp = 0;

async function sendSMSOTP(otp: string) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return false;
  try {
    const r = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: '9540117458',
      }),
    });
    const d = await r.json();
    return d.return === true;
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, otp, password, token } = req.body;

  if (action === 'send-otp') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    memOTP = code;
    memOTPExp = Date.now() + 10 * 60 * 1000;
    const sent = await sendSMSOTP(code);
    return res.json({ success: true, demoOtp: sent ? undefined : code });
  }

  if (action === 'verify-otp') {
    if (!memOTP || Date.now() > memOTPExp) {
      return res.status(401).json({ error: 'OTP expired. Request a new one.' });
    }
    if (otp !== memOTP) {
      return res.status(401).json({ error: 'Invalid OTP. Try again.' });
    }
    memOTP = '';
    return res.json({ success: true, token: signToken() });
  }

  if (action === 'password') {
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass) {
      return res.status(500).json({
        error: 'ADMIN_PASSWORD not set in Vercel Environment Variables.'
      });
    }
    if (password !== adminPass) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    return res.json({ success: true, token: signToken() });
  }

  if (action === 'verify-token') {
    if (!token) return res.json({ valid: false });
    return res.json({ valid: verifyToken(token) });
  }

  if (action === 'logout') {
    return res.json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
