---
name: nextjs-app-router
description: 'Next.js 15 App Router patterns for MERIDIAN. Use this skill whenever creating pages, layouts, route handlers, server/client components, loading states, error boundaries, or working with the App Router. Also use when implementing TanStack Query providers, Suspense boundaries, or API routes.'
---

# Next.js 15 App Router Patterns for MERIDIAN

## Server vs Client Components

Default to Server Components. Add `"use client"` only when needed:

- **Server**: Pages, layouts, data-fetching wrappers, static content
- **Client**: Interactive components (forms, charts, toggles, modals), anything using hooks (useState, useEffect, TanStack Query, Zustand)

## Route Handlers

API routes in `src/app/api/[feature]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ symbol: z.string(), quantity: z.number().positive() });

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    // ... handle
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Layout Pattern

Root layout provides theme, fonts, and providers. Feature layouts are optional:

```typescript
// src/app/layout.tsx — root
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0e1a] text-[#f9fafb] font-sans antialiased">
        <QueryProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
```

## TanStack Query Setup

Provider wraps the app. Queries use feature-specific hooks:

```typescript
// src/hooks/use-portfolio.ts
"use client";
export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => fetch("/api/portfolio").then(r => r.json()),
    refetchInterval: 60_000, // 60s
  });
}
```

## Error Boundaries

Each route segment gets `error.tsx` and `loading.tsx`:

```typescript
// src/app/wire/error.tsx
"use client";
export default function WireError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 text-center">
      <p className="text-red-400">Failed to load The Wire: {error.message}</p>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-600 rounded">Retry</button>
    </div>
  );
}
```
