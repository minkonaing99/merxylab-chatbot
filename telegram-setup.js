require('dotenv').config();

async function registerTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.argv[2];

  if (!token || !baseUrl) {
    console.error('Usage: node telegram-setup.js https://your-app.onrender.com');
    process.exit(1);
  }

  const webhookUrl = `${baseUrl}/telegram`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl })
  });
  const data = await res.json();

  if (data.ok) {
    console.log('Telegram webhook registered:', webhookUrl);
  } else {
    console.error('Registration failed:', JSON.stringify(data, null, 2));
  }
}

registerTelegramWebhook();
