import type { ContentRegistry } from "../content/ContentRegistry";
import type { LootGrant } from "./ItemComponents";

export interface LootNotice {
  readonly kind: "item" | "ability" | "material";
  readonly label: string;
  readonly amount: number;
}

const MATERIAL_LABELS = {
  "material.scrap": "装备碎片",
  "material.ember_essence": "余烬精华",
  "material.frost_essence": "霜寒精华",
  "material.tide_essence": "潮汐精华",
  "material.spore_essence": "孢生精华",
  "material.storm_essence": "风暴精华",
  "material.seal": "界炉印记",
} as const;

export function lootNotice(content: ContentRegistry, grant: LootGrant): LootNotice {
  if (grant.type === "item") {
    return { kind: "item", label: content.item(grant.item.definition).name, amount: 1 };
  }
  if (grant.type === "ability") {
    const definition = content.findAbility(grant.ability) ?? content.findPassive(grant.ability);
    return { kind: "ability", label: definition?.name ?? grant.ability, amount: 1 };
  }
  return {
    kind: "material",
    label: MATERIAL_LABELS[grant.material],
    amount: grant.amount,
  };
}
