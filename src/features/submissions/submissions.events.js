import { httpClient } from "../../config/http-client.js";
import { env } from "../../config/env.js";
import { nowIso } from "../../utils/time.js";
import { z } from "zod";

const rawSubmissionEventSchema = z.preprocess(
  (value) => (value && typeof value === "object" ? value : {}),
  z
    .object({
      type: z.any().optional(),
      char_count: z.any().optional(),
      timestamp: z.any().optional(),
    })
    .passthrough(),
);

const submissionEventSchema = rawSubmissionEventSchema.transform((event) => {
  const charCount = Number(event?.char_count || 0);
  const timestampValue = new Date(event?.timestamp || "");
  const timestamp = Number.isNaN(timestampValue.getTime()) ? nowIso() : timestampValue.toISOString();

  return {
    type: String(event?.type || "unknown").trim().toLowerCase(),
    char_count: Number.isFinite(charCount) ? Math.max(0, Math.min(charCount, 100000)) : 0,
    timestamp,
  };
});

function trimTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function eventSummary(events = []) {
  return events.reduce(
    (acc, event) => {
      if (event.type === "key") acc.key += Number(event.char_count || 0);
      if (event.type === "paste") acc.paste += Number(event.char_count || 0);
      if (event.type === "delete") acc.delete += Number(event.char_count || 0);
      if (event.type === "run") acc.run += 1;
      return acc;
    },
    { key: 0, paste: 0, delete: 0, run: 0 },
  );
}

function classifyWithHeuristic(events = []) {
  const summary = eventSummary(events);
  const totalInput = summary.key + summary.paste;
  const pasteRatio = totalInput > 0 ? summary.paste / totalInput : 0;

  let label = "human";
  if (pasteRatio >= 0.7) label = "ai_generated";
  else if (pasteRatio >= 0.35) label = "assisted";

  let confidence = 0.55 + pasteRatio * 0.4;
  if (summary.run >= 3 && pasteRatio < 0.2) confidence -= 0.08;

  return {
    label,
    confidence: Number(Math.max(0.5, Math.min(0.98, confidence)).toFixed(2)),
  };
}

export async function classifyFromEvents(events = []) {
  const fallback = classifyWithHeuristic(events);

  if (!env.CLASSIFIER_API_BASE) return fallback;

  try {
    const payload = {
      events,
      summary: eventSummary(events),
    };
    const baseUrl = trimTrailingSlash(env.CLASSIFIER_API_BASE);

    const { data } = await httpClient.post(`${baseUrl}/classify`, payload);

    if (!data || typeof data !== "object") return fallback;

    const label = typeof data.label === "string" && data.label.trim() ? data.label : fallback.label;
    const confidence = Number(data.confidence);

    return {
      label,
      confidence: Number.isFinite(confidence) ? confidence : fallback.confidence,
    };
  } catch {
    return fallback;
  }
}

export function sanitizeEvents(events) {
  if (!Array.isArray(events)) return [];

  return events.slice(0, 200).map((event) => submissionEventSchema.parse(event));
}
