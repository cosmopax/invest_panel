import { NextRequest } from "next/server";
import { Orchestrator } from "@/lib/ai/orchestrator";
import type { ProviderType } from "@/lib/ai/types";
import { getDb } from "@/lib/db";
import {
  conversations,
  messages,
  assets,
  holdings,
  newsItems,
  recommendations,
} from "@/lib/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { newId } from "@/lib/utils/id";

export const runtime = "nodejs";

/** Conversation type determines system prompt flavor. */
const CONVERSATION_PROMPTS: Record<string, { maxTokens: number; promptPrefix: string }> = {
  general: {
    maxTokens: 2500,
    promptPrefix: `You are Strategist, a senior macro-economic analyst and investment strategist for the MERIDIAN platform. Help the user think through investment decisions, analyze market conditions, and explore ideas. Be conversational but precise. Use markdown for formatting.`,
  },
  scenario_planning: {
    maxTokens: 4000,
    promptPrefix: `You are Strategist, a senior macro-economic analyst. This is a SCENARIO PLANNING session. Focus on:
- Identifying 3-4 most plausible future scenarios with probability assignments
- Portfolio impact analysis under each scenario
- Key signals to watch for scenario transitions
- Historical parallels and regime analysis

Structure your responses with clear scenario tables and probability assessments. Use markdown.`,
  },
  portfolio_review: {
    maxTokens: 2500,
    promptPrefix: `You are Strategist, a senior investment analyst. This is a PORTFOLIO REVIEW session. Focus on:
- Analyzing current holdings: what's working, what's not
- Position-level assessment and rebalancing suggestions
- Risk exposure analysis (concentration, correlation, sector)
- Concrete, actionable recommendations

Be direct and specific about positions. Use markdown tables for comparisons.`,
  },
  strategy_session: {
    maxTokens: 4000,
    promptPrefix: `You are Strategist, a senior macro-economic analyst. This is a STRATEGY SESSION focused on deep analysis. Think in terms of:
- Regime identification: what economic regime are we in? What transitions are likely?
- Historical parallels: what past periods most closely resemble current conditions?
- Assumption challenging: what beliefs does the current portfolio embed? Are they still valid?
- Forward-looking assessment with probabilistic thinking

Provide deep, nuanced analysis. This is not financial advice — it's a research tool for strategic thinking. Use markdown.`,
  },
};

/** Build context sections for the system prompt. */
async function buildContext(): Promise<{
  portfolio: string;
  news: string;
  recs: string;
}> {
  const db = getDb();

  // Portfolio
  const portfolioAssets = await db
    .select({
      symbol: assets.symbol,
      name: assets.name,
      assetClass: assets.assetClass,
      quantity: holdings.quantity,
      costBasisEur: holdings.costBasisEur,
    })
    .from(holdings)
    .innerJoin(assets, eq(holdings.assetId, assets.id))
    .where(eq(holdings.isClosed, false));

  const portfolio =
    portfolioAssets.length > 0
      ? portfolioAssets
          .map(
            (a) =>
              `- ${a.symbol} (${a.name}, ${a.assetClass}): qty=${a.quantity}, cost_eur=${((a.costBasisEur ?? 0) * (a.quantity ?? 0)).toFixed(2)}`,
          )
          .join("\n")
      : "No holdings yet.";

  // Recent news
  const weekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentNews = await db
    .select({
      title: newsItems.title,
      category: newsItems.category,
      sentiment: newsItems.sentiment,
    })
    .from(newsItems)
    .where(gte(newsItems.fetchedAt, weekAgo))
    .orderBy(desc(newsItems.relevanceScore))
    .limit(15);

  const news =
    recentNews.length > 0
      ? recentNews
          .map(
            (n) =>
              `- [${n.category || "?"}] ${n.title} (${n.sentiment || "neutral"})`,
          )
          .join("\n")
      : "No recent news.";

  // Active recommendations
  const activeRecs = await db
    .select({
      agentId: recommendations.agentId,
      type: recommendations.type,
      title: recommendations.title,
      confidence: recommendations.confidence,
      timeHorizon: recommendations.timeHorizon,
    })
    .from(recommendations)
    .where(eq(recommendations.status, "active"))
    .orderBy(desc(recommendations.confidence))
    .limit(10);

  const recs =
    activeRecs.length > 0
      ? activeRecs
          .map(
            (r) =>
              `- [${r.agentId}/${r.type}] ${r.title} (confidence=${r.confidence}, horizon=${r.timeHorizon})`,
          )
          .join("\n")
      : "No active recommendations.";

  return { portfolio, news, recs };
}

