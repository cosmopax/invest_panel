# invest_panel — MERIDIAN

Personal Investment Intelligence Hub with autonomous AI agents.

## Stack
Next.js 15 · React 19 · TypeScript · Tailwind CSS · shadcn/ui · SQLite · Drizzle ORM · Claude AI

## Features
- **Dashboard** — Portfolio tracking across stocks, crypto, and precious metals (EUR base)
- **The Wire** — AI-curated newsfeed with sentiment analysis and narrative detection
- **The Desk** — Investment recommendations with confidence scoring and accuracy tracking
- **The Archive** — Searchable knowledge library of financial concepts and frameworks
- **The Forum** — Strategic conversations with an AI advisor using full portfolio context

## Agents
| Agent | Model | Schedule | Function |
|-------|-------|----------|----------|
| Sentinel | Sonnet | Every 15 min | News monitoring, classification, sentiment |
| Scout | Sonnet | Every 4 hours | Technical analysis, opportunity detection |
| Librarian | Sonnet | Weekly (Mon 2 AM) | Academic research discovery |
| Strategist | Opus | Weekdays 8 AM | Macro synthesis, scenario planning |

## Setup
1. Clone: `git clone https://github.com/cosmopax/invest_panel.git`
2. Install: `npm install`
3. Configure: Copy `.env.example` to `.env.local` and add your API keys
4. Migrate: `npx drizzle-kit push`
5. Run: `npm run dev`
6. Open: http://localhost:3000

## API Keys Required
- [Finnhub](https://finnhub.io/register) — stocks (free, 60 req/min)
- [CoinGecko](https://www.coingecko.com/en/api) — crypto (Demo plan, free)
- [Metals.Dev](https://metals.dev/) — precious metals (free, 100 req/month)
- [Anthropic](https://console.anthropic.com/) — AI agents (pay-as-you-go)

## License
Private — personal use only.
