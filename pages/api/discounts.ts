import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../lib/store';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const store = getStore();

  if (req.method === 'GET') {
    // Check discount code validity (public endpoint for clients)
    const { code, invoiceId } = req.query;
    if (code && invoiceId) {
      const inv = store.invoices.find(i => i.id === invoiceId);
      const dc = store.discountCodes.find(d => d.code.toLowerCase() === (code as string).toLowerCase() && !d.used);
      if (!dc || !inv) return res.json({ valid: false, message: 'Invalid or expired code' });
      const discountAmount = dc.type === 'percent'
        ? Math.round((inv.total * dc.value / 100) * 100) / 100
        : Math.min(dc.value, inv.total);
      return res.json({ valid: true, type: dc.type, value: dc.value, discountAmount, label: dc.type === 'percent' ? `${dc.value}% off` : `₹${dc.value} off` });
    }
    // Admin: list all codes
    return res.json(store.discountCodes);
  }

  if (req.method === 'POST') {
    const { code, type, value } = req.body;
    if (!code || !type || !value) return res.status(400).json({ error: 'Code, type and value required' });
    const exists = store.discountCodes.find(d => d.code.toLowerCase() === code.toLowerCase());
    if (exists) return res.status(400).json({ error: 'Code already exists' });
    const dc = { id: uuidv4(), code: code.toUpperCase(), type, value: Number(value), used: false, createdAt: Date.now() };
    store.discountCodes.push(dc);
    return res.json(dc);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    store.discountCodes = store.discountCodes.filter(d => d.id !== id);
    return res.json({ success: true });
  }

  res.status(405).end();
}
