# MERIDIAN — Project Vision

## What

A personal investment intelligence hub that combines real-time portfolio tracking across stocks, crypto, and precious metals with autonomous AI agents that monitor news, identify opportunities, curate knowledge, and synthesize macro strategy — all running locally on macOS.

## Why

Existing investment tools either lack AI integration, require cloud dependencies, or don't support the research-heavy workflow of a solo investor with interests spanning traditional markets, crypto, and commodities. MERIDIAN provides a unified, private, local-first platform where AI agents work continuously in the background while the investor retains full control.

## Core Principles

- **Local-first**: SQLite database, no Docker, no cloud services required. Data stays on your machine.
- **Cache-first**: Minimize API calls. Respect rate limits. Stale data is better than no data.
- **EUR-denominated**: All values converted to EUR via official ECB rates. Dual storage (original + EUR) for auditability.
- **Agent autonomy**: Four specialized agents (Sentinel, Scout, Librarian, Strategist) run on schedules and persist to a shared database. They don't need user input to do their jobs.
- **Research-grade**: Knowledge library with mathematical formulations, academic sources, and cross-references. Not a toy dashboard — a serious research tool.

## Target User

Solo investor based in Europe (Austria), tracking a diversified portfolio across equities, crypto, and precious metals, with academic research interests in financial mathematics, behavioral economics, and futures studies.

## Success Criteria

- Portfolio tracking with < 60s price latency during market hours
- Agent-generated insights surfaced within 15 minutes of relevant news
- Knowledge library with 30+ seed entries covering core financial concepts
- Monthly AI agent cost under $60
- Complete build in 5 phases (12-17 days)

## Technical Identity

**Codename**: MERIDIAN
**Stack**: Next.js 15 · React 19 · TypeScript · Tailwind CSS · shadcn/ui · SQLite · Drizzle ORM · Claude AI
**Spec**: `docs/MERIDIAN-Technical-Specification-v1.md`
