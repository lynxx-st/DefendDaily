# Step 3.05: Phish Templates Seed (10 Templates)

Add a seed function to `apps/api/src/db/seed.ts` for phish templates.

## Template data to insert into `phish_templates`

```sql
INSERT INTO phish_templates (name, subject, body_html, lure_type, difficulty) VALUES

('Fake IT Password Reset', 
 'Action Required: Reset Your Password',
 '<p>Dear Employee,</p><p>Our security team has detected unusual activity on your account. <a href="#">Click here to reset your password immediately</a> to prevent account lockout.</p><p>IT Security Team</p>',
 'mfa_request', 'easy'),

('Fake Invoice',
 'Invoice #INV-8821 Due for Payment',
 '<p>Please find attached invoice #INV-8821 for $4,250.00 due within 24 hours. <a href="#">Review and approve payment here</a>.</p><p>Accounts Payable</p>',
 'fake_invoice', 'medium'),

('CEO Wire Transfer Request',
 'Urgent: Confidential Wire Transfer Needed',
 '<p>Hi,</p><p>I need you to process an urgent wire transfer of $35,000 to a new vendor. I''m in a board meeting and can''t talk. <a href="#">Access the transfer portal here</a>. Keep this confidential.</p><p>Best, CEO</p>',
 'fake_invoice', 'hard'),

('Fake HR Benefits Update',
 'Action Needed: Update Your Benefits Before Deadline',
 '<p>Open enrollment closes Friday. Failure to update your selections will result in loss of coverage. <a href="#">Log in to HR portal to update now</a>.</p><p>Human Resources</p>',
 'hr_update', 'easy'),

('Package Delivery Notification',
 'Your package could not be delivered — action required',
 '<p>We attempted to deliver your package but were unable to complete the delivery. <a href="#">Click here to reschedule delivery and confirm your address</a>.</p><p>Delivery Support Team</p>',
 'package_delivery', 'easy'),

('Microsoft 365 License Expiring',
 'Your Microsoft 365 license expires in 24 hours',
 '<p>Your Microsoft 365 subscription is about to expire. <a href="#">Click here to renew your license</a> and avoid service interruption.</p><p>Microsoft Support</p>',
 'mfa_request', 'medium'),

('Payroll Direct Deposit Update',
 'Update Required: Direct Deposit Information',
 '<p>Finance is updating payroll systems. All employees must verify their bank information by EOD Friday. <a href="#">Verify your direct deposit details here</a>.</p><p>Payroll Department</p>',
 'hr_update', 'hard'),

('Shared Document Notification',
 'Your colleague shared a document with you',
 '<p>John Smith has shared "Q4 Budget Review" with you. <a href="#">Click here to view the document</a>.</p><p>This link expires in 48 hours.</p>',
 'hr_update', 'medium'),

('Fake Security Alert',
 'Security Alert: Unauthorized Login Attempt Detected',
 '<p>We detected a login attempt from an unrecognized device in [Location]. <a href="#">Click here to verify your identity and secure your account</a>. If you did not attempt to log in, your account may be compromised.</p>',
 'mfa_request', 'medium'),

('IT Equipment Return',
 'Required: Schedule Your Equipment Return',
 '<p>Per company policy, all remote employees must schedule equipment return or renewal. <a href="#">Complete the equipment form here</a> by end of week to avoid service interruption.</p><p>IT Department</p>',
 'hr_update', 'easy');
```

Add this as a function in `apps/api/src/db/seed.ts` called `seedPhishTemplates()` and call it from `main()`.

**Commit:**
```bash
git add apps/api/src/db/seed.ts
git commit -m "feat(db): seed 10 phish templates across lure types and difficulties"
```

**Update PROGRESS.md:** Check off 3.05. Set Last Completed to "3.05 — phish templates seeded".
