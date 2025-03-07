import { getEmailUser, getSmtpTransporter } from './config';

// Send an email
export const sendEmail = async (
  to: string,
  subject: string,
  body: string,
  from?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Get the current user's email if from is not provided
    if (!from) {
      from = await getEmailUser();
    }
    
    console.log(`Preparing to send email from ${from} to ${to}`);
    
    // Get a transporter with the current user's email
    const transporter = await getSmtpTransporter();
    
    if (!transporter) {
      console.error('Failed to get SMTP transporter');
      return {
        success: false,
        error: 'Failed to initialize email transport',
      };
    }
    
    console.log('SMTP transporter initialized, sending email...');
    
    // For AWS WorkMail, we need to explicitly add the Bcc field with the sender's email
    // This is a common technique to ensure a copy is saved to the Sent Items folder
    const mailOptions = {
      from,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'), // Simple HTML conversion for line breaks
      envelope: {
        from,
        to
      },
      // Add the sender as BCC to ensure a copy is saved to Sent Items
      // This is a workaround for AWS WorkMail
      bcc: from,
      // Add headers to help with tracking and reduce spam likelihood
      headers: {
        'X-Priority': '3', // Changed from 1 to 3 (normal priority - high priority can trigger spam filters)
        'X-MSMail-Priority': 'Normal', // Changed from High to Normal
        'Importance': 'normal', // Changed from high to normal
        'X-Mailer': 'WeRoofAmerica-Mailer', // Identify the mailer
        'X-Company': 'We Roof America', // Company identifier
        'List-Unsubscribe': '<mailto:unsubscribe@weroofamerica.com>', // Helps with spam prevention
        'Precedence': 'bulk' // Standard header for bulk mail
      }
    };
    
    console.log('Sending email with options:', JSON.stringify({
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      bcc: mailOptions.bcc
    }));

    const result = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully with messageId: ${result?.messageId || 'unknown'}`);
    
    return {
      success: true,
      messageId: result?.messageId || 'unknown',
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}; 