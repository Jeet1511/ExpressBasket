const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000,   // 30 seconds
    socketTimeout: 60000      // 60 seconds
});

// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.error('Email service error:', error);
    } else {
        console.log('✅ Email service ready');
    }
});

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
    // Use production URL or fallback to localhost for development
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request - Express Basket',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🛒 Express Basket</h1>
                        <p>Password Reset Request</p>
                    </div>
                    <div class="content">
                        <p>Hello <strong>${userName}</strong>,</p>
                        
                        <p>You requested to reset your password. Click the button below to proceed:</p>
                        
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </div>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all;">
                            ${resetUrl}
                        </p>
                        
                        <div class="warning">
                            <strong>⚠️ Important:</strong>
                            <ul>
                                <li>This link will expire in <strong>1 hour</strong></li>
                                <li>If you didn't request this, please ignore this email</li>
                                <li>Your password won't change until you create a new one</li>
                            </ul>
                        </div>
                        
                        <p>Best regards,<br><strong>Express Basket Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply.</p>
                        <p>&copy; 2025 Express Basket. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        console.log('📧 Attempting to send password reset email to:', email);
        console.log('📧 Using email service:', process.env.EMAIL_USER);
        console.log('📧 Reset URL:', resetUrl);

        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Response:', info.response);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email send error:', error);
        console.error('Error details:', {
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
        });

        // Provide more specific error messages
        let errorMessage = 'Failed to send email. ';

        if (error.code === 'EAUTH') {
            errorMessage += 'Email authentication failed. Please check your email credentials.';
            console.error('💡 Tip: Make sure you are using an App Password for Gmail, not your regular password.');
            console.error('💡 Generate one at: https://myaccount.google.com/apppasswords');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
            errorMessage += 'Connection timeout. Please check your internet connection.';
        } else if (error.code === 'ECONNECTION') {
            errorMessage += 'Cannot connect to email server. Please try again later.';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }

        return { success: false, error: errorMessage, details: error.message };
    }
};

module.exports = {
    sendPasswordResetEmail
};
