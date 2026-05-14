import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

let memInvoices: any[] = [];

async function readInvoices() {
  try {
    const { getInvoices } = await import('../../lib/store');
    const data = await getInvoices();
    if (data && data.length > 0) { memInvoices = data; return data; }
  } catch {}
  return memInvoices;
}

async function writeInvoices(invoices: any[]) {
  memInvoices = invoices;
  try {
    const { saveInvoices } = await import('../../lib/store');
    await saveInvoices(invoices);
  } catch {}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id } = req.query;
    const invoices = await readInvoices();
    if (id) {
      const inv = invoices.find((i: any) => i.id === id);
      if (!inv) return res.status(404).json({ error: 'Invoice not found' });
      return res.json(inv);
    }
    return res.json(invoices);
  }

  if (req.method === 'POST') {
    const { title, services, notes } = req.body;
    if (!title || !services?.length) return res.status(400).json({ error: 'Title and services required' });
    const subtotal = services.reduce((a: number, s: any) => a + Number(s.amount), 0);
    const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round((subtotal + gstAmount) * 100) / 100;
    const inv = {
      id: uuidv4(), title, services, subtotal, gst: 18, gstAmount, total,
      notes: notes || '', status: 'sent', created: Date.now(), clientFilled: false,
    };
    const invoices = await readInvoices();
    invoices.push(inv);
    await writeInvoices(invoices);
    return res.json(inv);
  }

  if (req.method === 'PUT') {
    const { id, status } = req.body;
    const invoices = await readInvoices();
    const inv = invoices.find((i: any) => i.id === id);
    if (!inv) return res.status(404).json({ error: 'Not found' });
    if (status) inv.status = status;
    await writeInvoices(invoices);
    return res.json(inv);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    const invoices = await readInvoices();
    await writeInvoices(invoices.filter((i: any) => i.id !== id));
    return res.json({ success: true });
  }

  res.status(405).end();
}
