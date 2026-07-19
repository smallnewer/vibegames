import { BALANCE_DATA } from "../content/generated/balance";
import type { Command } from "../core/Command";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import { xpToNext } from "./Experience";
import type { ProgressionComponent } from "./ProgressionComponents";
import type { AbilityBookComponent } from "../item/ItemComponents";

export interface ProgressionUpdateOptions {
  readonly allowAttributeReset?: boolean;
}

export class ProgressionSystem {
  update(
    world: World,
    commands: readonly Command[],
    events: GameplayEvent[],
    options: ProgressionUpdateOptions = {},
  ): void {
    for (const command of commands) {
      if (command.type === "rank_up_skill") {
        const progression = world.getComponent<ProgressionComponent>("progression", command.actor);
        const book = world.getComponent<AbilityBookComponent>("abilityBook", command.actor);
        if (
          !progression
          || !book?.unlocked.includes(command.ability)
          || (
            !command.ability.startsWith("ability.")
            && !command.ability.startsWith("passive.")
          )
          || progression.unspentSkills < 1
        ) continue;
        const ranks = progression.skillRanks ??= {};
        const current = ranks[command.ability] ?? 1;
        const maximum = command.ability.startsWith("passive.") ? 3 : 5;
        if (current >= maximum) continue;
        const rank = (current + 1) as 2 | 3 | 4 | 5;
        ranks[command.ability] = rank;
        progression.unspentSkills -= 1;
        events.push({ type: "skill_ranked_up", actor: command.actor, ability: command.ability, rank });
        continue;
      }
      if (command.type === "reset_attributes") {
        if (!options.allowAttributeReset) continue;
        const progression = world.getComponent<ProgressionComponent>("progression", command.actor);
        if (!progression) continue;
        const values = Object.values(progression.allocated);
        if (values.some((value) => !Number.isInteger(value) || value < 10)) {
          throw new Error("allocated attributes must be integers at or above the starting value");
        }
        const refunded = values.reduce((total, value) => total + value - 10, 0);
        if (refunded === 0) continue;
        progression.allocated = { might: 10, finesse: 10, vitality: 10, resolve: 10 };
        progression.unspentAttributes += refunded;
        events.push({ type: "attributes_reset", actor: command.actor, refunded });
        continue;
      }
      if (command.type !== "allocate_attribute") continue;
      const progression = world.getComponent<ProgressionComponent>("progression", command.actor);
      if (!progression) continue;
      if (!Number.isInteger(command.amount) || command.amount < 1) {
        throw new Error(`attribute amount must be a positive integer: ${command.amount}`);
      }
      if (command.amount > progression.unspentAttributes) {
        throw new Error(`attribute amount exceeds unspent balance: ${command.amount}`);
      }
      progression.allocated[command.attribute] += command.amount;
      progression.unspentAttributes -= command.amount;
      events.push({
        type: "attribute_allocated",
        actor: command.actor,
        attribute: command.attribute,
        amount: command.amount,
      });
    }
  }

  grantExperience(
    world: World,
    actor: EntityId,
    amount: number,
    events: GameplayEvent[],
  ): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`experience cannot be negative or nonfinite: ${amount}`);
    }
    const progression = world.getComponent<ProgressionComponent>("progression", actor);
    if (!progression || amount === 0 || progression.level >= BALANCE_DATA.levelCap) return;
    const from = progression.level;
    progression.experience += amount;
    while (progression.level < BALANCE_DATA.levelCap) {
      const required = xpToNext(progression.level);
      if (progression.experience < required) break;
      progression.experience -= required;
      progression.level += 1;
      progression.unspentAttributes += BALANCE_DATA.attributePointsPerLevel;
      if (progression.level >= 3 && progression.level % BALANCE_DATA.skillPointEveryLevels === 1) {
        progression.unspentSkills += 1;
      }
    }
    if (progression.level === BALANCE_DATA.levelCap) progression.experience = 0;
    if (progression.level !== from) {
      events.push({ type: "progression_leveled", actor, from, to: progression.level });
    }
  }
}
