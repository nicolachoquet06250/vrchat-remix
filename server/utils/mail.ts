import nodemailer from 'nodemailer'
import {render} from '@vue-email/render';
import SignupConfirmed from '~~/app/mails/SignupConfirmed.vue'
import Verification from '~~/app/mails/Verification.vue'
import NewProjectAlert from '~~/app/mails/NewProjectAlert.vue'
import PasswordReset from '~~/app/mails/PasswordReset.vue'
import ProjectUpdate from "@/mails/ProjectUpdate.vue";

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

export async function sendProjectUpdatedEmail(to: string, params: { projectId: number, projectName: string, username: string }) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const logoUrl = `${appUrl}/vrchat-remix.png`

  const projectUrl = `${appUrl}/projects/${params.projectId}`
  const subject = `${appName} – ${params.projectName} a été mis à jour`
  const html = await render(ProjectUpdate, {
    appUrl, username: params.username,
    logoUrl, appName,
    projectName: params.projectName,
    projectId: params.projectId,
    projectUrl
  }, { pretty: true })
  const text = await render(ProjectUpdate, {
    appUrl, username: params.username, appName,
    projectName: params.projectName,
    projectId: params.projectId,
    projectUrl
  }, { plainText: true })
  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

// --- Moderation related mails (simple templates) ---
export async function sendProjectReportedEmail(to: string, params: { projectId: number, projectName: string, reporter: string, reason?: string }) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const projectUrl = `${appUrl}/projects/${params.projectId}`
  const subject = `${appName} – Projet signalé: ${params.projectName}`
  const text = `Un projet a été signalé.\n\nProjet: ${params.projectName} (#${params.projectId})\nLien: ${projectUrl}\nSignalé par: ${params.reporter}\nRaison: ${params.reason || 'non précisée'}`
  const html = `<!doctype html><html lang="fr"><body><p>Un projet a été signalé.</p><ul><li><b>Projet:</b> ${params.projectName} (#${params.projectId})</li><li><b>Lien:</b> <a href="${projectUrl}">${projectUrl}</a></li><li><b>Signalé par:</b> ${params.reporter}</li><li><b>Raison:</b> ${params.reason || 'non précisée'}</li></ul></body></html>`
  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

export async function sendProjectPrivateWarningEmail(to: string, params: { projectId: number, projectName: string, strikes: number }) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const projectUrl = `${appUrl}/projects/${params.projectId}`
  const subject = `${appName} – Avertissement: votre projet a été passé en privé (${params.strikes}/3)`
  const text = `Votre projet "${params.projectName}" a été passé en privé par la modération (${params.strikes}/3).\nA la troisième fois, il sera supprimé définitivement.\nLien: ${projectUrl}`
  const html = `<!doctype html><html lang="fr"><body><p>Votre projet <b>${params.projectName}</b> a été passé en privé par la modération (${params.strikes}/3).</p><p>A la troisième fois, il sera supprimé définitivement.</p><p><a href="${projectUrl}">Voir le projet</a></p></body></html>`
  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}

export async function sendProjectDeletedEmail(to: string, params: { projectId: number, projectName: string }) {
  const env: MailEnv = process.env as any
  const appName = env.APP_NAME || 'VRC Remix'
  const appUrl = env.APP_URL || 'http://localhost:3000'
  const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`
  const subject = `${appName} – Votre projet a été supprimé`
  const text = `Votre projet "${params.projectName}" (#${params.projectId}) a été supprimé définitivement suite à 3 mises en privé par la modération.`
  const html = `<!doctype html><html lang="fr"><body><p>Votre projet <b>${params.projectName}</b> (#${params.projectId}) a été supprimé définitivement suite à 3 mises en privé par la modération.</p></body></html>`
  const t = getTransporter()
  return t?.sendMail({ from, to, subject, text, html })
}
