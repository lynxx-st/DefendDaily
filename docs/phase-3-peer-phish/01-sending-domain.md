# Step 3.01: Sending Domain Setup (SPF/DKIM/DMARC)

## Why this matters

Phishing simulation emails must pass email authentication checks to reach inboxes (not spam).
This is a DNS configuration step — no code changes, but must be done before 3.02.

## DNS records to add for `mail.defenddaily.com`

### SPF (Sender Policy Framework)
```
Type: TXT
Name: mail.defenddaily.com
Value: v=spf1 include:_spf.your-smtp-provider.com ~all
```
Replace `_spf.your-smtp-provider.com` with your SMTP provider's SPF record
(e.g., SendGrid: `include:sendgrid.net`, AWS SES: `include:amazonses.com`).

### DKIM (DomainKeys Identified Mail)
Your SMTP provider generates a DKIM key pair. They give you the public key to add as TXT:
```
Type: TXT
Name: defenddaily._domainkey.mail.defenddaily.com
Value: v=DKIM1; k=rsa; p=<PUBLIC_KEY_FROM_SMTP_PROVIDER>
```

### DMARC (Domain-based Message Auth, Reporting & Conformance)
```
Type: TXT
Name: _dmarc.mail.defenddaily.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@defenddaily.com; pct=100
```
Start with `p=quarantine`, move to `p=reject` after monitoring for a week.

## Verification

After adding DNS records (propagation takes up to 48h):
```bash
# Check SPF
dig TXT mail.defenddaily.com

# Check DKIM
dig TXT defenddaily._domainkey.mail.defenddaily.com

# Check DMARC
dig TXT _dmarc.mail.defenddaily.com
```

Use MXToolbox (https://mxtoolbox.com/emailhealth) to run a full email health check.

## Local dev alternative

For local testing, use Mailtrap (https://mailtrap.io) — a fake inbox that catches all emails.
Set these env vars for local dev:
```
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=<mailtrap_user>
SMTP_PASS=<mailtrap_pass>
PHISH_FROM_DOMAIN=mail.defenddaily.com
```

**Update PROGRESS.md:** Check off 3.01. Set Last Completed to "3.01 — Sending domain configured".
