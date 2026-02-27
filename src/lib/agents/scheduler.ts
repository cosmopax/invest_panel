import cron, { type ScheduledTask } from "node-cron";
import { createSentinel } from "./sentinel";
import { createLibrarian } from "./librarian";

interface AgentScheduleConfig {
  enabled: boolean;
  schedule: string;
  description: string;
  create: () => { run: (trigger: "scheduled" | "manual" | "event") => Promise<unknown> };
}

const AGENT_CONFIGS: Record<string, AgentScheduleConfig> = {
  sentinel: {
    enabled: process.env.AGENT_SENTINEL_ENABLED !== "false",
    schedule: process.env.AGENT_SENTINEL_CRON || "*/15 * * * *",
    description: "News monitoring and sentiment tagging",
    create: createSentinel,
  },
  librarian: {
    enabled: process.env.AGENT_LIBRARIAN_ENABLED !== "false",
    schedule: process.env.AGENT_LIBRARIAN_CRON || "0 2 * * 1",
    description: "Knowledge discovery and indexing",
    create: createLibrarian,
  },
  // Phase 4+: scout, strategist will be added here
};

const activeTasks: Map<string, ScheduledTask> = new Map();
let _initialized = false;

/** Initialize the agent scheduler. Idempotent — safe to call multiple times. */
export function initializeAgentScheduler(): void {
  if (_initialized) return;
  if (process.env.AGENT_ENABLED === "false") {
    console.log("[Scheduler] Agent system disabled via AGENT_ENABLED=false");
    return;
  }

  for (const [agentId, config] of Object.entries(AGENT_CONFIGS)) {
    if (!config.enabled) {
      console.log(`[Scheduler] ${agentId} disabled`);
      continue;
    }

    if (!cron.validate(config.schedule)) {
      console.error(`[Scheduler] Invalid cron for ${agentId}: ${config.schedule}`);
      continue;
    }

    const task = cron.schedule(
      config.schedule,
      async () => {
        console.log(`[Scheduler] Running ${agentId}: ${config.description}`);
        try {
          const agent = config.create();
          await agent.run("scheduled");
        } catch (error) {
          console.error(`[Scheduler] ${agentId} failed:`, error);
        }
      },
      { timezone: process.env.NEXT_PUBLIC_TIMEZONE || "Europe/Vienna" },
    );

    activeTasks.set(agentId, task);
    console.log(
      `[Scheduler] ${agentId} scheduled: "${config.schedule}" (${config.description})`,
    );
  }

  _initialized = true;
}

/** Stop all scheduled agents. */
export function stopAgentScheduler(): void {
  for (const [agentId, task] of activeTasks) {
    task.stop();
    console.log(`[Scheduler] Stopped ${agentId}`);
  }
  activeTasks.clear();
  _initialized = false;
}

/** Manually trigger an agent run. */
export async function triggerAgent(agentId: string): Promise<unknown> {
  const config = AGENT_CONFIGS[agentId];
  if (!config) {
    throw new Error(`Unknown agent: ${agentId}`);
  }
  const agent = config.create();
  return agent.run("manual");
}

/** Get scheduler status. */
export function getSchedulerStatus(): Record<
  string,
  { enabled: boolean; schedule: string; description: string; active: boolean }
> {
  const status: Record<string, {
    enabled: boolean;
    schedule: string;
    description: string;
    active: boolean;
  }> = {};

  for (const [agentId, config] of Object.entries(AGENT_CONFIGS)) {
    status[agentId] = {
      enabled: config.enabled,
      schedule: config.schedule,
      description: config.description,
      active: activeTasks.has(agentId),
    };
  }

  return status;
}
