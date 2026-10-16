# EASY VIDEO v3 — AI Video Studio (EASY CODE)

https://mido9980.github.io/easy-video/

## What's new in v3
- Full site: Home, Studio (9 tools), Model Library, Guides, My Library, Pricing, Account, Admin
- 3 languages: English / Egyptian Arabic (RTL) / Deutsch
- Dark cinematic glass theme (teal-mint gradient)
- Free mode on every tool: renders on-device (canvas + WebAudio), never fails, EASY CODE watermark
- AI scenes free: agent brain (Orca, free model) splits your idea into 4 AI images, animated into a cinematic video
- Cinema mode (paid): real Kling AI videos via backend, no watermark
- Voice & Dialogue: Egyptian Arabic TTS (browser voices)
- Music & SFX: original on-device beats (lofi/trap/cinematic)
- Lip Sync / Rap Duo: two portraits + lyrics, mouth animation + beat, fully on-device
- Reference to Video (1-4 images), Motion Control presets, Video Tools (upscale, bg removal, extend, audio boost) — all client-side, files never leave the phone
- Safety filter: blocks political / explicit / minors prompts (EASY CODE ethics)
- Payments: wallet transfer + transaction code, card URL (Paymob) if configured
- Admin: stats, payment approvals, config (wallet, price, models, Cloudinary)

## Files
- index.html — app shell
- styles.css — theme
- i18n.js — EN / AR-EG / DE strings
- data.js — models, testimonials, FAQ, blog, plans
- app.js — logic + render engines

## Backend (on the EASY CODE Superagent)
- vsPublic: config, signup, login, payments, agent (AI brain), generate (Kling via Orca / fal), job_status
- vsVideo: public feed, My Studio profiles
- vsAdmin: stats, approve, update_config

v2 is preserved in git history.
