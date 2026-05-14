import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

let memDiscounts: any[] = [
  { id: 'dc1', code: 'LAUNCH20', type: 'percent', value: 20, used: false, createdAt: Date.now() },
  { id: 'dc2', code: 'FLAT500', type: 'flat', value: 500, used: false, createdAt: Date.now() },
];

async function readDiscounts() {
  try {
    const { getDiscounts } = await import('../../lib/store');
    const data = await getDiscounts();
    if (data && data.length > 0) { memDiscounts = data; return data; }
  } catch {}
  return memDiscounts;
}

async function writeDiscounts(discounts: any[]) {
  memDiscounts = discounts;
  try {
    const { saveDiscounts } = await import('../../lib/store');
    await saveDiscounts(discounts);
  } catch {}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { code, invoiceId } = req.query;

    if (code && invoiceId) {
      // Client checking discount code
      let inv: any = null;
      try {
        const invRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/invoices?id=${invoiceId}`);
        inv = await invRes.json();
      } catch {}

      const discounts = await readDiscounts();
      const dc = discounts.find((d: any) => d.code.toLowerCase() === (code as string).toLowerCase() && !d.used);
      if (!dc || !inv || inv.error) return res.json({ valid: false, message: 'Invalid or expired discount code.' });

      const discountAmount = dc.type === 'percent'
        ? Math.round((inv.total * dc.value / 100) * 100) / 100
        : Math.min(dc.value, inv.total);

      return res.json({
        valid: true, type: dc.type, value: dc.value, discountAmount,
        label: dc.type === 'percent' ? `${dc.value}% off` : `₹${dc.value} off`,
      });
    }

    // Admin: list all
    const discounts = await readDiscounts();
    return res.json(discounts);
  }

  if (req.method === 'POST') {
    const { code, type, value } = req.body;
    if (!code || !type || !value) return res.status(400).json({ error: 'Code, type and value required' });
    const discounts = await readDiscounts();
    if (discounts.find((d: any) => d.code.toLowerCase() === code.toLowerCase())) {
      return res.status(400).json({ error: 'A code with this name already exists.' });
    }
    const dc = { id: uuidv4(), code: code.toUpperCase().replace(/\s/g, ''), type, value: Number(value), used: false, createdAt: Date.now() };
    discounts.push(dc);
    await writeDiscounts(discounts);
    return res.json(dc);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    const discounts = await readDiscounts();
    await writeDiscounts(discounts.filter((d: any) => d.id !== id));
    return res.json({ success: true });
  }

  res.status(405).end();
}