/** Simulated streaming: chunk text into SSE events at intervals. */
function simulateStream(
  fullText: string,
  chunkSize: number = 50,
  intervalMs: number = 15,
): ReadableStream {
  const encoder = new TextEncoder();
  let offset = 0;

  return new ReadableStream({
    async start(controller) {
      while (offset < fullText.length) {
        const chunk = fullText.slice(offset, offset + chunkSize);
        offset += chunkSize;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
        );
        if (offset < fullText.length) {
          await new Promise((r) => setTimeout(r, intervalMs));
        }
      }
    },
  });
}

/**
 * POST /api/chat
 * Body: { conversationId, message, conversationType, preferredProvider? }
 * Returns: SSE stream of text deltas + final usage data
 *
 * Uses the multi-AI Orchestrator with simulated streaming.
 * CLI tools execute fully before returning — we chunk the response into SSE events.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      message: userMessage,
      conversationType = "general",
      preferredProvider,
    } = body;

    if (!conversationId || !userMessage) {
      return new Response(
        JSON.stringify({ error: "conversationId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const db = getDb();

    // Save user message
    const userMsgId = newId();
    await db.insert(messages).values({
      id: userMsgId,
      conversationId,
      role: "user",
      content: userMessage,
    });

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(conversations.id, conversationId));

    // Get conversation history
    const history = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    // Build system prompt with context
    const config =
      CONVERSATION_PROMPTS[conversationType] || CONVERSATION_PROMPTS.general;
    const context = await buildContext();

    const systemPrompt = `${config.promptPrefix}

CURRENT PORTFOLIO:
${context.portfolio}

RECENT NEWS DIGEST:
${context.news}

ACTIVE RECOMMENDATIONS:
${context.recs}

Date: ${new Date().toISOString().slice(0, 10)}`;

    // Build conversation as a single prompt (CLI tools don't support multi-turn)
    const historyText = history
      .map((m) => `${m.role === "assistant" ? "ASSISTANT" : "USER"}: ${m.content}`)
      .join("\n\n");

    // Execute via Orchestrator
    const response = await Orchestrator.executeRaw(
      {
        systemPrompt,
        prompt: historyText,
        maxTokens: config.maxTokens,
        temperature: 0.5,
      },
      "forum",
      preferredProvider as ProviderType | undefined,
    );

    const fullResponse = response.text;
    const assistantMsgId = newId();

    // Persist assistant message
    await db.insert(messages).values({
      id: assistantMsgId,
      conversationId,
      role: "assistant",
      content: fullResponse,
      agentId: "strategist",
      tokenUsage: {
        provider: response.provider,
        cost: response.costUsd ?? 0,
        wasFallback: response.wasFallback,
        originalProvider: response.originalProvider,
      },
    });

    // Create SSE response with simulated streaming
    const textStream = simulateStream(fullResponse);
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        const reader = textStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }

          // Send done event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                messageId: assistantMsgId,
                provider: response.provider,
                usage: {
                  cost: response.costUsd ?? 0,
                  durationMs: response.durationMs,
                  wasFallback: response.wasFallback,
                },
              })}\n\n`,
            ),
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMsg })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[API] POST /api/chat failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Chat failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
