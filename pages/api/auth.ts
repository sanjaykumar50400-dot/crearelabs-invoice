import type { NextApiRequest, NextApiResponse } from 'next';
import { createSession, verifySession, deleteSession, saveOTP, getOTP, deleteOTP } from '../../lib/store';

async function sendSMSOTP(phone: string, otp: string): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return { sent: false, error: 'No SMS API key configured' };

  try {
    const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone.replace(/\D/g, '').slice(-10), // last 10 digits
      }),
    });
    const data = await resp.json();
    if (data.return === true) return { sent: true };
    return { sent: false, error: data.message || 'SMS failed' };
  } catch (e: any) {
    return { sent: false, error: e.message };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, otp, password, token } = req.body;

  // ── Send OTP ──────────────────────────────────────────
  if (action === 'send-otp') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOTP(code);

    const smsResult = await sendSMSOTP(process.env.ADMIN_PHONE || '+919540117458', code);

    if (smsResult.sent) {
      return res.json({ success: true, message: 'OTP sent to your phone via SMS.' });
    } else {
      // Return OTP in dev/fallback mode so admin is never locked out
      console.warn('SMS failed:', smsResult.error);
      return res.json({
        success: true,
        demoOtp: code,
        message: `SMS unavailable (${smsResult.error}). OTP shown here: ${code}`,
      });
    }
  }

  // ── Verify OTP ────────────────────────────────────────
  if (action === 'verify-otp') {
    const stored = await getOTP();
    if (!stored) return res.status(401).json({ error: 'OTP expired. Please request a new one.' });
    if (otp !== stored) return res.status(401).json({ error: 'Invalid OTP. Please try again.' });

    await deleteOTP();
    const sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await createSession(sessionToken);
    return res.json({ success: true, token: sessionToken });
  }

  // ── Password Login ────────────────────────────────────
  if (action === 'password') {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return res.status(500).json({ error: 'Admin password not configured.' });
    if (password !== adminPassword) return res.status(401).json({ error: 'Incorrect password.' });

    const sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await createSession(sessionToken);
    return res.json({ success: true, token: sessionToken });
  }

  // ── Verify Token ─────────────────────────────────────
  if (action === 'verify-token') {
    if (!token) return res.json({ valid: false });
    const valid = await verifySession(token);
    return res.json({ valid });
  }

  // ── Logout ────────────────────────────────────────────
  if (action === 'logout') {
    if (token) await deleteSession(token);
    return res.json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
