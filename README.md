# Lisan · ልሳን — AI English Tutor & IELTS Prep for Ethiopia

Lisan is a full-stack English learning platform and virtual teacher for Ethiopian learners: level-based courses (IELTS Band 4 → 8), practice for every skill, an AI voice tutor with speech recognition, AI-graded writing and speaking, AI-generated tests, premium subscriptions paid in Birr, and an admin dashboard that manages everything.

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS v4, lucide icons |
| Backend | NestJS 11, Prisma 6, class-validator, JWT auth, rate limiting |
| Database | Neon serverless Postgres |
| AI | Google Gemini (`@google/genai`), audio + text, JSON responses |
| Payments | Chapa (telebirr, CBE Birr, M-Pesa, Amole, cards) |
| Hosting | Vercel (two projects: `apps/web` and `apps/api`) |

## Features

**Students & guests**
- Guests can browse every course, read free lessons and do free objective practices (scores shown, not saved).
- Registration and login (JWT), profile with first language, target band and level, daily learning streak.
- **Courses → lessons** in Markdown with tables, tips, YouTube video and **listening audio** (browser text-to-speech in British/American/Australian accents, adjustable speed, multi-voice dialogues).
- **Practice library**: multiple choice, gap-fill, IELTS reading (passage plus T/F/NG), listening, writing and speaking tasks, with instant grading and explanations.
- **AI voice tutor ("Teacher Hana")**: the student talks into the microphone, live captions come from the Web Speech API, and the recorded audio goes to **Gemini**, which transcribes it, replies (read aloud) and corrects grammar and pronunciation. Scenarios: free talk, IELTS Parts 1–3, job interview, airport, university.
- **IELTS speaking test**: record an answer (Part 2 has a 1-minute preparation timer) and get a band for each criterion, pronunciation coaching, grammar fixes and a Band 8 model answer.
- **IELTS writing examiner**: Task 1, Task 2 or a General Training letter, with a timer, word counter and auto-saved draft. Feedback covers the 4 criteria, corrections and an improved version.
- **AI tests**: unlimited newly generated grammar, vocabulary, reading and listening tests, plus a **placement level check** that estimates the student's band and can set their level. Answers stay on the server until the test is submitted.
- **Explain in Amharic** option on every AI feature. Prompts are tuned for typical errors made by Amharic, Afaan Oromo and Tigrinya speakers.
- **Dashboard**: estimated band against target, band per skill, 14-day activity, continue learning, recommendations and result history (`/attempts/:id`).
- **Premium** via Chapa with server-side verification. Free users get 10 AI calls a day, Premium users 300 (configurable).

**Admin (`/admin`)**
- Overview KPIs: students, premium conversion, revenue, active users, AI usage, sign-ups, practice per skill.
- Students: search and filter, grant or revoke premium (+30/90/365 days), change role or level, suspend, delete, view attempts and payments.
- Courses and lessons CRUD with Markdown preview, reordering, free-preview lessons, and an **AI lesson generator**.
- Practices CRUD with a visual question builder and an **AI practice generator** for every skill and type.
- Levels, subscription plans (ETB) and payments (with re-verify).

## Project structure

```
apps/
  api/   NestJS API  (prisma/, src/, api/index.js = Vercel function)
  web/   Next.js app (src/app, src/components, src/lib)
```

## Local development

Requirements: Node 20+ and a Postgres database (a free Neon project works).

```bash
npm install

# API
cp apps/api/.env.example apps/api/.env      # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET, GEMINI_API_KEY
npm run db:migrate                          # prisma migrate deploy
npm run db:seed                             # levels, plans, sample courses, admin + demo student
npm run dev:api                             # http://localhost:4000/api

# Web (new terminal)
cp apps/web/.env.example apps/web/.env.local   # API_URL=http://localhost:4000
npm run dev:web                                # http://localhost:3000
```

Seeded accounts:
- Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (default `admin@lisan.et` / `ChangeMe123!`, so **change it**)
- Demo student: `student@lisan.et` / `Student123!`

Set `PAYMENTS_MOCK=true` locally to simulate successful payments without Chapa.

