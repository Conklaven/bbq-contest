export interface WelcomeEmailData {
  teamName: string;
  teamEmail: string;
  categories: string[];
  loginUrl: string;
}

export class EmailService {
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    try {
      const { teamName, teamEmail, loginUrl } = data;

      const subject = `Welcome to the BBQ Contest - ${teamName}`;

      // Note: Firebase Admin SDK doesn't directly support sending custom emails
      // In a production environment, you would integrate with a service like SendGrid, Mailgun, or AWS SES
      // For now, we'll log the email content for development purposes
      console.log('Welcome email would be sent to:', teamEmail);
      console.log('Subject:', subject);
      console.log('Login URL:', loginUrl);

      // TODO: Integrate with email service provider
      // Example with SendGrid:
      // await sendGrid.send({
      //   to: teamEmail,
      //   from: 'noreply@bbqcontest.com',
      //   subject: subject,
      //   html: htmlContent,
      //   text: textContent,
      // });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error to prevent team creation from failing
      // Just log it for debugging
    }
  }
}
