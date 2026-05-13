import nodemailer from 'nodemailer';
import { Invoice } from './store';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildInvoiceHTML(inv: Invoice, isAdmin: boolean): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const payLink = `${baseUrl}/pay/${inv.id}`;
  const finalTotal = inv.finalTotal ?? inv.total;
  const discount = inv.discountAmount ?? 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice from Crearelabs</title>
</head>
<body style="margin:0;padding:0;background:#F7F6F2;font-family:'Helvetica Neue',Arial,sans-serif;color:#1A1917;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F2;padding:40px 20px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E8E5DC;max-width:600px;width:100%;">
    <!-- Header -->
    <tr>
      <td style="background:#1A1917;padding:32px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 14px;font-weight:700;font-size:20px;color:#ffffff;letter-spacing:0.02em;">CL</div>
              <div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:8px;">Crearelabs</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Creative Studio</div>
            </td>
            <td align="right">
              <div style="color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Invoice</div>
              <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:4px;">#${inv.id.slice(-8).toUpperCase()}</div>
              <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px;">${new Date(inv.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Client info -->
    <tr>
      <td style="padding:32px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:24px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7A7870;margin-bottom:6px;">Billed To</div>
              <div style="font-size:16px;font-weight:600;">${inv.clientName || '—'}</div>
              ${inv.clientEmail ? `<div style="color:#7A7870;font-size:13px;margin-top:2px;">${inv.clientEmail}</div>` : ''}
              ${inv.clientPhone ? `<div style="color:#7A7870;font-size:13px;">${inv.clientPhone}</div>` : ''}
              ${inv.clientCompany ? `<div style="color:#7A7870;font-size:13px;">${inv.clientCompany}</div>` : ''}
              ${inv.clientGST ? `<div style="color:#7A7870;font-size:12px;font-family:monospace;">GST: ${inv.clientGST}</div>` : ''}
            </td>
            <td align="right" style="padding-bottom:24px;vertical-align:top;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7A7870;margin-bottom:6px;">Status</div>
              <span style="background:${inv.status === 'paid' ? '#D1FAE5' : '#FEF3C7'};color:${inv.status === 'paid' ? '#065F46' : '#92400E'};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;">${inv.status.toUpperCase()}</span>
            </td>
          </tr>
        </table>
        <div style="border-top:1px solid #E8E5DC;"></div>
      </td>
    </tr>
    <!-- Invoice title -->
    <tr>
      <td style="padding:24px 40px 0;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7A7870;margin-bottom:6px;">Project / Service</div>
        <div style="font-size:18px;font-weight:700;">${inv.title}</div>
      </td>
    </tr>
    <!-- Line items -->
    <tr>
      <td style="padding:24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E5DC;border-radius:12px;overflow:hidden;">
          <tr style="background:#F7F6F2;">
            <td style="padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#7A7870;font-weight:500;">Description</td>
            <td style="padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#7A7870;font-weight:500;text-align:right;">Amount</td>
          </tr>
          ${inv.services.map((s, i) => `
          <tr style="border-top:1px solid #E8E5DC;background:${i % 2 === 0 ? '#fff' : '#FAFAF8'};">
            <td style="padding:12px 16px;font-size:14px;">${s.name}</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:500;text-align:right;">${formatINR(s.amount)}</td>
          </tr>`).join('')}
          <!-- Subtotal -->
          <tr style="border-top:2px solid #E8E5DC;">
            <td style="padding:10px 16px;font-size:13px;color:#7A7870;">Subtotal</td>
            <td style="padding:10px 16px;font-size:13px;color:#7A7870;text-align:right;">${formatINR(inv.subtotal)}</td>
          </tr>
          <!-- GST -->
          <tr>
            <td style="padding:10px 16px;font-size:13px;color:#7A7870;">GST (18%)</td>
            <td style="padding:10px 16px;font-size:13px;color:#7A7870;text-align:right;">+ ${formatINR(inv.gstAmount)}</td>
          </tr>
          ${discount > 0 ? `
          <tr>
            <td style="padding:10px 16px;font-size:13px;color:#16A34A;">Discount (${inv.discountCode})</td>
            <td style="padding:10px 16px;font-size:13px;color:#16A34A;text-align:right;">− ${formatINR(discount)}</td>
          </tr>` : ''}
          <!-- Total -->
          <tr style="background:#1A1917;">
            <td style="padding:14px 16px;font-size:16px;font-weight:700;color:#ffffff;">Total Payable</td>
            <td style="padding:14px 16px;font-size:18px;font-weight:700;color:#ffffff;text-align:right;">${formatINR(finalTotal)}</td>
          </tr>
        </table>
      </td>
    </tr>
    ${inv.notes ? `
    <tr>
      <td style="padding:0 40px 24px;">
        <div style="background:#F7F6F2;border-radius:10px;padding:14px 16px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#7A7870;margin-bottom:6px;">Notes</div>
          <div style="font-size:13px;color:#1A1917;">${inv.notes}</div>
        </div>
      </td>
    </tr>` : ''}
    <!-- CTA -->
    ${!isAdmin ? `
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <a href="${payLink}" style="display:inline-block;background:#1A1917;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:600;">Pay Now →</a>
        <div style="margin-top:12px;font-size:12px;color:#7A7870;">UPI ID: <strong style="color:#1A1917;">crearelabs@ptaxis</strong></div>
      </td>
    </tr>` : `
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <div style="font-size:13px;color:#7A7870;">Payment link: <a href="${payLink}" style="color:#1A1917;">${payLink}</a></div>
      </td>
    </tr>`}
    <!-- Footer -->
    <tr>
      <td style="background:#F7F6F2;padding:20px 40px;border-top:1px solid #E8E5DC;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#7A7870;">Crearelabs Creative Studio</td>
            <td align="right" style="font-size:12px;color:#7A7870;"><a href="mailto:sanjaykumar50400@gmail.com" style="color:#7A7870;">sanjaykumar50400@gmail.com</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function sendInvoiceEmails(inv: Invoice) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const payLink = `${baseUrl}/pay/${inv.id}`;
  const finalTotal = inv.finalTotal ?? inv.total;
  const subject = `Invoice from Crearelabs — ${inv.title} — ₹${finalTotal.toLocaleString('en-IN')}`;

  const clientHtml = buildInvoiceHTML(inv, false);
  const adminHtml = buildInvoiceHTML(inv, true);

  const promises = [];

  // Send to client
  if (inv.clientEmail) {
    promises.push(transporter.sendMail({
      from: `"Crearelabs" <${process.env.GMAIL_USER}>`,
      to: inv.clientEmail,
      subject,
      html: clientHtml,
    }));
  }

  // Always send copy to admin
  promises.push(transporter.sendMail({
    from: `"Crearelabs Invoice System" <${process.env.GMAIL_USER}>`,
    to: 'sanjaykumar50400@gmail.com',
    subject: `[Admin Copy] ${subject}`,
    html: adminHtml,
  }));

  await Promise.all(promises);
}
