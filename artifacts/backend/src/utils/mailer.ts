import nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "fake-user@ethereal.email",
    pass: process.env.SMTP_PASS || "fake-pass",
  },
});

export const sendMail = async (options: MailOptions): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: `"Hamle SIS" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@hamlesis.edu.et"}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`Message sent: ${info.messageId}`);
    // If using ethereal email for testing, we can log the preview URL
    if (info.messageId && process.env.SMTP_HOST === "smtp.ethereal.email") {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    console.error("Error sending email: ", error);
    // Depending on requirements, we might not want to throw the error to prevent failing the entire request
    // if the email is just a nice-to-have. But for forgot password, it's critical.
    throw error;
  }
};
