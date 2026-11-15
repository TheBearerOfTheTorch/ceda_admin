import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailSendResult {
  sent: boolean;
  provider: string;
  info: string;
}

export interface SystemEmailParams {
  toEmail: string;
  recipientName?: string;
  subject: string;
  title: string;
  message: string;
  badge?: string;
  badgeTone?: 'blue' | 'green' | 'amber' | 'rose' | 'purple';
  actionUrl?: string;
  actionText?: string;
  details?: Record<string, any>;
  customHtml?: string;
}

let cachedTransporter: Transporter | null = null;
let cachedTransportKey = '';

function getSmtpTransporter(): {
  transporter: Transporter | null;
  fromHeader: string;
} {
  const host = process.env.EMAIL_HOST?.trim();
  const port = Number(process.env.EMAIL_PORT || 465);
  const sender = process.env.EMAIL_SENDER?.trim();
  const password = process.env.EMAIL_PASSWORD;
  const senderName = process.env.EMAIL_NAME?.trim() || 'CEDA Workspace';
  const encryption = (process.env.EMAIL_ENCRYPTION || 'ssl').trim().toLowerCase();
  const useAuth = (process.env.EMAIL_AUTH || 'true').trim().toLowerCase() !== 'false';

  const fromHeader = sender ? `${senderName} <${sender}>` : `${senderName} <noreply@betoai.org>`;

  if (!host || !sender || (useAuth && !password)) {
    return { transporter: null, fromHeader };
  }

  const key = `${host}|${port}|${sender}|${encryption}|${useAuth}`;
  if (!cachedTransporter || cachedTransportKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: encryption === 'ssl' || port === 465,
      auth: useAuth ? { user: sender, pass: password } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });
    cachedTransportKey = key;
  }

  return { transporter: cachedTransporter, fromHeader };
}

