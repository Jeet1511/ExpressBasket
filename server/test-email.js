// Test email configuration
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('📧 Testing Email Configuration...\n');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET');
console.log('');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email service connection FAILED:');
        console.error(error);
        process.exit(1);
    } else {
        console.log('✅ Email service connection successful!');
        console.log('');

        // Try sending a test email
        const testEmail = {
            from: process.env.EMAIL_USER,
            to: process.env.TEST_EMAIL || 'fantamking12341234@gmail.com', // Send to test email only
            subject: 'Test Email from Express Basket',
            html: `
                <h1>Test Email</h1>
                <p>If you receive this, your email configuration is working correctly!</p>
                <p>Time: ${new Date().toLocaleString()}</p>
            `
        };

        console.log('📧 Sending test email to:', process.env.TEST_EMAIL || 'fantamking12341234@gmail.com');

        transporter.sendMail(testEmail, (err, info) => {
            if (err) {
                console.error('❌ Test email FAILED:');
                console.error(err);
                process.exit(1);
            } else {
                console.log('✅ Test email sent successfully!');
                console.log('Message ID:', info.messageId);
                console.log('Response:', info.response);
                console.log('');
                console.log('🎉 Email configuration is working perfectly!');
                process.exit(0);
            }
        });
    }
});
