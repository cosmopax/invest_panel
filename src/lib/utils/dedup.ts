import { createHash } from "crypto";

/**
 * Generate a SHA-256 content hash for deduplication.
 * Normalizes by lowercasing, trimming, and using title + first 200 chars of content.
 */
export function contentHash(title: string, content?: string | null): string {
  const normalized =
    title.trim().toLowerCase() +
    "|" +
    (content || "").trim().toLowerCase().slice(0, 200);
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Generate a cluster ID from a normalized headline.
 * Strips common prefixes, numbers, and punctuation for fuzzy grouping.
 */
export function clusterKey(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/^(breaking|update|exclusive|opinion|analysis):\s*/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");

  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}
