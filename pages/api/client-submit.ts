import type { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../lib/store';
import { sendInvoiceEmails } from '../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const store = getStore();
  const { invoiceId, firstName, lastName, email, phone, company, gst, discountCode } = req.body;

  const inv = store.invoices.find(i => i.id === invoiceId);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  if (inv.clientFilled) return res.status(400).json({ error: 'Invoice already filled' });

  // Apply discount if any
  let discountAmount = 0;
  let appliedCode: string | undefined;

  if (discountCode) {
    const dc = store.discountCodes.find(d => d.code.toLowerCase() === discountCode.toLowerCase() && !d.used);
    if (dc) {
      if (dc.type === 'percent') {
        discountAmount = Math.round((inv.total * dc.value / 100) * 100) / 100;
      } else {
        discountAmount = Math.min(dc.value, inv.total);
      }
      dc.used = true;
      dc.usedBy = `${firstName} ${lastName}`;
      appliedCode = dc.code;
    }
  }

  const finalTotal = Math.max(0, inv.total - discountAmount);

  // Update invoice
  inv.clientFilled = true;
  inv.clientName = `${firstName} ${lastName}`;
  inv.clientEmail = email;
  inv.clientPhone = phone;
  inv.clientCompany = company || '';
  inv.clientGST = gst || '';
  inv.status = 'pending';
  inv.discountCode = appliedCode;
  inv.discountAmount = discountAmount;
  inv.finalTotal = finalTotal;

  // Send emails
  try {
    await sendInvoiceEmails(inv);
    inv.emailSent = true;
  } catch (err) {
    console.error('Email send error:', err);
    // Don't fail the whole request if email fails
  }

  return res.json({
    success: true,
    invoice: inv,
    discountApplied: discountAmount > 0,
    discountAmount,
    finalTotal,
  });
}
