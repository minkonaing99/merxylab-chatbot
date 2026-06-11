require('dotenv').config();
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const COOLDOWN_TTL = 25 * 60 * 60; // 25 hours in seconds

async function setCooldown(psid) {
  await redis.set(`cooldown:${psid}`, '1', { ex: COOLDOWN_TTL });
}

async function isInCooldown(psid) {
  const val = await redis.get(`cooldown:${psid}`);
  return val !== null;
}

async function clearCooldown(psid) {
  await Promise.all([
    redis.del(`cooldown:${psid}`),
    redis.del(`notified:${psid}`)
  ]);
}

async function setNotified(psid) {
  await redis.set(`notified:${psid}`, '1', { ex: COOLDOWN_TTL });
}

async function hasBeenNotified(psid) {
  const val = await redis.get(`notified:${psid}`);
  return val !== null;
}

module.exports = { setCooldown, isInCooldown, clearCooldown, setNotified, hasBeenNotified };
