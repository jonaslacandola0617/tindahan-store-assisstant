type LogLevel = "info" | "warn" | "error";
type Context = Record<string, unknown>;

const sensitiveKey = /(?:authorization|cookie|password|secret|token|api.?key|access.?key|signed.?url|presigned|credential)/i;

function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (depth > 5) return "[TRUNCATED]";
  if (value instanceof Error) return { name: value.name };
  if (typeof value === "string") return value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 25).map(item => sanitize(item, key, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([childKey, child]) => [childKey, sanitize(child, childKey, depth + 1)]));
  }
  return value;
}

export function safeLogContext(context: Context = {}) {
  return sanitize(context) as Context;
}

function write(level: LogLevel, message: string, context: Context = {}) {
  const entry = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...safeLogContext(context) });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (message: string, context?: Context) => write("info", message, context),
  warn: (message: string, context?: Context) => write("warn", message, context),
  error: (message: string, context?: Context) => write("error", message, context),
};
