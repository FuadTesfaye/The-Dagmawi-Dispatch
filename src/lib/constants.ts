export const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'lurkening_bot';

export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

export const SITE_CONFIG = {
  name: 'The Lurkening',
  tagline: 'Universal Telegram Channel Monitoring, Groq AI Intelligence & Discovery',
  shortName: 'The Lurkening',
  botUsername: TELEGRAM_BOT_USERNAME,
  botUrl: TELEGRAM_BOT_URL,
};
