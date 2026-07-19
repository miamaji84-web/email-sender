// .env ফাইল থেকে ডেটা লোড করার সিস্টেম
require('dotenv').config();

const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const nodemailer = require('nodemailer');

// নোড জেএস এই স্লাশ বা নিউলাইনগুলোকে অটোমেটিক ডিকোড করে নেবে
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

const firebaseConfig = {
  type: "service_account",
  project_id: "email-marketing-78e09",
  private_key_id: "01dbc322a0217bb2980b3a39e4bae1fcb8cd3365",
  private_key: privateKey,
  client_email: "firebase-adminsdk-fbsvc@email-marketing-78e09.iam.gserviceaccount.com",
  client_id: "109861383103145036638",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40email-marketing-78e09.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

initializeApp({
  credential: cert(firebaseConfig),
  databaseURL: "https://email-marketing-78e09-default-rtdb.firebaseio.com"
});

const db = getDatabase();
const emailsRef = db.ref('emails');

const RESEND_API_KEY = 're_KfxjYJKy_YvwTVxUdds24P5HEumq6o881';
const GMAIL_USER = 'sexteacher4674@gmail.com';
const GMAIL_APP_PASS = 'fhho jzcn srew lsuk';

let resendCount = 0; 

emailsRef.on('child_added', async (snapshot) => {
    const emailId = snapshot.key;
    const emailData = snapshot.val();

    if (emailData.status === 'pending') {
        console.log(`\n📬 নতুন ইমেইল পাওয়া গেছে! পাঠানো হচ্ছে: ${emailData.to}`);
        let success = false;

        if (resendCount < 100) {
            console.log("Resend ইঞ্জিন দিয়ে পাঠানোর চেষ্টা করা হচ্ছে...");
            success = await sendViaResend(emailData);
            if (success) {
                resendCount++;
                console.log(`Resend কাউন্টার: ${resendCount}/100`);
            }
        }
        
        if (!success) {
            console.log("জিমেইল (Gmail SMTP) ইঞ্জিন দিয়ে পাঠানোর চেষ্টা করা হচ্ছে...");
            success = await sendViaGmail(emailData);
        }

        if (success) {
            await emailsRef.child(emailId).update({ status: 'sent', sentAt: new Date().toISOString() });
            console.log(`✅ সফলভাবে মেইল চলে গেছে: ${emailData.to}`);
        } else {
            await emailsRef.child(emailId).update({ status: 'failed' });
            console.log(`❌ মেইল পাঠাতে ব্যর্থ হয়েছে: ${emailData.to}`);
        }
    }
});

async function sendViaResend(data) {
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: data.to,
                subject: data.subject,
                html: data.body
            })
        });
        return response.ok;
    } catch (error) {
        console.error("Resend ত্রুটি:", error.message);
        return false;
    }
}

async function sendViaGmail(data) {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }
        });

        await transporter.sendMail({
            from: GMAIL_USER,
            to: data.to,
            subject: data.subject,
            html: data.body
        });
        return true;
    } catch (error) {
        console.error("Gmail SMTP ত্রুটি:", error.message);
        return false;
    }
}

console.log("🚀 ইমেইল ইঞ্জিন ব্যাকগ্রাউন্ডে সফলভাবে চালু হয়েছে...");
console.log("📡 ফায়ারবেজ ডাটাবেজের জন্য অপেক্ষা করা হচ্ছে (emails নোড)...");