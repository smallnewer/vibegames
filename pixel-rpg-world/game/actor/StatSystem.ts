import type { ContentRegistry } from "../content/ContentRegistry";
import {
  EQUIPMENT_SLOTS,
  STAT_NAMES,
  type StatBlock,
  type StatModifierSet,
  type StatName,
} from "../content/Definitions";
import type { World } from "../core/World";
import type { EquipmentComponent, InventoryComponent } from "../item/ItemComponents";
import type { StatusComponent } from "../status/StatusComponents";
import type { ActorComponent, HealthComponent } from "./ActorComponents";
import { createStatBreakdown, type StatsComponent } from "./Stats";
import type { AbilityLoadoutComponent } from "../ability/AbilityComponents";
import type { ProgressionComponent } from "../progression/ProgressionComponents";
import { derivePrimaryStats } from "./Stats";
import { BALANCE_DATA } from "../content/generated/balance";
import { evaluateAffixRoll, evaluateItemBase, roundEvaluatedStat } from "../item/ItemEvaluation";
import { itemAffix } from "../item/ItemCatalog";
import { evaluatePassive, type PassiveRank } from "../ability/PassiveEvaluation";

interface StatRule {
  readonly min: number;
  readonly max: number;
  readonly decimals: number;
}

// 限制和舍入只有这一份，内容作者不能在装备或 Buff 脚本里各写一套。
export const STAT_RULES: Readonly<Record<StatName, StatRule>> = {
  might: { min: 0, max: 999, decimals: 0 },
  finesse: { min: 0, max: 999, decimals: 0 },
  vitality: { min: 0, max: 999, decimals: 0 },
  resolve: { min: 0, max: 999, decimals: 0 },
  maxHealth: { min: 1, max: 1_000_000, decimals: 0 },
  meleePower: { min: 0, max: 1_000_000, decimals: 0 },
  rangedPower: { min: 0, max: 1_000_000, decimals: 0 },
  skillPower: { min: 0, max: 1_000_000, decimals: 0 },
  moveSpeed: { min: 0, max: 20, decimals: 4 },
  armor: { min: 0, max: 10_000, decimals: 0 },
  fireResist: { min: -0.25, max: 0.75, decimals: 4 },
  iceResist: { min: -0.25, max: 0.75, decimals: 4 },
  poisonResist: { min: -0.25, max: 0.75, decimals: 4 },
  stormResist: { min: -0.25, max: 0.75, decimals: 4 },
  critRating: { min: 0, max: 100_000, decimals: 0 },
  critDamage: { min: 1.5, max: 2.5, decimals: 4 },
  attackSpeed: { min: 0.5, max: 2.5, decimals: 4 },
  cooldownRecovery: { min: 0, max: 0.6, decimals: 4 },
  damageBonus: { min: 0, max: 1, decimals: 4 },
  damageReduction: { min: 0, max: 0.6, decimals: 4 },
  pickupRadius: { min: 1, max: 4, decimals: 4 },
};

export class StatSystem {
  constructor(private readonly content: ContentRegistry) {}

  // 基础 + 固定值 → 百分比相加 → 最终倍率连乘 → 限制和舍入。
  update(world: World): void {
    for (const entity of world.entitiesWith("stats")) {
      const stats = world.getComponent<StatsComponent>("stats", entity)!;
      const progression = world.getComponent<ProgressionComponent>("progression", entity);
      const effectiveBase = progression
        ? { ...stats.base, ...derivePrimaryStats(progression.level, progression.allocated) }
        : stats.base;
      const breakdown = createStatBreakdown(effectiveBase);
      const modifierSets: StatModifierSet[] = [];
      const inventory = world.getComponent<InventoryComponent>("inventory", entity);
      const equipment = world.getComponent<EquipmentComponent>("equipment", entity);

      if (inventory && equipment) {
        for (const slot of EQUIPMENT_SLOTS) {
          const itemId = equipment[slot];
          if (itemId === undefined) continue;
          const instance = inventory.items.find((item) => item.id === itemId);
          if (!instance) continue;
          const definition = this.content.item(instance.definition);
          const reinforcementMultiplier = instance.reinforce === 0
            ? 1
            : BALANCE_DATA.reinforcement[instance.reinforce - 1].baseMultiplier;
          const generatedBase = evaluateItemBase(instance);
          if (generatedBase) {
            modifierSets.push({
              flat: { [generatedBase.stat]: generatedBase.value * reinforcementMultiplier },
            });
          }
          const reinforcedStat = generatedBase?.stat
            ?? definition.reinforce?.stat
            ?? (definition.slot === "melee"
              ? "meleePower"
              : definition.slot === "ranged"
                ? "rangedPower"
                : "armor");
          modifierSets.push({
            ...definition.modifiers,
            flat: Object.fromEntries(Object.entries(definition.modifiers.flat ?? {}).map(
              ([name, value]) => [
                name,
                name === reinforcedStat ? value * reinforcementMultiplier : value,
              ],
            )),
          });
          for (const rolled of instance.affixes) {
            const affix = itemAffix(rolled.definition);
            const evaluated = roundEvaluatedStat(
              affix.stat,
              evaluateAffixRoll(affix.tiers[0], rolled.roll, instance.itemLevel, affix.stat),
            );
            modifierSets.push({ flat: { [affix.stat]: evaluated } });
          }
        }
      }

      const statuses = world.getComponent<StatusComponent>("statuses", entity);
      const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", entity);
      for (const passiveId of Object.values(loadout?.passives ?? {})) {
        if (!passiveId) continue;
        const rank = Math.min(3, progression?.skillRanks?.[passiveId] ?? 1) as PassiveRank;
        modifierSets.push(evaluatePassive(this.content.passive(passiveId), rank).modifiers);
      }
      for (const status of statuses?.values ?? []) {
        const definition = this.content.status(status.id);
        for (let stack = 0; stack < status.stacks; stack += 1) {
          modifierSets.push(definition.modifiers);
        }
      }

      for (const modifiers of modifierSets) {
        for (const name of STAT_NAMES) {
          breakdown[name].flat += modifiers.flat?.[name] ?? 0;
          breakdown[name].percent += modifiers.percent?.[name] ?? 0;
          breakdown[name].finalMultiplier *= 1 + (modifiers.final?.[name] ?? 0);
        }
      }

      const final = {} as StatBlock;
      for (const name of STAT_NAMES) {
        const value = breakdown[name];
        const raw = (value.base + value.flat) * (1 + value.percent) * value.finalMultiplier;
        const rule = STAT_RULES[name];
        const clamped = Math.max(rule.min, Math.min(rule.max, raw));
        const scale = 10 ** rule.decimals;
        value.value = Math.round(clamped * scale) / scale;
        final[name] = value.value;
      }
      stats.final = final;
      stats.breakdown = breakdown;

      const actor = world.getComponent<ActorComponent>("actor", entity);
      if (actor) actor.speed = final.moveSpeed;
      const health = world.getComponent<HealthComponent>("health", entity);
      if (health) {
        const ratio = health.max > 0 ? health.current / health.max : 0;
        health.max = final.maxHealth;
        health.current = Math.min(health.max, Math.round(health.max * ratio));
      }
    }
  }
}
