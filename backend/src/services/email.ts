import { serviceUnavailable } from '../http/errors.js';

interface EmailConfig {
  environment: string;
  emailProvider: string;
  resendApiKey: string;
  resendFromEmail: string;
}

export interface OtpEmailRequest {
  to: string;
  code: string;
  challengeId: string;
  purpose: string;
  expiresAt: string;
}

export interface EmailDeliveryResult {
  delivery: 'dev_response' | 'email_sent';
  provider: 'dev' | 'resend';
  providerMessageId?: string;
}

type Fetch = typeof fetch;

const otpText = ({ code, expiresAt }: OtpEmailRequest): string => {
  return [
    'CampusAR verification code',
    '',
    `Your CampusAR verification code is ${code}.`,
    `It expires at ${expiresAt}.`,
    '',
    'If you did not request this code, ignore this email.'
  ].join('\n');
};

const otpHtml = ({ code, expiresAt }: OtpEmailRequest): string => {
  return [
    '<h1>CampusAR verification code</h1>',
    `<p>Your CampusAR verification code is <strong>${code}</strong>.</p>`,
    `<p>It expires at ${expiresAt}.</p>`,
    '<p>If you did not request this code, ignore this email.</p>'
  ].join('');
};

export const createEmailService = (config: EmailConfig, fetchImpl: Fetch = fetch) => {
  const sendOtpEmail = async (request: OtpEmailRequest): Promise<EmailDeliveryResult> => {
    if (config.emailProvider !== 'resend') {
      if (config.environment === 'production') {
        throw serviceUnavailable('Email provider is required in production', 'email_provider_required');
      }
      return { delivery: 'dev_response', provider: 'dev' };
    }

    if (!config.resendApiKey) {
      throw serviceUnavailable('Resend API key is not configured', 'resend_api_key_missing');
    }

    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': request.challengeId
      },
      body: JSON.stringify({
        from: config.resendFromEmail,
        to: [request.to],
        subject: 'Your CampusAR verification code',
        text: otpText(request),
        html: otpHtml(request)
      })
    });

    if (!response.ok) {
      throw serviceUnavailable(`Resend rejected OTP email with status ${response.status}`, 'email_delivery_failed');
    }

    const body = await response.json().catch(() => ({})) as { id?: string };
    return { delivery: 'email_sent', provider: 'resend', providerMessageId: body.id };
  };

  return { sendOtpEmail };
};

export type EmailService = ReturnType<typeof createEmailService>;
