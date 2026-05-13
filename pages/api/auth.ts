import type { NextApiRequest, NextApiResponse } from 'next';

// Simple session store (in-memory, single server instance)
// For multi-instance, use JWT or a Redis session store
declare global {
  var __sessions: Set<string> | undefined;
  var __pendingOTPs: Map<string, string> | undefined;
}
if (!global.__sessions) global.__sessions = new Set();
if (!global.__pendingOTPs) global.__pendingOTPs = new Map();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { action, otp, password, token } = req.body;

    if (action === 'send-otp') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      global.__pendingOTPs!.set('admin', code);
      // In production, integrate SMS API here (MSG91, Fast2SMS, etc.)
      // For now, return OTP in response (remove in production!)
      return res.json({ success: true, demoOtp: code, message: 'OTP generated. Integrate SMS API to deliver it.' });
    }

    if (action === 'verify-otp') {
      const stored = global.__pendingOTPs!.get('admin');
      if (stored && otp === stored) {
        const sessionToken = Math.random().toString(36).slice(2) + Date.now();
        global.__sessions!.add(sessionToken);
        global.__pendingOTPs!.delete('admin');
        return res.json({ success: true, token: sessionToken });
      }
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (action === 'password') {
      if (password === process.env.ADMIN_PASSWORD) {
        const sessionToken = Math.random().toString(36).slice(2) + Date.now();
        global.__sessions!.add(sessionToken);
        return res.json({ success: true, token: sessionToken });
      }
      return res.status(401).json({ error: 'Invalid password' });
    }

    if (action === 'verify-token') {
      return res.json({ valid: global.__sessions!.has(token) });
    }

    if (action === 'logout') {
      global.__sessions!.delete(token);
      return res.json({ success: true });
    }
  }

  res.status(405).end();
}
