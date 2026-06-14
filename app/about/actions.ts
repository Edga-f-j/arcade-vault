'use server'

import { Resend } from 'resend'

interface ContactForm {
  name: string
  email: string
  msg: string
}

type SendResult =
  | { ok: true; name: string }
  | { ok: false; error: string }

export async function sendContact(form: ContactForm): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const contactEmail = process.env.CONTACT_EMAIL

  if (!apiKey || !contactEmail) {
    return { ok: false, error: 'Missing server configuration. Contact the administrator.' }
  }

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: 'Arcade Vault <onboarding@resend.dev>',
      to: [contactEmail],
      subject: '[Arcade Vault] Nuevo mensaje de contacto',
      text: `Nombre: ${form.name}\nEmail: ${form.email}\n\nMensaje:\n${form.msg}`,
    })
    return { ok: true, name: form.name }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}
