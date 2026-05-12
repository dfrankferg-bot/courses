import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  ts: number;
  level: LogLevel;
  scope: string;
  msg: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private readonly scope: string;
  private readonly file?: string;
  private readonly minLevel: LogLevel;

  constructor(opts: {
    scope: string;
    file?: string;
    minLevel?: LogLevel;
  }) {
    this.scope = opts.scope;
    this.minLevel = opts.minLevel ?? "info";

    if (opts.file) {
      const dir = join(process.cwd(), "logs");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      this.file = join(dir, opts.file);
    }
  }

  child(scope: string): Logger {
    return new Logger({
      scope: `${this.scope}:${scope}`,
      file: this.file ? this.file.replace(/^.*\//, "") : undefined,
      minLevel: this.minLevel,
    });
  }

  debug(msg: string, data?: Record<string, unknown>) {
    this.write("debug", msg, data);
  }
  info(msg: string, data?: Record<string, unknown>) {
    this.write("info", msg, data);
  }
  warn(msg: string, data?: Record<string, unknown>) {
    this.write("warn", msg, data);
  }
  error(msg: string, data?: Record<string, unknown>) {
    this.write("error", msg, data);
  }

  private write(level: LogLevel, msg: string, data?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const record: LogRecord = {
      ts: Date.now(),
      level,
      scope: this.scope,
      msg,
      ...(data ? { data } : {}),
    };

    const line = JSON.stringify(record);
    if (this.file) appendFileSync(this.file, line + "\n");

    const prefix = `[${new Date(record.ts).toISOString()}] [${level.toUpperCase().padEnd(5)}] ${record.scope}`;
    const tail = data ? ` ${JSON.stringify(data)}` : "";
    const out = `${prefix} | ${msg}${tail}`;
    if (level === "error") console.error(out);
    else if (level === "warn") console.warn(out);
    else console.log(out);
  }

  private shouldLog(level: LogLevel): boolean {
    const order: LogLevel[] = ["debug", "info", "warn", "error"];
    return order.indexOf(level) >= order.indexOf(this.minLevel);
  }
}
