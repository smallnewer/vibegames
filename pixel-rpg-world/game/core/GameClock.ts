export class GameClock {
  readonly step = 1 / 60;

  private rest = 0;

  constructor(private readonly maxSteps = 5) {}

  // 将不稳定的渲染时间转换为稳定的逻辑帧。
  advance(delta: number, tick: (step: number) => void): number {
    this.rest += Math.min(Math.max(delta, 0), this.step * this.maxSteps);

    let count = 0;
    while (this.rest >= this.step && count < this.maxSteps) {
      tick(this.step);
      this.rest -= this.step;
      count += 1;
    }

    return this.rest / this.step;
  }

  reset(): void {
    this.rest = 0;
  }
}
