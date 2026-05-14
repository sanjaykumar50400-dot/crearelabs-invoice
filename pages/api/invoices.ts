import type { NextApiRequest, NextApiResponse } from 'next';
import { getInvoices, saveInvoices, getInvoice, updateInvoice, Invoice } from '../../lib/store';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const inv = await getInvoice(id as string);
      if (!inv) return res.status(404).json({ error: 'Invoice not found' });
      return res.json(inv);
    }
    const invoices = await getInvoices();
    return res.json(invoices);
  }

  if (req.method === 'POST') {
    const { title, services, notes } = req.body;
    if (!title || !services?.length) return res.status(400).json({ error: 'Title and services required' });

    const subtotal = services.reduce((a: number, s: any) => a + Number(s.amount), 0);
    const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round((subtotal + gstAmount) * 100) / 100;

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

    const invoices = await getInvoices();
    invoices.push(inv);
    await saveInvoices(invoices);
    return res.json(inv);
  }

  if (req.method === 'PUT') {
    const { id, status } = req.body;
    const inv = await getInvoice(id);
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (status) inv.status = status;
    await updateInvoice(inv);
    return res.json(inv);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    const invoices = await getInvoices();
    await saveInvoices(invoices.filter(i => i.id !== id));
    return res.json({ success: true });
  }

  res.status(405).end();
}
