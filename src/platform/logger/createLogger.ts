import pino from "pino";
import type { LoggerOptions } from "pino";
import type { ILogger } from "./ILogger";
import { createLoggerConfig, type LoggerConfigOptions } from "./loggerConfig";

export function createLogger(options: LoggerConfigOptions = {}): ILogger {
  return pino(createLoggerConfig(options) as LoggerOptions);
}
