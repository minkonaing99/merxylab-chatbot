require('dotenv').config();

async function subscribePageToApp() {
  const pageId = process.env.PAGE_ID;
  const token = process.env.PAGE_ACCESS_TOKEN;

  if (!pageId || !token) {
    console.error('Missing PAGE_ID or PAGE_ACCESS_TOKEN in .env');
    process.exit(1);
  }

  const url = new URL(`https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`);
  url.searchParams.set('access_token', token);
  url.searchParams.set('subscribed_fields', 'messages,messaging_postbacks');

  const response = await fetch(url.toString(), { method: 'POST' });
  const data = await response.json();

  if (data.success) {
    console.log('Page successfully subscribed to app.');
  } else {
    console.error('Subscription failed:', JSON.stringify(data, null, 2));
  }
}

subscribePageToApp();
