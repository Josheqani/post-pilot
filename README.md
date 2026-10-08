# PostPilot 🚀

**A self-hosted, open-source LinkedIn content workspace powered by your own AI models.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Cloudflare Workers & D1](https://img.shields.io/badge/Cloudflare-Workers_%26_D1-F38020.svg)](https://workers.cloudflare.com/)
[![GitHub Primer](https://img.shields.io/badge/Design_System-GitHub_Primer-24292F.svg)](https://primer.style/react/)
[![pnpm](https://img.shields.io/badge/Package_Manager-pnpm-F69220.svg)](https://pnpm.io/)

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
| **Package Manager** | pnpm |
| **Security** | AES-GCM 256-bit Web Crypto encryption at rest |

---

## Quick Start (Local Development)

### 1. Clone & Install

```bash
git clone https://github.com/Josheqani/post-pilot.git
cd post-pilot
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Set `ENCRYPTION_KEY` in `.env` (generate with `openssl rand -base64 32`).

### 3. Initialize Local Database

```bash
pnpm run db:migrate:local
```

### 4. Run Development Server

```bash
pnpm run dev
```

Open **http://localhost:5173** in your browser.

---

## Self-Hosting & Deployment

Deploy your instance to Cloudflare in two steps:

### 1. Provision Cloudflare D1 Database

In the **Cloudflare Dashboard**:
1. Go to **Storage & Databases** > **D1 SQL Database** > Click **Create database** (`postpilot-db`).
2. Open the **Console** tab, paste the SQL from `migrations/0001_initial.sql`, and click **Execute**.
3. In your Worker's **Settings > Bindings**, add a **D1 Database** binding:
   - **Variable name**: `DB` *(uppercase)*
   - **Database**: `postpilot-db`

### 2. Set Secrets & Deploy

In your Worker's **Settings > Variables and secrets**, add:

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_KEY` | ✅ | Secure random string used to encrypt stored tokens & API keys (generate with `openssl rand -base64 32`). |
| `LINKEDIN_CLIENT_ID` | Optional | LinkedIn app client ID for direct LinkedIn OAuth. |
| `LINKEDIN_CLIENT_SECRET` | Optional | LinkedIn app client secret for direct LinkedIn OAuth. |
| `LINKEDIN_REDIRECT_URI` | Optional | Override the OAuth callback URL. Defaults to `<your-origin>/settings/linkedin/callback`, derived dynamically from the request origin. |
| `DEFAULT_AI_BASE_URL` | Optional | Server-level AI fallback: base URL of an OpenAI-compatible `/v1` endpoint. |
| `DEFAULT_AI_API_KEY` | Optional | Server-level AI fallback: API key for the endpoint above. |
| `DEFAULT_AI_MODEL` | Optional | Server-level AI fallback: model name to use. |
| `ENVIRONMENT` | Optional | Runtime environment flag (set to `development` in `wrangler.jsonc`). |

> **Note:** The OAuth redirect URI is dynamic — when hosted on `domain.com`, the callback is `https://domain.com/settings/linkedin/callback`. Add that URL to your LinkedIn app's authorized redirect URLs.

Now deploy:
- **Via Cloudflare Git Integration (Recommended)**: Connect your repository in the Cloudflare Dashboard, set build command to `pnpm run build` and output directory to `./dist`, then deploy!
- **Via CLI**:
  ```bash
  pnpm run build
  pnpm dlx wrangler deploy
  ```

Your self-hosted PostPilot instance will be live on your Cloudflare Workers domain or custom domain!

---

## Code Quality

```bash
pnpm run lint        # ESLint check
pnpm run typecheck   # Strict TypeScript check
pnpm run build       # Production client & worker build
```

---

## License

[MIT](LICENSE) © PostPilot Contributors
