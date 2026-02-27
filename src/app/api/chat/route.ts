import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getClaudeClient, MODELS, estimateCost } from "@/lib/ai/claude-client";
import { getDb } from "@/lib/db";
import {
  conversations,
  messages,
  assets,
  holdings,
  newsItems,
  recommendations,
} from "@/lib/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { newId } from "@/lib/utils/id";

export const runtime = "nodejs";

/** Conversation type determines model and system prompt. */
const CONVERSATION_CONFIGS: Record<
  string,
  { model: string; maxTokens: number; promptPrefix: string }
> = {
  general: {
    model: MODELS.routine,
    maxTokens: 2500,
    promptPrefix: `You are Strategist, a senior macro-economic analyst and investment strategist for the MERIDIAN platform. Help the user think through investment decisions, analyze market conditions, and explore ideas. Be conversational but precise. Use markdown for formatting.`,
  },
  scenario_planning: {
    model: MODELS.deep,
    maxTokens: 4000,
    promptPrefix: `You are Strategist, a senior macro-economic analyst. This is a SCENARIO PLANNING session. Focus on:
- Identifying 3-4 most plausible future scenarios with probability assignments
- Portfolio impact analysis under each scenario
- Key signals to watch for scenario transitions
- Historical parallels and regime analysis

Structure your responses with clear scenario tables and probability assessments. Use markdown.`,
  },
  portfolio_review: {
    model: MODELS.routine,
    maxTokens: 2500,
    promptPrefix: `You are Strategist, a senior investment analyst. This is a PORTFOLIO REVIEW session. Focus on:
- Analyzing current holdings: what's working, what's not
- Position-level assessment and rebalancing suggestions
- Risk exposure analysis (concentration, correlation, sector)
- Concrete, actionable recommendations

Be direct and specific about positions. Use markdown tables for comparisons.`,
  },
  strategy_session: {
    model: MODELS.deep,
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

/**
 * POST /api/chat
 * Body: { conversationId, message, conversationType }
 * Returns: SSE stream of text deltas + final usage data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      message: userMessage,
      conversationType = "general",
    } = body;

    if (!conversationId || !userMessage) {
      return new Response(
        JSON.stringify({ error: "conversationId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const db = getDb();
    const client = getClaudeClient();

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
      CONVERSATION_CONFIGS[conversationType] || CONVERSATION_CONFIGS.general;
    const context = await buildContext();

    const systemPrompt = `${config.promptPrefix}

CURRENT PORTFOLIO:
${context.portfolio}

RECENT NEWS DIGEST:
${context.news}

ACTIVE RECOMMENDATIONS:
${context.recs}

Date: ${new Date().toISOString().slice(0, 10)}`;

    // Build messages for Claude
    const apiMessages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // Create streaming response via SSE
    const stream = client.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: apiMessages,
    });

    const assistantMsgId = newId();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
              );
            }
          }

          // Get final message for usage
          const finalMessage = await stream.finalMessage();
          const usage = finalMessage.usage;

          // Persist assistant message
          await db.insert(messages).values({
            id: assistantMsgId,
            conversationId,
            role: "assistant",
            content: fullResponse,
            agentId: "strategist",
            tokenUsage: {
              input: usage.input_tokens,
              output: usage.output_tokens,
              model: config.model,
              cost: estimateCost(config.model, usage),
            },
          });

          // Send done event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                messageId: assistantMsgId,
                usage: {
                  input: usage.input_tokens,
                  output: usage.output_tokens,
                  cost: estimateCost(config.model, usage),
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
