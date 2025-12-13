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
  const html = buildSignupConfirmedHtml({ appName, appUrl, logoUrl, username })
  const text = buildSignupConfirmedText({ appName, appUrl, username })

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

export async function sendVerificationEmail(to: string, token: string, username?: string) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRChat Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const verifyUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(token)}`

  const subject = `${appName} – Vérifiez votre adresse e‑mail`
  const html = buildVerificationHtml({ appName, appUrl, logoUrl, username, verifyUrl })
  const text = buildVerificationText({ appName, appUrl, username, verifyUrl })

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

export async function sendVerifiedConfirmation(to: string, username?: string) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRChat Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const subject = `${appName} – Votre e‑mail est vérifié`
  const html = buildEmailVerifiedHtml({ appName, appUrl, logoUrl, username })
  const text = buildEmailVerifiedText({ appName, appUrl, username })

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

// ----------- Générateurs HTML & texte (strings) -----------

type CommonProps = { appName: string; appUrl: string; logoUrl?: string; username?: string }
type VerifyProps = CommonProps & { verifyUrl: string }

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function baseLayout(content: string, props: CommonProps) {
  const logoImg = props.logoUrl
    ? `<img src="${esc(props.logoUrl)}" alt="${esc(props.appName)} logo" style="display:block;height:95px;margin:0 0 8px;"/>`
    : ''
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(props.appName)}</title>
  </head>
  <body style="background:#ffffff;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;">
    <div style="max-width:560px;margin:0 auto;">
      ${logoImg}
      ${content}
    </div>
  </body>
</html>`
}

function button(href: string, text: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#2b59c3;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">${esc(text)}</a>`
}

function p(text: string, extraStyle = '') {
  const style = `margin:${extraStyle || '0 0 12px'};`
  return `<p style="${style}">${esc(text)}</p>`
}

function link(href: string, text?: string) {
  return `<a href="${esc(href)}" style="color:#2b59c3;text-decoration:none;">${esc(text || href)}</a>`
}

function h2(text: string) {
  return `<h2 style="margin:0 0 12px;font-weight:600;font-size:22px;">${esc(text)}</h2>`
}

function buildVerificationHtml(props: VerifyProps) {
  const name = props.username ? `Bonjour ${props.username},` : 'Bonjour,'
  const content = [
    h2('Confirmez votre e‑mail'),
    p(name, '0 0 8px'),
    p(`Merci de votre inscription sur ${props.appName}. Pour activer votre compte, cliquez sur le bouton ci‑dessous :`),
    `<div style="margin:14px 0">${button(props.verifyUrl, 'Vérifier mon e‑mail')}</div>`,
    `<p style="margin:16px 0 0;color:#666">Ce lien expirera dans 48 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e‑mail.</p>`,
    `<p style="margin:16px 0 0;color:#666">Accéder à ${esc(props.appName)} : ${link(props.appUrl)}</p>`,
  ].join('')
  return baseLayout(content, props)
}

function buildVerificationText(props: VerifyProps) {
  const name = props.username ? `Bonjour ${props.username},` : 'Bonjour,'
  return [
    'Confirmez votre e‑mail',
    '',
    name,
    `Merci de votre inscription sur ${props.appName}. Pour activer votre compte, ouvrez ce lien :`,
    props.verifyUrl,
    '',
    `Accéder à ${props.appName} : ${props.appUrl}`,
    '',
    `Ce lien expirera dans 48 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e‑mail.`,
  ].join('\n')
}

function buildSignupConfirmedHtml(props: CommonProps) {
  const name = props.username ? `Bonjour ${props.username},` : 'Bonjour,'
  const content = [
    h2(`Bienvenue sur ${props.appName} !`),
    p(name, '0 0 8px'),
    p('Votre adresse e‑mail a été vérifiée. Votre compte est maintenant actif.'),
    `<div style="margin:14px 0">${button(`${props.appUrl}/login`, 'Se connecter')}</div>`,
    `<p style="margin:16px 0 0;color:#666">Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e‑mail.</p>`,
  ].join('')
  return baseLayout(content, props)
}

function buildSignupConfirmedText(props: CommonProps) {
  const name = props.username ? `Bonjour ${props.username},` : 'Bonjour,'
  return [
    `Bienvenue sur ${props.appName} !`,
    '',
    name,
    'Votre adresse e‑mail a été vérifiée. Votre compte est maintenant actif.',
    `Connectez‑vous ici : ${props.appUrl}/login`,
  ].join('\n')
}

function buildEmailVerifiedHtml(props: CommonProps) {
  // Identique à signup confirmé (utilisé après vérification)
  return buildSignupConfirmedHtml(props)
}

function buildEmailVerifiedText(props: CommonProps) {
  return buildSignupConfirmedText(props)
}
