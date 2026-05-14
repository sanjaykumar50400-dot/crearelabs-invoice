import type { NextApiRequest, NextApiResponse } from 'next';

// Only import store functions when Redis env vars are present
async function tryCreateSession(token: string) {
  try {
    const { createSession } = await import('../../lib/store');
    await createSession(token);
  } catch (e) {
    console.warn('Redis session save failed (Redis not configured?)', e);
    // Session still works via localStorage — just won't survive server restarts
  }
}

async function tryVerifySession(token: string): Promise<boolean> {
  try {
    const { verifySession } = await import('../../lib/store');
    return await verifySession(token);
  } catch (e) {
    console.warn('Redis session verify failed', e);
    return false;
  }
}

async function tryDeleteSession(token: string) {
  try {
    const { deleteSession } = await import('../../lib/store');
    await deleteSession(token);
  } catch (e) {
    console.warn('Redis session delete failed', e);
  }
}

async function trySaveOTP(otp: string) {
  try {
    const { saveOTP } = await import('../../lib/store');
    await saveOTP(otp);
  } catch (e) {
    console.warn('Redis OTP save failed', e);
  }
}

async function tryGetOTP(): Promise<string | null> {
  try {
    const { getOTP } = await import('../../lib/store');
    return await getOTP();
  } catch (e) {
    console.warn('Redis OTP get failed', e);
    return null;
  }
}

async function tryDeleteOTP() {
  try {
    const { deleteOTP } = await import('../../lib/store');
    await deleteOTP();
  } catch (e) {
    console.warn('Redis OTP delete failed', e);
  }
}

async function sendSMSOTP(phone: string, otp: string): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return { sent: false, error: 'SMS not configured' };
  try {
    const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { 'authorization': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone.replace(/\D/g, '').slice(-10),
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

  // ── Send OTP ────────────────────────────────────────────────────────────────
  if (action === 'send-otp') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await trySaveOTP(code);
    const smsResult = await sendSMSOTP(process.env.ADMIN_PHONE || '+919540117458', code);
    if (smsResult.sent) {
      return res.json({ success: true, message: 'OTP sent via SMS.' });
    }
    return res.json({ success: true, demoOtp: code, message: `OTP: ${code}` });
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  if (action === 'verify-otp') {
    const stored = await tryGetOTP();
    if (!stored) return res.status(401).json({ error: 'OTP expired. Request a new one.' });
    if (otp !== stored) return res.status(401).json({ error: 'Invalid OTP.' });
    await tryDeleteOTP();
    const sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await tryCreateSession(sessionToken);
    return res.json({ success: true, token: sessionToken });
  }

  // ── Password Login ──────────────────────────────────────────────────────────
  if (action === 'password') {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Debug: log what we're comparing (remove after fixing)
    console.log('Password attempt. ENV set:', !!adminPassword, '| Match:', password === adminPassword);

    if (!adminPassword) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD environment variable is not set in Vercel. Go to Settings → Environment Variables and add it.' });
    }

    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await tryCreateSession(sessionToken);
    return res.json({ success: true, token: sessionToken });
  }

  // ── Verify Token ────────────────────────────────────────────────────────────
  if (action === 'verify-token') {
    if (!token) return res.json({ valid: false });
    const valid = await tryVerifySession(token);
    return res.json({ valid });
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  if (action === 'logout') {
    if (token) await tryDeleteSession(token);
    return res.json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
