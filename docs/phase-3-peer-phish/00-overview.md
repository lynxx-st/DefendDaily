# Phase 3 — Peer Phish

**Goal:** Employees can send admin-approved, sandboxed phishing simulations to opted-in coworkers.
Tracking pixels + click redirects record outcomes. `/report-phish` rewards vigilance.
CISO dashboard shows click rate as the primary sales metric.

**Exit criteria:** An opted-in user receives a simulated phish email. Clicking records the event
and delivers a Slack teachable moment. Reporting awards Defense Points. CISO can see click rate.

**Estimated effort:** 3 weeks

**Prerequisites:** Phase 1 (Slack bot), Phase 2 (user risk scores).

## Steps (12 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 3.01 | 01-sending-domain.md | SPF/DKIM/DMARC setup guide |
| 3.02 | 02-phish-simulator.md | phishSimulator.ts (Nodemailer) |
| 3.03 | 03-tracking-webhooks.md | GET /track/open/:token (pixel) |
| 3.04 | 03-tracking-webhooks.md | GET /track/click/:token (redirect) |
| 3.05 | 04-phish-templates-seed.md | 10 phish template seeds |
| 3.06 | 05-phish-modal.md | /phish-a-friend Slack modal |
| 3.07 | 06-tos-and-assertions.md | Pre-send assertions + TOS modal |
| 3.08 | 06-tos-and-assertions.md | TOS acknowledgment logging |
| 3.09 | 07-report-phish-command.md | /report-phish command |
| 3.10 | 08-twilio-smishing.md | Twilio smishing service |
| 3.11 | 03-tracking-webhooks.md | Rate limiting on webhook routes |
| 3.12 | 09-phase3-tests.md | Integration tests |

## Legal Safety Requirements (CLAUDE.md §10)

Before ANY phishing send, assert ALL three conditions:
1. `users.is_peer_phish_target = true` for the target
2. `organizations.peer_phish_enabled = true` for the org
3. An `audit_log` entry is written BEFORE the send (legal record)

If any assertion fails → throw, do not send.

TOS modal acknowledgment must be stored with: `user_id`, `timestamp`, `template_id`.

## Tracking Endpoint Security Rules

- Both `/track/open/:token` and `/track/click/:token` ALWAYS return 200
- Never reveal whether a token is valid in the HTTP response (CLAUDE.md §10)
- Both endpoints must be rate-limited
- Tracking tokens are 64-char random hex strings (stored in `phish_campaigns.tracking_token`)