function escapeHtml(val: any): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badgeColors(tone: SystemEmailParams['badgeTone']): { bg: string; text: string; border: string } {
  switch (tone) {
    case 'green':
      return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
    case 'amber':
      return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
    case 'rose':
      return { bg: '#ffe4e6', text: '#9f1239', border: '#fda4af' };
    case 'purple':
      return { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' };
    default:
      return { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' };
  }
}

function wrapEmailShell(params: {
  headerAccent?: string;
  eyebrow: string;
  title: string;
  badge?: string;
  badgeTone?: SystemEmailParams['badgeTone'];
  bodyHtml: string;
  actionUrl?: string;
  actionText?: string;
  footerNote?: string;
}): string {
  const accent = params.headerAccent || '#006194';
  const badgeStyle = badgeColors(params.badgeTone);

  const buttonHtml = params.actionUrl
    ? `<div style="margin:26px 0 12px 0;text-align:center;">
        <a href="${escapeHtml(params.actionUrl)}" style="background-color:${accent};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:13px;display:inline-block;">
          ${escapeHtml(params.actionText || 'Open CEDA Workspace')} &rarr;
        </a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 6px 20px rgba(15,23,42,0.06);">
      <div style="background:${accent};padding:22px 26px;color:#ffffff;">
        <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;opacity:0.9;">
          ${escapeHtml(params.eyebrow)}
        </div>
        <h1 style="margin:6px 0 0 0;font-size:19px;font-weight:800;line-height:1.3;">
          ${escapeHtml(params.title)}
        </h1>
      </div>
      <div style="padding:26px;color:#1e293b;font-size:14px;line-height:1.6;">
        ${
          params.badge
            ? `<div style="margin-bottom:16px;">
                <span style="display:inline-block;padding:4px 12px;font-size:11px;font-weight:800;letter-spacing:0.4px;border-radius:999px;background:${badgeStyle.bg};color:${badgeStyle.text};border:1px solid ${badgeStyle.border};">
                  ${escapeHtml(params.badge)}
                </span>
               </div>`
            : ''
        }
        ${params.bodyHtml}
        ${buttonHtml}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:26px 0 14px 0;" />
        <p style="font-size:11px;color:#64748b;margin:0;text-align:center;">
          ${escapeHtml(
            params.footerNote ||
              'Automated notification from CEDA Workspace (Citizen Economic Development Agency). Please do not reply directly to this address.'
          )}
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function renderDetailsTable(details?: Record<string, any>): string {
  if (!details || Object.keys(details).length === 0) return '';
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
    ${Object.entries(details)
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(
        ([k, v]) => `<tr>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0;width:38%;vertical-align:top;">${escapeHtml(k)}</td>
          <td style="padding:8px 12px;font-size:12px;color:#0f172a;border-bottom:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(v)}</td>
        </tr>`
      )
      .join('')}
  </table>`;
}

// ============================================================================
// Template 1: Submitter Stage Update & Approval Email
// ============================================================================
export function buildStageUpdateEmailTemplate(params: {
  recipientName: string;
  ideaTitle: string;
  ideaCode?: string;
  previousStage?: string;
  newStage: string;
  outcome: 'passed' | 'rejected' | 'docs_requested' | 'in_review';
  actorName?: string;
  actorRole?: string;
  notes?: string;
  portalUrl?: string;
  extraDetails?: Record<string, any>;
}): { subject: string; title: string; html: string; badge: string; badgeTone: SystemEmailParams['badgeTone'] } {
  const outcomeLabel =
    params.outcome === 'passed'
      ? 'APPROVED & ADVANCED'
      : params.outcome === 'rejected'
        ? 'NOT APPROVED AT GATE'
        : params.outcome === 'docs_requested'
          ? 'DOCUMENTS REQUESTED'
          : 'STAGE PROGRESS UPDATE';

  const badgeTone: SystemEmailParams['badgeTone'] =
    params.outcome === 'passed'
      ? 'green'
      : params.outcome === 'rejected'
        ? 'rose'
        : params.outcome === 'docs_requested'
          ? 'amber'
          : 'blue';

  const headerAccent =
    params.outcome === 'passed'
      ? '#047857'
      : params.outcome === 'rejected'
        ? '#be123c'
        : '#006194';

  const subject = `CEDA Stage Update [${outcomeLabel}]: "${params.ideaTitle}" -> ${params.newStage}`;
  const title = `Lifecycle Update: ${params.newStage}`;

  const stageTrackerHtml = `
    <div style="margin:16px 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:#64748b;margin-bottom:6px;">
        Pipeline Stage Transition
      </div>
      <div style="font-size:13px;font-weight:700;color:#0f172a;">
        ${params.previousStage ? `<span style="color:#64748b;">${escapeHtml(params.previousStage)}</span> &nbsp;&rarr;&nbsp; ` : ''}
        <span style="color:${headerAccent};">${escapeHtml(params.newStage)}</span>
      </div>
    </div>
  `;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Dumela <strong>${escapeHtml(params.recipientName || 'Citizen Innovator')}</strong>,</p>
    <p style="margin:0 0 12px 0;color:#334155;">
      Your innovation proposal <strong>"${escapeHtml(params.ideaTitle)}"</strong>${params.ideaCode ? ` (<code>${escapeHtml(params.ideaCode)}</code>)` : ''} has received an official stage update inside <strong>CEDA Workspace</strong>.
    </p>
    ${stageTrackerHtml}
    ${
      params.notes
        ? `<div style="margin:14px 0;padding:12px 14px;background:#f0f9ff;border-left:4px solid ${headerAccent};border-radius:6px;font-size:13px;color:#1e293b;">
            <strong style="display:block;font-size:11px;text-transform:uppercase;color:#0369a1;margin-bottom:4px;">Official Gate Remarks</strong>
            ${escapeHtml(params.notes)}
           </div>`
        : ''
    }
    ${renderDetailsTable({
      'Proposal Title': params.ideaTitle,
      ...(params.ideaCode ? { 'Reference Code': params.ideaCode } : {}),
      'Current Stage': params.newStage,
      'Gate Outcome': outcomeLabel,
      ...(params.actorName ? { 'Reviewed By': `${params.actorName}${params.actorRole ? ` (${params.actorRole})` : ''}` } : {}),
      ...(params.extraDetails || {}),
    })}
  `;

  return {
    subject,
    title,
    badge: outcomeLabel,
    badgeTone,
    html: wrapEmailShell({
      headerAccent,
      eyebrow: 'CEDA Innovation Canvas • Submitter Lifecycle Alert',
      title,
      badge: outcomeLabel,
      badgeTone,
      bodyHtml,
      actionUrl: params.portalUrl,
      actionText: 'Inspect Live Stage Dossier',
    }),
  };
}

// ============================================================================
// Template 2: Admin Account Creation & Activation Email
// ============================================================================
export function buildAccountCreatedEmailTemplate(params: {
  recipientName: string;
  email: string;
  role: string;
  department?: string;
  temporaryPassword?: string;
  invitedByName?: string;
  inviteUrl: string;
}): { subject: string; title: string; html: string } {
  const title = `Welcome to CEDA Workspace (${params.role})`;
  const subject = `Your CEDA Workspace Account is Ready — Role: ${params.role}`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Dumela <strong>${escapeHtml(params.recipientName || 'Colleague')}</strong>,</p>
    <p style="margin:0 0 12px 0;color:#334155;">
      ${escapeHtml(params.invitedByName || 'A CEDA Administrator')} has created your official <strong>CEDA Workspace</strong> account so you can access pipelines, dossiers, and real-time review boards.
    </p>
    ${renderDetailsTable({
      'Sign-In Email': params.email,
      'Assigned Role': params.role,
      Department: params.department || 'General',
      ...(params.temporaryPassword ? { 'Temporary Password': params.temporaryPassword } : {}),
    })}
    <p style="margin:16px 0 0 0;font-size:12.5px;color:#475569;">
      Click the button below to accept your invitation, confirm your credentials, and launch your workspace.
    </p>
    <p style="margin:8px 0 0 0;font-size:11px;color:#64748b;word-break:break-all;">
      Direct activation link: ${escapeHtml(params.inviteUrl)}
    </p>
  `;

  return {
    subject,
    title,
    html: wrapEmailShell({
      headerAccent: '#006194',
      eyebrow: 'CEDA Workspace • Account Provisioning',
      title,
      badge: `OFFICIAL ACCOUNT • ${params.role.toUpperCase()}`,
      badgeTone: 'blue',
      bodyHtml,
      actionUrl: params.inviteUrl,
      actionText: 'Activate Account & Sign In',
    }),
  };
}

// ============================================================================
// Template 3: Collaborator Workspace Invite Email
// ============================================================================
export function buildCollaboratorInviteEmailTemplate(params: {
  recipientName?: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}): { subject: string; title: string; html: string } {
  const title = `Collaboration Invite: "${params.workspaceName}"`;
  const subject = `${params.inviterName} invited you to collaborate on "${params.workspaceName}"`;

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Dumela <strong>${escapeHtml(params.recipientName || 'Teammate')}</strong>,</p>
    <p style="margin:0 0 12px 0;color:#334155;">
      <strong>${escapeHtml(params.inviterName)}</strong> invited you to collaborate live on the shared CEDA canvas workspace <strong>"${escapeHtml(params.workspaceName)}"</strong>.
    </p>
    ${renderDetailsTable({
      'Shared Workspace': params.workspaceName,
      'Invited By': params.inviterName,
      'Access Level': 'Live Canvas Collaborator',
      Capabilities: 'Real-time cursor presence, board edits & idea routing',
    })}
    <p style="margin:14px 0 0 0;font-size:12px;color:#64748b;word-break:break-all;">
      Or open directly: ${escapeHtml(params.inviteUrl)}
    </p>
  `;

  return {
    subject,
    title,
    badge: 'WORKSPACE COLLABORATION INVITE',
    badgeTone: 'purple',
    html: wrapEmailShell({
      headerAccent: '#4f46e5',
      eyebrow: 'CEDA Workspace • Live Multi-User Canvas',
      title,
      badge: 'COLLABORATION INVITE',
      badgeTone: 'purple',
      bodyHtml,
      actionUrl: params.inviteUrl,
      actionText: 'Open Shared Workspace',
    }),
  } as any;
}

// ============================================================================
// Template 4: User Account Deleted / Access Revoked Email
// ============================================================================
export function buildAccountDeletedEmailTemplate(params: {
  recipientName: string;
  email: string;
  role?: string;
  removedByName?: string;
}): { subject: string; title: string; html: string } {
  const title = 'CEDA Workspace Account Removed';
  const subject = 'Notice: Your CEDA Workspace Account Has Been Removed';

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">Hello <strong>${escapeHtml(params.recipientName || params.email)}</strong>,</p>
    <p style="margin:0 0 12px 0;color:#334155;">
      This is an automated governance notice confirming that your user account and associated workspace access have been removed from <strong>CEDA Workspace</strong>.
    </p>
    ${renderDetailsTable({
      'Account Email': params.email,
      ...(params.role ? { 'Previous Role': params.role } : {}),
      'Action Performed': 'Account & Workspace Access Deleted',
      ...(params.removedByName ? { 'Removed By': params.removedByName } : {}),
      Timestamp: new Date().toUTCString(),
    })}
    <p style="margin:16px 0 0 0;font-size:12.5px;color:#475569;">
      If you believe this removal was performed in error or require renewed access, please contact your CEDA System Administrator directly.
    </p>
  `;

  return {
    subject,
    title,
    html: wrapEmailShell({
      headerAccent: '#be123c',
      eyebrow: 'CEDA Workspace • Account Governance & Security',
      title,
      badge: 'ACCOUNT ACCESS REMOVED',
      badgeTone: 'rose',
      bodyHtml,
    }),
  };
}

// ============================================================================
// Central Email Dispatcher (Primary: .env SMTP via Nodemailer, fallback Resend/Log)
// ============================================================================
export async function sendSystemEmail(params: SystemEmailParams): Promise<EmailSendResult> {
  const detailsHtml = renderDetailsTable(params.details);
  const html =
    params.customHtml ||
    wrapEmailShell({
      eyebrow: 'Citizen Economic Development Agency • CEDA Workspace',
      title: params.title,
      badge: params.badge,
      badgeTone: params.badgeTone,
      actionUrl: params.actionUrl,
      actionText: params.actionText,
      bodyHtml: `
        <p style="margin:0 0 14px 0;">Hello <strong>${escapeHtml(params.recipientName || 'Valued User')}</strong>,</p>
        <p style="margin:0 0 14px 0;color:#334155;">${escapeHtml(params.message)}</p>
        ${detailsHtml}
      `,
    });

  // 1. Primary: .env SMTP transport via Nodemailer
  const { transporter, fromHeader } = getSmtpTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromHeader,
        to: params.toEmail,
        subject: params.subject,
        html,
      });
      return {
        sent: true,
        provider: 'smtp',
        info: `Email delivered to ${params.toEmail} via SMTP (${process.env.EMAIL_HOST}).`,
      };
    } catch (smtpErr: any) {
      console.warn(`SMTP sendMail error for ${params.toEmail}:`, smtpErr?.message || smtpErr);
    }
  }

  // 2. Secondary fallback: Resend API if configured
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || fromHeader,
          to: [params.toEmail],
          subject: params.subject,
          html,
        }),
      });
      if (resp.ok) {
        return { sent: true, provider: 'resend', info: `Notification sent to ${params.toEmail} via Resend.` };
      }
    } catch (err: any) {
      console.warn('Resend email dispatch error:', err?.message || err);
    }
  }

  // 3. Final fallback: server console log
  console.log(
    `\n[CEDA SYSTEM EMAIL FALLBACK] To: ${params.toEmail} | Subject: ${params.subject}\nTitle: ${params.title}\nMessage: ${params.message}\nAction: ${params.actionUrl || 'None'}\n`
  );
  return {
    sent: false,
    provider: 'local_server_log',
    info: `Email prepared for ${params.toEmail}. Check SMTP credentials in .env.`,
  };
}
