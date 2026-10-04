function maskSensitive(input: string): string {
  // Mask postgres URLs and passwords
  return input
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1***$3")
    .replace(/(apiKey|token|secret|password|authorization)=([^\s&]+)/gi, "$1=***");
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    const metaStr = meta ? ` ${maskSensitive(JSON.stringify(meta))}` : "";
    console.log(`[INFO] [${new Date().toISOString()}] ${maskSensitive(message)}${metaStr}`);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    const metaStr = meta ? ` ${maskSensitive(JSON.stringify(meta))}` : "";
    console.warn(`[WARN] [${new Date().toISOString()}] ${maskSensitive(message)}${metaStr}`);
  },
  error(message: string, meta?: Record<string, unknown>) {
    const metaStr = meta ? ` ${maskSensitive(JSON.stringify(meta))}` : "";
    console.error(`[ERROR] [${new Date().toISOString()}] ${maskSensitive(message)}${metaStr}`);
  },
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      const metaStr = meta ? ` ${maskSensitive(JSON.stringify(meta))}` : "";
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${maskSensitive(message)}${metaStr}`);
    }
  },
};
