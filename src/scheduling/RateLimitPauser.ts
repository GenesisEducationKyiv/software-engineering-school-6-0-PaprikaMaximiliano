export class RateLimitPauser {
  private pauseUntil = 0;

  isPaused(): boolean {
    return Date.now() < this.pauseUntil;
  }

  pause(seconds: number): void {
    this.pauseUntil = Date.now() + seconds * 1000;
  }

  getRemainingPauseMs(): number {
    const remaining = this.pauseUntil - Date.now();
    return Math.max(0, remaining);
  }
}
