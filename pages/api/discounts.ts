import type { NextApiRequest, NextApiResponse } from 'next';
import { getDiscounts, saveDiscounts, getInvoice, DiscountCode } from '../../lib/store';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { code, invoiceId } = req.query;

    // Client checking a discount code
    if (code && invoiceId) {
      const [discounts, inv] = await Promise.all([
        getDiscounts(),
        getInvoice(invoiceId as string),
      ]);
      const dc = discounts.find(d => d.code.toLowerCase() === (code as string).toLowerCase() && !d.used);
      if (!dc || !inv) return res.json({ valid: false, message: 'Invalid or expired discount code.' });

      const discountAmount = dc.type === 'percent'
        ? Math.round((inv.total * dc.value / 100) * 100) / 100
        : Math.min(dc.value, inv.total);

      return res.json({
        valid: true,
        type: dc.type,
        value: dc.value,
        discountAmount,
        label: dc.type === 'percent' ? `${dc.value}% off` : `₹${dc.value} off`,
      });
    }

    // Admin listing all codes
    const discounts = await getDiscounts();
    return res.json(discounts);
  }

  if (req.method === 'POST') {
    const { code, type, value } = req.body;
    if (!code || !type || !value) return res.status(400).json({ error: 'Code, type and value required' });

    const discounts = await getDiscounts();
    const exists = discounts.find(d => d.code.toLowerCase() === code.toLowerCase());
    if (exists) return res.status(400).json({ error: 'A code with this name already exists.' });

    const dc: DiscountCode = {
      id: uuidv4(),
      code: code.toUpperCase().replace(/\s/g, ''),
      type,
      value: Number(value),
      used: false,
      createdAt: Date.now(),
    };
    discounts.push(dc);
    await saveDiscounts(discounts);
    return res.json(dc);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    const discounts = await getDiscounts();
    await saveDiscounts(discounts.filter(d => d.id !== id));
    return res.json({ success: true });
  }

  res.status(405).end();
}
