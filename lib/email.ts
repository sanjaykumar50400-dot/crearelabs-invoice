import { Resend } from 'resend';
import { Invoice } from './store';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    <tr>
      <td style="background:#1A1917;padding:32px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.02em;">Crearelabs</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:4px;">Creative Studio</div>
            </td>
            <td align="right">
              <div style="color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Invoice</div>
              <div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:4px;">#${inv.id.slice(-8).toUpperCase()}</div>
              <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px;">${new Date(inv.created).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:20px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7A7870;margin-bottom:6px;">Billed To</div>
              <div style="font-size:16px;font-weight:600;">${inv.clientName || '—'}</div>
              ${inv.clientEmail ? `<div style="color:#7A7870;font-size:13px;margin-top:2px;">${inv.clientEmail}</div>` : ''}
              ${inv.clientPhone ? `<div style="color:#7A7870;font-size:13px;">${inv.clientPhone}</div>` : ''}
              ${inv.clientCompany ? `<div style="color:#7A7870;font-size:13px;">${inv.clientCompany}</div>` : ''}
              ${inv.clientGST ? `<div style="color:#7A7870;font-size:12px;font-family:monospace;">GST: ${inv.clientGST}</div>` : ''}
            </td>
            <td align="right" style="padding-bottom:20px;vertical-align:top;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7A7870;margin-bottom:6px;">Status</div>
              <span style="background:${inv.status === 'paid' ? '#D1FAE5' : '#FEF3C7'};color:${inv.status === 'paid' ? '#065F46' : '#92400E'};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;">${inv.status.toUpperCase()}</span>
            </td>
          </tr>
        </table>
        <div style="border-top:1px solid #E8E5DC;margin-bottom:24px;"></div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7A7870;margin-bottom:6px;">Project</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:24px;">${inv.title}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 24px;">
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
          <tr style="border-top:2px solid #E8E5DC;">
            <td style="padding:10px 16px;font-size:13px;color:#7A7870;">Subtotal</td>
            <td style="padding:10px 16px;font-size:13px;color:#7A7870;text-align:right;">${formatINR(inv.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;font-size:13px;color:#7A7870;">GST (18%)</td>
            <td style="padding:10px 16px;font-size:13px;color:#7A7870;text-align:right;">+ ${formatINR(inv.gstAmount)}</td>
          </tr>
          ${discount > 0 ? `
          <tr>
            <td style="padding:10px 16px;font-size:13px;color:#16A34A;">Discount (${inv.discountCode})</td>
            <td style="padding:10px 16px;font-size:13px;color:#16A34A;text-align:right;">− ${formatINR(discount)}</td>
          </tr>` : ''}
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
    <tr>
      <td style="background:#F7F6F2;padding:20px 40px;border-top:1px solid #E8E5DC;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#7A7870;">Crearelabs Creative Studio</td>
            <td align="right" style="font-size:12px;color:#7A7870;">sanjaykumar50400@gmail.com</td>
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
  const finalTotal = inv.finalTotal ?? inv.total;
  const subject = `Invoice from Crearelabs — ${inv.title} — ${formatINR(finalTotal)}`;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'invoices@crearelabs.in';

  const emails = [];

  // Send to client
  if (inv.clientEmail) {
    emails.push(
      resend.emails.send({
        from: `Crearelabs <${fromEmail}>`,
        to: [inv.clientEmail],
        subject,
        html: buildInvoiceHTML(inv, false),
      })
    );
  }

  // Always send admin copy
  emails.push(
    resend.emails.send({
      from: `Crearelabs Invoice System <${fromEmail}>`,
      to: ['sanjaykumar50400@gmail.com'],
      subject: `[Admin Copy] ${subject}`,
      html: buildInvoiceHTML(inv, true),
    })
  );

  const results = await Promise.allSettled(emails);
  
  // Log any failures
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Email ${i} failed:`, r.reason);
    }
  });

  // Throw if ALL failed
  if (results.every(r => r.status === 'rejected')) {
    throw new Error('All email sends failed');
  }
}
