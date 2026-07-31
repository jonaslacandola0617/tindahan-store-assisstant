type LogLevel = "info" | "warn" | "error";
type Context = Record<string, unknown>;

function write(level: LogLevel, message: string, context: Context = {}) {
  const entry = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...context });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (message: string, context?: Context) => write("info", message, context),
  warn: (message: string, context?: Context) => write("warn", message, context),
  error: (message: string, context?: Context) => write("error", message, context),
};
