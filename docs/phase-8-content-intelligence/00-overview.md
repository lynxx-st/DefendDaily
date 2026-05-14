# Phase 8 — Question Quality & Content Intelligence

**Goal:** Upgrade the puzzle bank from static hand-authored content to a continuously
improving, AI-assisted content pipeline. Integrate real-world threat intelligence feeds.
Add spaced repetition, Elo calibration, and an admin studio that gives non-engineers
full control over puzzle creation and quality.

**Exit criteria:** Claude API generates a valid, quality-checked puzzle from a prompt
template. Spaced repetition correctly schedules a Box 1 puzzle for next-day review and
a Box 5 puzzle for 16-day review. CISA KEV feed produces an industry-matched puzzle
within 24 hours of a new CVE. Admin puzzle studio previews a Block Kit message in the
browser before publishing.

**Estimated effort:** 5 weeks

**Prerequisites:** Phase 1 (puzzle bank + delivery), Phase 7 (engagement upgrades).

## Steps (20 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 8.01 | 01-ai-puzzle-engine.md | Claude API integration for AI puzzle generation (claude-sonnet-4-6) |
| 8.02 | 01-ai-puzzle-engine.md | Puzzle quality scoring pipeline (auto-reject low quality) |
| 8.03 | 01-ai-puzzle-engine.md | Spaced repetition algorithm (Leitner box scheduler) |
| 8.04 | 02-threat-intelligence.md | CISA KEV feed integration (weekly pull, industry-matched CVE puzzles) |
| 8.05 | 02-threat-intelligence.md | Deepfake & AI social engineering puzzle category |
| 8.06 | 02-threat-intelligence.md | Physical security puzzle category (tailgating, badge cloning) |
| 8.07 | 02-threat-intelligence.md | Supply chain attack puzzle category (malicious packages, fake updates) |
| 8.08 | 03-puzzle-calibration.md | Elo-style puzzle difficulty calibration |
| 8.09 | 03-puzzle-calibration.md | A/B testing framework for puzzle variants |
| 8.10 | 03-puzzle-calibration.md | Puzzle engagement analytics (skip rate, time-to-answer heatmap) |
| 8.11 | 03-puzzle-calibration.md | AI-generated rich explanations (150-word, red-flag callouts) |
| 8.12 | 04-puzzle-studio.md | Admin puzzle studio (create/edit/preview in dashboard) |
| 8.13 | 04-puzzle-studio.md | Community puzzle submissions (/suggest-puzzle command + approval queue) |
| 8.14 | 04-puzzle-studio.md | MITRE ATT&CK tag taxonomy (tag puzzles, show user weakness map) |
| 8.15 | 04-puzzle-studio.md | Puzzle retirement system (auto-retire > 95% accuracy after 100 responses) |
| 8.16 | 05-content-expansion.md | DeepL API translation pipeline (ES/FR/DE) |
| 8.17 | 05-content-expansion.md | AI-assisted phishing screenshot generation for Spot the Phish puzzles |
| 8.18 | 05-content-expansion.md | 500+ puzzle bank expansion (AI-assisted, human-reviewed) |
| 8.19 | 05-content-expansion.md | Puzzle effectiveness dashboard (admin view: accuracy, skip, engagement per puzzle) |
| 8.20 | 05-content-expansion.md | Phase 8 tests (spaced repetition, Elo calibration, A/B determinism) |

## Key Architecture Notes

- **Claude API:** Uses `claude-sonnet-4-6` via the Anthropic SDK. Prompt templates live
  in `apps/api/src/services/puzzleGenerator/prompts/`. One prompt file per puzzle type.
  Responses are validated through the quality pipeline before insertion into the DB.
- **Quality pipeline:** Rejects puzzles where explanation word count < 50, correct answer
  option count < 2, or Claude's own self-scored confidence < 0.8 (included in structured
  output via tool use).
- **Leitner box:** New schema column `puzzles.leitner_box` (SMALLINT 1–5, default 1) and
  `user_puzzle_state (user_id, puzzle_id, box, next_review_date)`. Box intervals:
  1→1 day, 2→2 days, 3→4 days, 4→8 days, 5→16 days.
- **Elo calibration:** `puzzles.elo_rating` (SMALLINT, default 1200). Each answer event
  updates the puzzle's rating using the standard Elo formula with K=32. Expected score
  = 1 / (1 + 10^((puzzle_elo - user_level) / 400)).
- **A/B framework:** Assignment is deterministic: `hash(user_id + puzzle_variant_group_id) % 2`.
  Same user always gets the same variant. Tracked in Redis `ab:{group_id}:{user_id}`.
- **MITRE ATT&CK:** Tags stored in `puzzles.tags TEXT[]`. The weakness map page in the
  dashboard aggregates incorrect answers by ATT&CK technique ID.
- **Puzzle studio:** Server component page with a `'use client'` child for the Block Kit
  preview pane (renders JSON as a styled mock Slack message).
