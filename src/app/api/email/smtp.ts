import { smtpTransporter, EMAIL_USER } from './config';

// Send an email
export const sendEmail = async (
  to: string,
  subject: string,
  body: string,
  from = EMAIL_USER
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const result = await smtpTransporter.sendMail({
      from,
      to,
      subject,
      text: body,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}; 