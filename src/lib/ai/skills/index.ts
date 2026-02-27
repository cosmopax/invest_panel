import type { Skill } from "../types";
import { classifyNewsSkill } from "./classify-news";
import { analyzeTechnicalsSkill } from "./analyze-technicals";
import { generateRecommendationsSkill } from "./generate-recommendations";
import { macroSynthesisSkill } from "./macro-synthesis";
import { scenarioPlanningSkill } from "./scenario-planning";
import { discoverKnowledgeSkill } from "./discover-knowledge";
import { verifyAnalysisSkill } from "./verify-analysis";
import { summarizeContextSkill } from "./summarize-context";
import { chatResponseSkill } from "./chat-response";

/** Registry of all available skills, keyed by ID. */
const SKILL_REGISTRY: Map<string, Skill> = new Map();

/** Register all built-in skills on module load. */
function initRegistry(): void {
  const skills: Skill[] = [
    classifyNewsSkill,
    analyzeTechnicalsSkill,
    generateRecommendationsSkill,
    macroSynthesisSkill,
    scenarioPlanningSkill,
    discoverKnowledgeSkill,
    verifyAnalysisSkill,
    summarizeContextSkill,
    chatResponseSkill,
  ];

  for (const skill of skills) {
    SKILL_REGISTRY.set(skill.id, skill);
  }
}

initRegistry();

/**
 * Get a skill by ID.
 * @throws If skill not found.
 */
export function getSkill(id: string): Skill {
  const skill = SKILL_REGISTRY.get(id);
  if (!skill) {
    throw new Error(`Unknown skill: ${id}. Available: ${[...SKILL_REGISTRY.keys()].join(", ")}`);
  }
  return skill;
}

/** Get all registered skills. */
export function getAllSkills(): Skill[] {
  return [...SKILL_REGISTRY.values()];
}

/** Check if a skill exists. */
export function hasSkill(id: string): boolean {
  return SKILL_REGISTRY.has(id);
}

/**
 * Render a prompt template by substituting {{variable}} placeholders.
 * Variables that aren't provided are left as-is.
 */
export function renderPrompt(
  template: string,
  variables: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return match;
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  });
}
