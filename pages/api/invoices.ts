import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore, Invoice } from '../../lib/store';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const store = getStore();

  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const inv = store.invoices.find(i => i.id === id);
      if (!inv) return res.status(404).json({ error: 'Invoice not found' });
      return res.json(inv);
    }
    return res.json(store.invoices);
  }

  if (req.method === 'POST') {
    const { title, services, notes } = req.body;
    if (!title || !services?.length) return res.status(400).json({ error: 'Title and services required' });

    const subtotal = services.reduce((a: number, s: any) => a + Number(s.amount), 0);
    const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const total = subtotal + gstAmount;

    const inv: Invoice = {
      id: uuidv4(),
      title,
      services,
      subtotal,
      gst: 18,
      gstAmount,
      total,
      notes: notes || '',
      status: 'sent',
      created: Date.now(),
      clientFilled: false,
    };
    store.invoices.push(inv);
    return res.json(inv);
  }

  if (req.method === 'PUT') {
    const { id, status } = req.body;
    const inv = store.invoices.find(i => i.id === id);
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (status) inv.status = status;
    return res.json(inv);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    store.invoices = store.invoices.filter(i => i.id !== id);
    return res.json({ success: true });
  }

  res.status(405).end();
}
