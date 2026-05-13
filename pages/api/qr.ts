import type { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { amount, note } = req.query;
  const upiId = process.env.UPI_ID || 'crearelabs@ptaxis';
  const upiName = process.env.UPI_NAME || 'Crearelabs';
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent((note as string) || 'Invoice Payment')}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(upiString, {
      width: 300,
      margin: 2,
      color: { dark: '#1A1917', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });
    // Return as base64 data URL
    return res.json({ qr: qrDataUrl, upiString });
  } catch (err) {
    return res.status(500).json({ error: 'QR generation failed' });
  }
}
