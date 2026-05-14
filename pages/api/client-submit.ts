import type { NextApiRequest, NextApiResponse } from 'next';
import { getInvoice, updateInvoice, getDiscounts, saveDiscounts } from '../../lib/store';
import { sendInvoiceEmails } from '../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { invoiceId, firstName, lastName, email, phone, company, gst, discountCode } = req.body;

  if (!invoiceId || !firstName || !lastName || !email || !phone) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const inv = await getInvoice(invoiceId);
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  if (inv.clientFilled) return res.status(400).json({ error: 'This invoice has already been filled.' });

  // Apply discount
  let discountAmount = 0;
  let appliedCode: string | undefined;

  if (discountCode) {
    const discounts = await getDiscounts();
    const dc = discounts.find(d => d.code.toLowerCase() === discountCode.toLowerCase() && !d.used);
    if (dc) {
      discountAmount = dc.type === 'percent'
        ? Math.round((inv.total * dc.value / 100) * 100) / 100
        : Math.min(dc.value, inv.total);
      dc.used = true;
      dc.usedBy = `${firstName} ${lastName}`;
      appliedCode = dc.code;
      await saveDiscounts(discounts);
    }
  }

  const finalTotal = Math.max(0, Math.round((inv.total - discountAmount) * 100) / 100);

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

  await updateInvoice(inv);

  // Send emails
  try {
    await sendInvoiceEmails(inv);
    inv.emailSent = true;
    await updateInvoice(inv);
  } catch (err: any) {
    console.error('Email send error:', err?.message);
    // Don't fail the whole request — client can still pay
  }

  return res.json({
    success: true,
    invoice: inv,
    discountApplied: discountAmount > 0,
    discountAmount,
    finalTotal,
  });
}
