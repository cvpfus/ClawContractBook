interface RateLimitEntry {
  timestamps: number[];
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;

const entries = new Map<string, RateLimitEntry>();

export function checkAgentRateLimit(agentId: string): void {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const entry = entries.get(agentId);
  if (!entry) {
    entries.set(agentId, { timestamps: [now] });
    return;
  }

  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const error = new Error('Agent rate limit exceeded') as Error & { code: string };
    error.code = 'RATE_LIMITED';
    throw error;
  }

  entry.timestamps.push(now);
}

setInterval(() => {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  for (const [key, entry] of entries) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
    if (entry.timestamps.length === 0) {
      entries.delete(key);
    }
  }
}, WINDOW_MS);
