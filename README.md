# EASY VIDEO 🎬 — Your AI Video Agent

*Part of the EASY CODE collection — Apps Made Easy ✨*

**Live app:** https://mido9980.github.io/easy-video/

A Grok-style chat video agent: the user describes any idea in plain words and gets a ready-to-post 8-second video back.

## Features

- **Free mode** — instant on-device video rendering (canvas templates + WebAudio beat + optional photo). Zero server cost, works offline.
- **Cinema AI mode (paid)** — realistic AI videos with sound via fal.ai (Veo 3). Server-side key, pay-per-plan (default: 50 EGP = 3 videos).
- **Accounts** — first-time sign up (name + phone + PIN), sign in, auto-login. PINs stored hashed (SHA-256).
- **Wallet payments** — user transfers to the owner's mobile wallet, submits phone + reference, owner approves from the admin panel.
- **EASY CODE branding** — background watermark + centered logo in every video.
- **Admin panel** — visits, videos, requests, revenue, approvals, settings.

## Run / Edit

Single-file app — `index.html` is the whole frontend. Open it in any browser.

Backend is a Base44 backend with two functions:
- `vsPublic` — config, tracking, signup/login, payments, generation, job status
- `vsAdmin` — stats, approve/reject, settings (password-protected)

## Edit on your phone with SPCK

1. SPCK Editor → new project → clone: `https://github.com/Mido9980/easy-video.git`
2. When asked for credentials, use your GitHub username + Personal Access Token as password.
3. Edit `index.html`, commit from SPCK → GitHub Pages updates automatically.

---
© EASY CODE — Apps Made Easy
