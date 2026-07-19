import { hashSeed, normalizeSeed } from "./Seed";

export interface WeightedEntry<T> {
  readonly value: T;
  readonly weight: number;
}

export class RunRng {
  readonly rootSeed: number;
  private state: number;

  private constructor(seed: number) {
    this.rootSeed = normalizeSeed(seed);
    this.state = this.rootSeed;
  }

  static fromSeed(seed: number): RunRng {
    return new RunRng(seed);
  }

  uint32(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  float(): number {
    return this.uint32() / 0x1_0000_0000;
  }

  intInclusive(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new Error(`integer bounds must be ordered integers: ${min}, ${max}`);
    }
    return min + Math.floor(this.float() * (max - min + 1));
  }

  chance(probability: number): boolean {
    if (Number.isNaN(probability)) throw new Error("probability must be a number");
    const clamped = Math.max(0, Math.min(1, probability));
    if (clamped === 0) return false;
    if (clamped === 1) return true;
    return this.float() < clamped;
  }

  weighted<T>(entries: readonly WeightedEntry<T>[]): T {
    if (entries.length === 0) throw new Error("weighted table cannot be empty");
    let total = 0;
    for (const entry of entries) {
      if (!Number.isFinite(entry.weight) || entry.weight < 0) {
        throw new Error(`weight must be finite and nonnegative: ${entry.weight}`);
      }
      total += entry.weight;
    }
    if (total <= 0) throw new Error("weighted table requires a positive total weight");
    const roll = this.float() * total;
    let cursor = 0;
    for (const entry of entries) {
      cursor += entry.weight;
      if (roll < cursor) return entry.value;
    }
    return entries[entries.length - 1].value;
  }

  fork(label: string): RunRng {
    return RunRng.fromSeed(hashSeed(this.rootSeed, label));
  }
}
