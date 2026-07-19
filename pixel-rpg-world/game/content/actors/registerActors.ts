import type { ContentRegistry } from "../ContentRegistry";
import { CRYSTAL_TURRET } from "./crystalTurret";
import { EMBER_COLOSSUS } from "./emberColossus";
import { EMBER_HERO } from "./emberHero";
import { EMBER_STALKER } from "./emberStalker";
import { EMBER_GAOLER } from "./emberGaoler";
import { FURNACE_SLINGER } from "./furnaceSlinger";
import { EMBER_CHAMPION } from "./emberChampion";
import { WARDEN_HEARN } from "./wardenHearn";
import { WARDING_TOTEM } from "./wardingTotem";

export function registerActors(content: ContentRegistry): void {
  for (const actor of [
    EMBER_COLOSSUS,
    WARDEN_HEARN,
    EMBER_CHAMPION,
    CRYSTAL_TURRET,
    EMBER_GAOLER,
    EMBER_STALKER,
    FURNACE_SLINGER,
    WARDING_TOTEM,
    EMBER_HERO,
  ]) {
    content.registerActor(actor);
  }
}
