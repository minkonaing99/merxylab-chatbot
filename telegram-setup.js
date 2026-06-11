require('dotenv').config();

async function registerTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.argv[2];

  if (!token || !baseUrl) {
    console.error('Usage: node telegram-setup.js https://your-app.onrender.com');
    process.exit(1);
  }

  const webhookUrl = `${baseUrl}/telegram`;
  const secret = process.env.APP_SECRET;
  if (!secret) {
    console.error('Missing APP_SECRET in .env');
    process.exit(1);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: secret })
  });
  const data = await res.json();

  if (data.ok) {
    console.log('Telegram webhook registered:', webhookUrl);
  } else {
    console.error('Registration failed:', JSON.stringify(data, null, 2));
  }
}

registerTelegramWebhook();
