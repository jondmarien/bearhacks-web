import { createLogger, type LogLevel } from "@bearhacks/logger";

type StructuredLogRecord = {
  event: string;
  result: string;
  actor?: string;
  resourceId?: string;
  [key: string]: unknown;
};

export type StructuredLogEntry = {
  level: LogLevel;
  scope: string;
  event: string;
  result: string;
  actor: string;
  resourceId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  rawMessage: string;
};

const MAX_ENTRIES = 1000;
const structuredLogBuffer: StructuredLogEntry[] = [];

export function readStructuredLogs(limit = 500): StructuredLogEntry[] {
  const count = Math.max(1, limit);
  return structuredLogBuffer.slice(-count).reverse();
}

export function createStructuredLogger(scope: string) {
  const logger = createLogger(scope);

  return (level: LogLevel, record: StructuredLogRecord) => {
    const {
      event,
      result,
      actor = "unknown",
      resourceId = "dashboard",
      ...metadata
    } = record;
    const message = `event=${event} actor=${actor} resource_id=${resourceId} result=${result}`;
    structuredLogBuffer.push({
      level,
      scope,
      event,
      result,
      actor,
      resourceId,
      timestamp: new Date().toISOString(),
      metadata,
      rawMessage: message,
    });
    if (structuredLogBuffer.length > MAX_ENTRIES) {
      structuredLogBuffer.splice(0, structuredLogBuffer.length - MAX_ENTRIES);
    }
    logger[level](message, metadata);
  };
}