## Deploying to Vercel + Neon

### 1. Neon
1. Create a project at [neon.tech](https://neon.tech).
2. Copy **two** connection strings:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL` (add `&pgbouncer=true&connect_timeout=15`)
   - **Direct** → `DIRECT_URL` (used by migrations)

### 2. API project (`apps/api`)
1. Vercel → *Add New Project* → import this repo → **Root Directory: `apps/api`** (Framework preset: *Other*).
2. Environment variables:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled URL |
   | `DIRECT_URL` | Neon direct URL |
   | `JWT_SECRET` | a long random string (`openssl rand -hex 32`) |
   | `GEMINI_API_KEY` | from [Google AI Studio](https://aistudio.google.com/apikey) |
   | `GEMINI_MODEL` | `gemini-2.5-flash` (or a newer Gemini model) |
   | `WEB_URL` | `https://<your-web>.vercel.app` |
   | `API_PUBLIC_URL` | `https://<your-api>.vercel.app` |
   | `CORS_ORIGINS` | `https://<your-web>.vercel.app` |
   | `CHAPA_SECRET_KEY` | from the Chapa dashboard |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | your first admin account |
   | `FREE_AI_DAILY_LIMIT`, `PREMIUM_AI_DAILY_LIMIT` | optional (10 / 300) |

3. Deploy. The build runs `prisma generate && prisma migrate deploy && nest build`. Every request is sent to the serverless function in `api/index.js`, which reuses one Nest app per warm instance.
4. Seed once from your machine, pointed at Neon: `DATABASE_URL=... DIRECT_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed`
5. Check `https://<your-api>.vercel.app/api/health`.

### 3. Web project (`apps/web`)
1. Import the same repo again → **Root Directory: `apps/web`** (Next.js is detected).
2. Environment variable: `API_URL=https://<your-api>.vercel.app`
3. Deploy. The browser calls `/api/*` on the web domain and Next.js rewrites those calls to the API, so there are no CORS or cookie problems.

### 4. Chapa
In the Chapa dashboard, set the webhook URL to `https://<your-api>.vercel.app/api/billing/chapa/webhook`. The checkout also sends a callback URL (`/api/billing/chapa/callback`) and a return URL (`/checkout/verify`). Premium is activated **only** after the Chapa verify API confirms the amount and currency, and activation is idempotent.

## API overview

All routes are prefixed with `/api`. 🔓 = guests allowed, 👤 = signed in, 🛡️ = admin.

- 🔓 `POST /auth/register`, `POST /auth/login` · 👤 `GET/PATCH /auth/me`, `POST /auth/me/password`
- 🔓 `GET /levels`, `/courses`, `/courses/:slug`, `/lessons/:id`, `/practices`, `/practices/:id`, `POST /practices/:id/submit`
- 👤 `POST /lessons/:id/complete`, `GET /me/dashboard`, `/me/attempts`, `/me/attempts/:id`
- 👤 `GET /ai/quota`, `POST /ai/writing/evaluate`, `/ai/speaking/evaluate`, `/ai/tutor/chat`, `/ai/tests/generate`, `/ai/tests/:id/submit`
- 🔓 `GET /plans` · 👤 `POST /billing/checkout`, `GET /billing/verify/:txRef`, `GET /billing/payments`
- 🛡️ `/admin/stats`, `/admin/users`, `/admin/levels`, `/admin/courses`, `/admin/lessons`, `/admin/practices`, `/admin/plans`, `/admin/payments`, `/admin/ai/generate-practice`, `/admin/ai/generate-lesson`

## Notes
- Microphone access needs HTTPS (Vercel provides it) or `localhost`.
- Live captions use the Web Speech API (Chrome, Edge, Android). On other browsers the recording is still sent to Gemini, so recognition works everywhere.
- Requests to Vercel functions are limited to about 4.5 MB, so recordings are capped (90 s in the tutor, about 2.5 min in tests).
- IELTS is a registered trademark of the British Council, IDP and Cambridge. Lisan is an independent preparation tool, and its bands are AI estimates.
