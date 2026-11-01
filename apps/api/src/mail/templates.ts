const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function passwordResetEmail(opts: { name: string; link: string; minutes: number }) {
  const first = esc(opts.name.split(' ')[0] || 'there');
  const link = esc(opts.link);
  const html = `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#047857;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:800">Lisan <span style="font-weight:400;color:#a7f3d0;font-size:14px">· ልሳን English Tutor</span></td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 12px;font-size:16px">Hi ${first},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">We received a request to reset the password for your Lisan account. Click the button below to choose a new password. This link expires in <b>${opts.minutes} minutes</b> and can be used once.</p>
          <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:12px">Reset my password</a></p>
          <p style="margin:0 0 6px;font-size:13px;color:#64748b">Or paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${link}" style="color:#047857">${link}</a></p>
          <p style="margin:0 0 6px;font-size:14px;color:#334155">የይለፍ ቃልዎን ለመቀየር ከላይ ያለውን ቁልፍ ይጫኑ። ይህን ጥያቄ ካላቀረቡ ይህን ኢሜይል ችላ ይበሉ።</p>
          <p style="margin:20px 0 0;font-size:13px;color:#94a3b8">If you didn't ask for this, you can safely ignore this email — your password won't change.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const text = `Hi ${opts.name.split(' ')[0] || 'there'},

We received a request to reset the password for your Lisan account.
Open this link to choose a new password (valid for ${opts.minutes} minutes, single use):

${opts.link}

If you didn't ask for this, you can ignore this email — your password won't change.`;
  return { subject: 'Reset your Lisan password', html, text };
}
