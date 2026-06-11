require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { setCooldown } = require('./redis');

const client = new Anthropic();
const INACTIVITY_MS = 30 * 60 * 1000;
const SEP = '───────────────────────';

async function fetchCustomerName(psid) {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${psid}?fields=name`, {
      headers: { 'Authorization': `Bearer ${process.env.PAGE_ACCESS_TOKEN}` }
    });
    if (!res.ok) return 'Unknown';
    const data = await res.json();
    return data.name || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

async function generateSummary(transcript, customerName) {
  const lines = transcript
    .map(t => `${t.role === 'customer' ? 'Customer' : 'Bot'}: ${t.text}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: 'You summarize customer service conversations for admin review. Be factual and concise. English only.',
    messages: [{
      role: 'user',
      content: `Summarize this Messenger conversation between a customer and a MerxyLab bot.\n\nCustomer name: ${customerName}\nTranscript:\n${lines}\n\nReply in this exact format:\nAsked: <1-2 sentences on what customer wanted>\nProducts: <comma-separated list, or "None">\nResolved: <Yes / No / Partial>\nAction needed: <what admin must do, or "None">`
    }]
  });

  return response.content[0].text;
}

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text })
  });
  if (!res.ok) throw new Error(`Telegram API ${res.status}`);
}

async function sendTelegramWithRetry(text) {
  try {
    await sendTelegram(text);
  } catch (err) {
    console.error('Telegram send failed, retrying in 30s:', err.message);
    await new Promise(r => setTimeout(r, 30000));
    try {
      await sendTelegram(text);
    } catch (err2) {
      console.error('Telegram retry failed:', err2.message);
    }
  }
}

async function finalizeConversation(psid, transcript, customerName, trigger, savedAddress) {
  if (transcript.length === 0) return;

  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);
  const startTs = transcript[0].ts;
  const endTs = transcript[transcript.length - 1].ts;
  const durationMin = Math.max(1, Math.round((endTs - startTs) / 60000));
  const msgCount = transcript.filter(t => t.role === 'customer').length;

  let summaryLines;
  try {
    summaryLines = await generateSummary(transcript, customerName);
  } catch (err) {
    console.error('Summary generation failed:', err.message);
    summaryLines = 'Asked: Unable to generate summary.\nProducts: Unknown\nResolved: Unknown\nAction needed: Check conversation manually';
  }

  const addressLine = savedAddress
    ? `Address: ${savedAddress.address} (${savedAddress.regionName} — ${savedAddress.deliveryFee.toLocaleString()} Ks)`
    : null;

  const message = [
    `Conversation Summary (${dateStr})`,
    SEP,
    `Customer: ${customerName} (PSID: ${psid})`,
    `Duration: ${durationMin} min | Messages: ${msgCount}`,
    SEP,
    summaryLines,
    SEP,
    ...(addressLine ? [addressLine] : []),
    `To re-enable bot: /on ${psid}`
  ].join('\n');

  console.log(`Conversation finalized [${trigger}]: PSID ${psid}`);
  await Promise.all([
    sendTelegramWithRetry(message),
    setCooldown(psid).catch(err => console.error('setCooldown error:', err.message))
  ]);
}

async function sendPhotoAlert(psid, customerName, transcript, savedAddress) {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);

  let context = 'No prior messages.';
  if (transcript.length > 0) {
    try {
      context = await generateSummary(transcript, customerName);
    } catch (err) {
      console.error('Photo alert summary failed:', err.message);
      context = 'Unable to generate summary — check Messenger for context.';
    }
  }

  const addressLine = savedAddress
    ? `Address: ${savedAddress.address} (${savedAddress.regionName} — ${savedAddress.deliveryFee.toLocaleString()} Ks)`
    : null;

  const message = [
    `Photo Received (${dateStr})`,
    SEP,
    `Customer: ${customerName} (PSID: ${psid})`,
    SEP,
    context,
    SEP,
    ...(addressLine ? [addressLine] : []),
    `Action needed: Review photo in Facebook Messenger`,
    `To re-enable bot: /on ${psid}`
  ].join('\n');

  console.log(`Photo alert sent: PSID ${psid}`);
  await Promise.all([
    sendTelegramWithRetry(message),
    setCooldown(psid).catch(err => console.error('setCooldown error:', err.message))
  ]);
}

async function sendRateLimitAlert(psid, customerName, transcript, savedAddress) {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);
  const msgCount = transcript.filter(t => t.role === 'customer').length;

  let context = 'No prior messages.';
  if (transcript.length > 0) {
    try {
      context = await generateSummary(transcript, customerName);
    } catch (err) {
      console.error('Rate limit alert summary failed:', err.message);
      context = 'Unable to generate summary — check Messenger for context.';
    }
  }

  const addressLine = savedAddress
    ? `Address: ${savedAddress.address} (${savedAddress.regionName} — ${savedAddress.deliveryFee.toLocaleString()} Ks)`
    : null;

  const message = [
    `Rate Limit Reached (${dateStr})`,
    SEP,
    `Customer: ${customerName} (PSID: ${psid})`,
    `Messages sent: ${msgCount}`,
    SEP,
    context,
    SEP,
    ...(addressLine ? [addressLine] : []),
    `Action needed: Customer needs human support`,
    `To re-enable bot: /on ${psid}`
  ].join('\n');

  console.log(`Rate limit alert sent: PSID ${psid}`);
  await Promise.all([
    sendTelegramWithRetry(message),
    setCooldown(psid).catch(err => console.error('setCooldown error:', err.message))
  ]);
}

module.exports = { fetchCustomerName, finalizeConversation, sendPhotoAlert, sendRateLimitAlert, INACTIVITY_MS };
