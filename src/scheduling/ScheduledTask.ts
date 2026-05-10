import { ILogger } from "../logger/ILogger";

export class ScheduledTask {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly task: () => Promise<void>,
    private readonly intervalMs: number,
    private readonly logger: ILogger,
  ) {}

  start(): void {
    if (this.timer) return;

    const run = async () => {
      try {
        await this.task();
      } catch (error) {
        this.logger.error({ error }, "scheduled task failed");
      }
      this.timer = setTimeout(() => void run(), this.intervalMs);
    };

    void run();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
