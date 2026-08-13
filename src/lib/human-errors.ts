import { isRateLimitError } from "./groq-pool";

export type ErrorContext = "summary" | "roast" | "command" | "api" | "generic";

function getStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  return (err as { status?: number }).status;
}

function getMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

export function toHumanError(err: unknown, _context: ErrorContext = "generic"): string {
  const msg = getMessage(err).toLowerCase();
  const status = getStatus(err);

  if (
    isRateLimitError(err) ||
    status === 429 ||
    msg.includes("rate-limited or unavailable") ||
    msg.includes("rate limit")
  ) {
    return "High demand right now — too many requests at once. Please try again in a minute.";
  }

  if (msg.includes("timeout") || msg.includes("timed out") || status === 504) {
    return "That took too long to finish. Please try again.";
  }

  if (
    msg.includes("connect") ||
    msg.includes("econnrefused") ||
    msg.includes("database") ||
    msg.includes("postgres") ||
    msg.includes("relation") ||
    msg.includes("failed query") ||
    status === 503
  ) {
    return "We couldn't reach our servers. Please try again shortly.";
  }

  if (msg.includes("groq") && (msg.includes("api key") || msg.includes("unauthorized"))) {
    return "The AI service is temporarily unavailable. Please try again later.";
  }

  if (msg.includes("fetch") || msg.includes("scrape") || msg.includes("network")) {
    return "Couldn't fetch the latest posts right now. Try again in a moment.";
  }

  return "Something went wrong on our end. Please try again in a moment.";
}

/** True if a summary/roast string is an internal error message, not real content. */
export function isErrorLikeContent(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.startsWith("could not generate summary") ||
    lower.startsWith("high demand right now") ||
    lower.startsWith("something went wrong") ||
    lower.startsWith("we couldn't reach") ||
    lower.startsWith("couldn't fetch")
  );
}
