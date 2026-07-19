import type { HeroLifeState } from "../party/DownedComponents";

export interface MapDiscoveryComponent {
  discoveredSections: string[];
}

export interface MapPlayerPosition {
  readonly x: number;
  readonly z: number;
  readonly lifeState?: HeroLifeState;
}
