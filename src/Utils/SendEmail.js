import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

export default async function sendEmail({ to, subject, text, html, replyTo }) {
  await transporter.sendMail({
    from: `"DenaPawna" <${process.env.SMTP_USER}>`,
    to,
    replyTo,
    subject,
    text,
    html,
  });
}