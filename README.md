# PostPilot 🚀

**A self-hosted, open-source LinkedIn content workspace powered by your own AI models.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Cloudflare Workers & D1](https://img.shields.io/badge/Cloudflare-Workers_%26_D1-F38020.svg)](https://workers.cloudflare.com/)
[![GitHub Primer](https://img.shields.io/badge/Design_System-GitHub_Primer-24292F.svg)](https://primer.style/react/)
[![Bun](https://img.shields.io/badge/Runtime-Bun-FBF0DF.svg)](https://bun.sh/)

---

## What is PostPilot?

PostPilot is a **self-hosted workspace** for creators, founders, and engineers who want full ownership over their LinkedIn content, audience strategy, and data.

Instead of paying for expensive monthly SaaS tools that lock your drafts into proprietary platforms, PostPilot gives you a private content studio hosted on your own **Cloudflare Workers** and **Cloudflare D1** infrastructure—running globally at near-zero cost.

### Why Self-Hosted?

- 🔒 **Full Data Ownership**: Your posts, drafts, and conversations live in your own SQLite (D1) database.
- 🔑 **Bring Your Own AI (BYO-AI)**: Connect any OpenAI-compatible provider (OpenAI, Groq, Ollama, OpenRouter, Mistral, or local LLMs). API keys are encrypted at rest with AES-GCM 256-bit encryption and never exposed client-side.
- ⚡ **Zero-Maintenance Edge**: Runs entirely on Cloudflare's serverless edge within free/low-tier limits.

---

## Core Features

- 💬 **AI Strategy Chat**: Brainstorm post concepts, generate hooks, and convert high-performing responses into editable drafts with one click (**Create Draft**).
- ✍️ **Post Editor & Live Preview**: Real-time LinkedIn feed simulation (desktop & mobile) with 3,000-character limit alerts, word counts, and the authentic `...see more` fold.
- 🪄 **AI Assistant Tools**: One-click actions to **Improve Post**, **Rewrite Angle**, **Change Tone**, **Generate 5 Hooks**, and **Generate Hashtags**.
- 🚀 **LinkedIn Publishing**: Connect your LinkedIn account via OAuth 2.0 to publish directly to your feed.
- 🎨 **GitHub Primer UI**: Clean, dense, accessible interface built with GitHub's official Primer design system, with full Light and Dark mode support.
- 🧪 **Simulation Mode**: Test the entire creation and publishing workflow immediately, even without a verified LinkedIn Developer app.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, React Router, GitHub Primer React |
| **Backend API** | Cloudflare Workers (TypeScript) |
| **Database** | Cloudflare D1 (Serverless SQLite) |
| **Package Manager** | Bun |
| **Security** | AES-GCM 256-bit Web Crypto encryption at rest |

---

## Quick Start (Local Development)

### 1. Clone & Install

```bash
git clone https://github.com/Josheqani/post-pilot.git
cd post-pilot
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Set `ENCRYPTION_KEY` in `.env` (generate with `openssl rand -base64 32`).

### 3. Initialize Local Database

```bash
bun run db:migrate:local
```

### 4. Run Development Server

```bash
bun dev
```

Open **http://localhost:5173** in your browser.

---

## Self-Hosting & Deployment

Deploy your instance to Cloudflare in two steps:

### 1. Provision Cloudflare D1

```bash
bunx wrangler d1 create postpilot-db
bunx wrangler d1 migrations apply postpilot-db --remote
```

Add your `database_id` from the output into `wrangler.jsonc`.

### 2. Set Secrets & Deploy

```bash
bunx wrangler secret put ENCRYPTION_KEY
bunx wrangler secret put LINKEDIN_CLIENT_ID       # Optional: for LinkedIn OAuth
bunx wrangler secret put LINKEDIN_CLIENT_SECRET   # Optional: for LinkedIn OAuth

bun run build
bunx wrangler deploy
```

Your self-hosted PostPilot instance will be live on your Cloudflare Workers domain or custom domain!

---

## Code Quality

```bash
bun run lint        # ESLint check
bun run typecheck   # Strict TypeScript check
bun run build       # Production client & worker build
```

---

## License

[MIT](LICENSE) © PostPilot Contributors
