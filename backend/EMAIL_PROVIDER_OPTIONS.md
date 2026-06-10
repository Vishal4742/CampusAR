# CampusAR Email And OTP Provider Options

Owner: CLI 2, WSL Codex.

Status: recommendation only. No provider account or production OTP integration has been created.

Checked: 2026-06-10.

## Recommendation

Use Resend first for development and early MVP OTP email.

Why:

- Official pricing currently lists a free plan with 3,000 emails/month, 100 emails/day, one domain, API/SMTP access, webhooks, DKIM/SPF/DMARC support, and ticket support: https://resend.com/pricing
- The API is small and fits a simple backend provider adapter.
- The free daily cap is enough for initial testing if OTP retry limits are conservative.

## Fallbacks

| Provider | Free option observed | Fit |
| --- | --- | --- |
| Resend | 3,000 emails/month and 100 emails/day | Default choice for OTP email during MVP |
| Mailgun | 100 emails/day on the free plan | Good fallback if Resend account approval or deliverability is a problem |
| MailerSend | 500 emails/month after account approval | Lower-volume fallback; useful for testing but less room for campus pilots |
| Brevo | Free plan exists; pricing details can load dynamically by region/account | Consider later if marketing/CRM features become useful |

Sources:

- Resend pricing: https://resend.com/pricing
- Mailgun pricing: https://www.mailgun.com/pricing/
- MailerSend pricing: https://www.mailersend.com/pricing
- Brevo pricing: https://www.brevo.com/pricing/

## Integration Rule

Keep OTP delivery behind a small provider interface:

- `sendOtpEmail({ to, code, purpose, expiresAt })`
- development mode may return `devCode`
- production mode must never return OTP codes in API responses
- provider failures should return a retry-safe error without creating duplicate active challenges

## Open Questions

- Do we control DNS for an approved sending domain, or should the MVP use a provider-verified sender first?
- Should OTP emails come from an OCT-controlled address or a CampusAR project address?
- What retry limit and cooldown should be enforced per email address?
- What OTP delivery events need to be retained for audit without storing sensitive code values?
