import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../lib/store';
import { sendInvoiceEmails } from '../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.body;
  const store = getStore();
  const inv = store.invoices.find(i => i.id === id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  if (!inv.clientFilled) return res.status(400).json({ error: 'Client has not filled details yet' });

  try {
    await sendInvoiceEmails(inv);
    inv.emailSent = true;
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Resend email error:', err);
    return res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
}
