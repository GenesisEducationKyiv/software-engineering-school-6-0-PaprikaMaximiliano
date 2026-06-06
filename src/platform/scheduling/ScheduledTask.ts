import { ILogger } from "../logger/ILogger";

export class ScheduledTask {
  private timer: NodeJS.Timeout | null = null;
  private isStarted = false;

  constructor(
    private readonly task: () => Promise<void>,
    private readonly intervalMs: number,
    private readonly logger: ILogger,
  ) {}

  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    const run = async () => {
      try {
        await this.task();
      } catch (error) {
        this.logger.error({ error }, "scheduled task failed");
      }
      if (this.isStarted) {
        this.timer = setTimeout(() => void run(), this.intervalMs);
      }
    };

    void run();
  }

  stop(): void {
    this.isStarted = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
