import nodemailer from "nodemailer";

type ContactEmail = {
  name: string;
  email: string;
  message: string;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export async function sendContactEmail(data: ContactEmail) {
  const transport = getTransport();
  if (!transport || !process.env.SMTP_USER) {
    return { ok: false, error: "SMTP no configurado" };
  }

  await transport.sendMail({
    from: `"CRM Rosa Reina" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_ESCALATION_EMAIL || process.env.SMTP_USER,
    subject: `Nuevo contacto CRM Rosa Reina - ${data.name}`,
    html: `
      <h2>Nuevo contacto</h2>
      <p><strong>Nombre:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${data.message}</p>
    `,
  });

  return { ok: true };
}

export async function sendAdminEscalation(subject: string, body: string) {
  const transport = getTransport();
  if (!transport || !process.env.SMTP_USER) return { ok: false, error: "SMTP no configurado" };

  await transport.sendMail({
    from: `"CRM Rosa Reina" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_ESCALATION_EMAIL || process.env.SMTP_USER,
    subject: `[Rosa Reina] ${subject}`,
    text: body,
  });

  return { ok: true };
}
