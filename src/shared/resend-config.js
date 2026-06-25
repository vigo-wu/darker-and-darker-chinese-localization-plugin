import resendConfig from '../../market/config/reSendAPIKey.js';

const DEFAULT_FROM_EMAIL = 'onboarding@resend.dev';

export function getResendConfig() {
  return {
    apiKey: String(resendConfig?.apiKey || '').trim(),
    fromEmail: String(resendConfig?.fromEmail || DEFAULT_FROM_EMAIL).trim(),
  };
}

export function hasResendApiKey() {
  return Boolean(getResendConfig().apiKey);
}
