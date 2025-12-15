import nodemailer from 'nodemailer'
import {render} from '@vue-email/render';
import SignupConfirmed from '~~/app/mails/SignupConfirmed.vue'
import Verification from '~~/app/mails/Verification.vue'
import NewProjectAlert from '~~/app/mails/NewProjectAlert.vue'
import PasswordReset from '~~/app/mails/PasswordReset.vue'

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
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const subject = `Bienvenue sur ${appName} !`
  const html = await render(SignupConfirmed, {
    appUrl, username,
    logoUrl, appName
  }, {
    pretty: true,
  });
  const text = await render(SignupConfirmed, {
    appUrl, username,
    appName
  }, {
    plainText: true,
  });

  // const html = buildSignupConfirmedHtml({ appName, appUrl, logoUrl, username })
  // const text = buildSignupConfirmedText({ appName, appUrl, username })

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

export async function sendVerificationEmail(to: string, token: string, username?: string) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const verifyUrl = `${appUrl}/api/auth/verify?token=${encodeURIComponent(token)}`

  const subject = `${appName} – Vérifiez votre adresse e‑mail`
  const html = await render(Verification, {
    appUrl, username,
    logoUrl, verifyUrl,
    appName
  }, {
    pretty: true,
  });
  const text = await render(Verification, {
    appUrl, username,
    verifyUrl, appName
  }, {
    plainText: true,
  });
  // const html = buildVerificationHtml({ appName, appUrl, logoUrl, username, verifyUrl })
  // const text = buildVerificationText({ appName, appUrl, username, verifyUrl })

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

export async function sendNewProjectAlert(to: string, params: { projectId: number, projectName: string, query: string, type: 'project'|'tag' }) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const projectUrl = `${appUrl}/projects/${params.projectId}`
  const subject = `${appName} – Nouveau projet correspondant à votre alerte`
  const html = await render(NewProjectAlert, {
    appUrl,
    logoUrl,
    appName,
    projectUrl,
    projectName: params.projectName,
    query: params.query,
    type: params.type,
  }, { pretty: true })
  const text = await render(NewProjectAlert, {
    appUrl,
    appName,
    projectUrl,
    projectName: params.projectName,
    query: params.query,
    type: params.type,
  }, { plainText: true })

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

export async function sendVerifiedConfirmation(to: string, username?: string) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const subject = `${appName} – Votre e‑mail est vérifié`
  const html = await render(SignupConfirmed, {
    appUrl, username,
    logoUrl, appName
  }, {
    pretty: true,
  });
  const text = await render(SignupConfirmed, {
    appUrl, username,
    appName
  }, {
    plainText: true,
  });

  // const html = buildEmailVerifiedHtml({ appName, appUrl, logoUrl, username })
  // const text = buildEmailVerifiedText({ appName, appUrl, username })

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

export async function sendPasswordResetEmail(to: string, token: string, username?: string) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`

  const subject = `${appName} – Réinitialisation de votre mot de passe`
  const html = await render(PasswordReset, {
    appUrl, username,
    logoUrl, resetUrl,
    appName
  }, { pretty: true })
  const text = await render(PasswordReset, {
    appUrl, username,
    resetUrl, appName
  }, { plainText: true })

  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}
