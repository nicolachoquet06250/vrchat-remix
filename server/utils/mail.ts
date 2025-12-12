import nodemailer from 'nodemailer'

type MailEnv = {
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_USER?: string
  SMTP_PASS?: string
  SMTP_SECURE?: string
  MAIL_FROM?: string
  APP_NAME?: string
  APP_URL?: string
}

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  const env: MailEnv = process.env as any
  const host = env.SMTP_HOST
  const port = Number(env.SMTP_PORT || 587)
  const user = env.SMTP_USER
  const pass = env.SMTP_PASS
  const secure = String(env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465

  if (!host || !port || !user || !pass) {
    // Lazy no-op transporter to avoid breaking the app if SMTP isn't configured in local dev
    transporter = {
      // minimal no-op sendMail implementation
      sendMail: async () => ({
        accepted: [],
        rejected: [],
        response: 'NOOP: SMTP not configured',
        envelope: { from: env.MAIL_FROM || 'no-reply@example.com', to: [] },
        messageId: 'noop'
      })
    } as any
    return transporter
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
  return transporter
}

export async function sendSignupConfirmation(to: string, username?: string) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRChat Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const subject = `Bienvenue sur ${appName} !`
  const text = [
    `Bonjour ${username || ''}`.trim(),
    '',
    `Votre inscription sur ${appName} est confirmée.`,
    `Vous pouvez maintenant vous connecter et profiter de l'application.`,
    '',
    `Accéder à ${appName} : ${appUrl}`,
  ].join('\n')
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height:1.5; color:#111">
      <img src="${logoUrl}" alt="${appName} logo" style="display:block;height:95px" />
      <h2 style="margin:0 0 12px;text-align:left">Bienvenue sur ${appName} !</h2>
      <p>Bonjour ${username || ''},</p>
      <p>Votre inscription est confirmée. Vous pouvez maintenant vous connecter et profiter de l'application.</p>
      <p>
        <a href="${appUrl}" style="display:inline-block;background:#2b59c3;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Ouvrir ${appName}</a>
      </p>
      <p style="color:#666">Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e‑mail.</p>
    </div>
  `

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}
