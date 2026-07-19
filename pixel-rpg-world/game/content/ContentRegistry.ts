import type {
  AbilityDef,
  AbilityDefInput,
  EffectNode,
  ItemDef,
  PassiveDef,
  StatModifierSet,
  StatusDef,
} from "./Definitions";
import { completeStatBlock, STAT_NAMES } from "./Definitions";
import type {
  ActorArchetypeDef,
  ActorVisualDef,
  AiActionDef,
} from "./ActorDefinitions";

export class ContentRegistry {
  private readonly abilities = new Map<string, AbilityDef>();
  private readonly statuses = new Map<string, StatusDef>();
  private readonly items = new Map<string, ItemDef>();
  private readonly passives = new Map<string, PassiveDef>();
  private readonly actors = new Map<string, ActorArchetypeDef>();
  private readonly visuals = new Map<string, ActorVisualDef>();

  registerAbility(input: AbilityDefInput): void {
    const definition: AbilityDef = {
      ...input,
      tags: input.tags ?? (input.slot === "active" ? [] : ["weapon"]),
      charges: input.charges ?? 1,
      telegraphSeconds: input.telegraphSeconds ?? 0,
      icon: input.icon ?? "icon.generic.unknown",
      rankBonuses: input.rankBonuses ?? [],
    };
    this.assertFree(definition.id);
    this.abilities.set(definition.id, definition);
  }

  registerStatus(definition: StatusDef): void {
    this.assertFree(definition.id);
    this.statuses.set(definition.id, definition);
  }

  registerItem(definition: ItemDef): void {
    this.assertFree(definition.id);
    this.items.set(definition.id, definition);
  }

  registerPassive(definition: PassiveDef): void {
    this.assertFree(definition.id);
    this.passives.set(definition.id, definition);
  }

  registerActor(definition: ActorArchetypeDef): void {
    this.assertFree(definition.id);
    this.actors.set(definition.id, definition);
  }

  registerVisual(definition: ActorVisualDef): void {
    this.assertFree(definition.id);
    this.visuals.set(definition.id, definition);
  }

  actor(id: string): ActorArchetypeDef {
    const definition = this.actors.get(id);
    if (!definition) throw new Error(`Unknown actor archetype: ${id}`);
    return definition;
  }

  visual(id: string): ActorVisualDef {
    const definition = this.visuals.get(id);
    if (!definition) throw new Error(`Unknown actor visual: ${id}`);
    return definition;
  }

  actorDefinitions(): readonly ActorArchetypeDef[] {
    return [...this.actors.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  visualDefinitions(): readonly ActorVisualDef[] {
    return [...this.visuals.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  ability(id: string): AbilityDef {
    const definition = this.abilities.get(id);
    if (!definition) throw new Error(`Unknown ability: ${id}`);
    return definition;
  }

  findAbility(id: string): AbilityDef | undefined {
    return this.abilities.get(id);
  }

  abilityDefinitions(): readonly AbilityDef[] {
    return [...this.abilities.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  passive(id: string): PassiveDef {
    const definition = this.passives.get(id);
    if (!definition) throw new Error(`Unknown passive: ${id}`);
    return definition;
  }

  findPassive(id: string): PassiveDef | undefined {
    return this.passives.get(id);
  }

  passiveDefinitions(): readonly PassiveDef[] {
    return [...this.passives.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  status(id: string): StatusDef {
    const definition = this.statuses.get(id);
    if (!definition) throw new Error(`Unknown status: ${id}`);
    return definition;
  }

  item(id: string): ItemDef {
    const definition = this.items.get(id);
    if (!definition) throw new Error(`Unknown item: ${id}`);
    return definition;
  }

  findItem(id: string): ItemDef | undefined {
    return this.items.get(id);
  }

  // 启动时一次性校验引用，运行中不容忍半坏内容。
  validate(): void {
    for (const ability of this.abilities.values()) {
      if (!ability.icon) throw new Error(`Ability ${ability.id} has no icon ID`);
      if (!ability.visual) throw new Error(`Ability ${ability.id} has no visual ID`);
      if (!Number.isFinite(ability.cooldown) || ability.cooldown < 0) {
        throw new Error(`Ability ${ability.id} cooldown must be non-negative`);
      }
      this.assertPositive(ability.actionTime, `${ability.id} action time`);
      if (
        !Number.isFinite(ability.telegraphSeconds)
        || ability.telegraphSeconds < 0
        || ability.telegraphSeconds > ability.actionTime
      ) {
        throw new Error(`Ability ${ability.id} telegraph must fit action time`);
      }
      if (ability.charges !== 1 && ability.charges !== 2) {
        throw new Error(`Ability ${ability.id} charges must equal one or two`);
      }
      const bonusRanks = new Set<number>();
      for (const bonus of ability.rankBonuses) {
        if (bonusRanks.has(bonus.rank)) throw new Error(`Ability ${ability.id} duplicate rank bonus`);
        bonusRanks.add(bonus.rank);
        if (bonus.rank !== 3 && bonus.rank !== 5) {
          throw new Error(`Ability ${ability.id} rank bonus must be rank 3 or 5`);
        }
        if (bonus.applyStatus) this.status(bonus.applyStatus);
        if (bonus.effect) this.validateEffect(bonus.effect);
      }
      const timeline = ability.timeline;
      if (timeline) {
        if (!Number.isFinite(timeline.impactAt) || timeline.impactAt < 0 || timeline.impactAt > 1) {
          throw new Error(`Ability ${ability.id} impactAt must be between zero and one`);
        }
        const motion = timeline.motion;
        if (motion) {
          this.assertPositive(motion.distance, `${ability.id} motion distance`);
          if (
            motion.startAt < 0
            || motion.endAt > 1
            || motion.startAt >= motion.endAt
          ) {
            throw new Error(`Ability ${ability.id} motion window is invalid`);
          }
        }
      }
      this.validateEffect(ability.effect);
    }
    for (const item of this.items.values()) {
      if (!item.visual) throw new Error(`Item ${item.id} has no visual ID`);
      const weaponSlot = item.slot === "melee" || item.slot === "ranged";
      if (weaponSlot && !item.ability) throw new Error(`Weapon ${item.id} has no ability`);
      if (!weaponSlot && item.ability) throw new Error(`Armor ${item.id} cannot equip an ability`);
      if (item.ability) {
        const ability = this.ability(item.ability);
        if (ability.slot !== item.slot) {
          throw new Error(`Item ${item.id} cannot equip ${ability.id} in ${item.slot}`);
        }
      }
      if (item.onHitStatus) this.status(item.onHitStatus);
      if (item.attackTags && item.attackTags.length === 0) {
        throw new Error(`Item ${item.id} attack tags cannot be empty`);
      }
      this.validateModifiers(item.modifiers, item.id);
      if (item.reinforce) {
        this.assertPositive(item.reinforce.perLevel, `${item.id} reinforce per level`);
        if (!Number.isInteger(item.reinforce.maxLevel) || item.reinforce.maxLevel <= 0) {
          throw new Error(`${item.id} reinforce max level must be a positive integer`);
        }
      }
    }
    for (const passive of this.passives.values()) {
      this.validateModifiers(passive.modifiers, passive.id);
      if (passive.rankModifiers) {
        if (passive.rankModifiers.length !== 3) {
          throw new Error(`${passive.id} requires exactly three passive rank modifiers`);
        }
        passive.rankModifiers.forEach((modifiers, index) => (
          this.validateModifiers(modifiers, `${passive.id} rank ${index + 1}`)
        ));
      }
      if (passive.onKillStatus) this.status(passive.onKillStatus);
    }
    for (const status of this.statuses.values()) {
      this.validateModifiers(status.modifiers, status.id);
    }
    for (const actor of this.actors.values()) this.validateActor(actor);
  }

  private assertFree(id: string): void {
    if (
      this.abilities.has(id)
      || this.statuses.has(id)
      || this.items.has(id)
      || this.passives.has(id)
      || this.actors.has(id)
      || this.visuals.has(id)
    ) {
      throw new Error(`Duplicate content ID: ${id}`);
    }
  }

  private validateActor(actor: ActorArchetypeDef): void {
    this.visual(actor.visual);
    if (!Number.isFinite(actor.radius) || actor.radius <= 0) {
      throw new Error(`Actor ${actor.id} radius must be positive`);
    }
    const stats = completeStatBlock(actor.stats);
    for (const name of STAT_NAMES) {
      if (!Number.isFinite(stats[name])) throw new Error(`${actor.id} ${name} must be finite`);
    }
    for (const name of ["maxHealth", "attackSpeed", "pickupRadius"] as const) {
      this.assertPositive(stats[name], `${actor.id} ${name}`);
    }
    if (stats.cooldownRecovery < 0) {
      throw new Error(`${actor.id} cooldownRecovery cannot be negative`);
    }
    if (actor.role === "hero" && (actor.ai || actor.boss)) {
      throw new Error(`Hero ${actor.id} cannot define AI or Boss phases`);
    }
    if (actor.role === "minion" && actor.boss) {
      throw new Error(`Minion ${actor.id} cannot define Boss phases`);
    }
    if (actor.role === "boss" && (!actor.ai || !actor.boss)) {
      throw new Error(`Boss ${actor.id} requires AI and phases`);
    }
    for (const [slot, abilityId] of Object.entries(actor.loadout.slots)) {
      if (!abilityId) continue;
      const ability = this.ability(abilityId);
      const compatible = slot === "melee" || slot === "ranged"
        ? ability.slot === slot
        : ability.slot === "active";
      if (!compatible) throw new Error(`Actor ${actor.id} cannot use ${ability.id} in ${slot}`);
    }
    for (const passiveId of Object.values(actor.loadout.passives)) {
      if (passiveId) this.passive(passiveId);
    }
    if (actor.ai) {
      this.assertPositive(actor.ai.thinkSeconds, `${actor.id} thinkSeconds`);
      if (
        actor.ai.warmupSeconds !== undefined
        && (!Number.isFinite(actor.ai.warmupSeconds) || actor.ai.warmupSeconds < 0)
      ) {
        throw new Error(`Actor ${actor.id} warmupSeconds must be non-negative`);
      }
      this.assertPositive(actor.ai.aggroRange, `${actor.id} aggroRange`);
      if (actor.ai.leashRange < actor.ai.aggroRange) {
        throw new Error(`Actor ${actor.id} leashRange must cover aggroRange`);
      }
      this.validateActions(actor, actor.ai.actions);
    }
    const phases = actor.boss?.phases ?? [];
    if (phases.length > 8) throw new Error(`Boss ${actor.id} exceeds eight phases`);
    if (actor.role === "boss" && phases.length !== 3) {
      throw new Error(`Boss ${actor.id} requires exactly three phases`);
    }
    if (phases.length > 0 && phases[0].startsAtHealthRatio !== 1) {
      throw new Error(`Boss ${actor.id} first phase must start at full health`);
    }
    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index];
      if (index > 0 && phase.startsAtHealthRatio >= phases[index - 1].startsAtHealthRatio) {
        throw new Error(`Boss ${actor.id} phase ratios must be strictly descending`);
      }
      this.assertPositive(phase.startsAtHealthRatio, `${phase.id} health ratio`);
      this.assertPositive(phase.speedMultiplier, `${phase.id} speed multiplier`);
      this.assertPositive(phase.enterDuration, `${phase.id} enter duration`);
      if (!phase.enterVisual) throw new Error(`Boss phase ${phase.id} requires an enter visual`);
      this.validateActions(actor, phase.actions);
    }
    for (const drop of actor.drops) {
      if (drop.type === "item") this.item(drop.item);
      if (drop.type === "ability" && !this.findAbility(drop.ability)) this.passive(drop.ability);
      if (drop.type === "material") this.assertPositive(drop.amount, `${actor.id} material drop`);
    }
  }

  private validateActions(actor: ActorArchetypeDef, actions: readonly AiActionDef[]): void {
    if (actions.length === 0 || actions.length > 8) {
      throw new Error(`Actor ${actor.id} requires one to eight AI actions`);
    }
    for (const action of actions) {
      if (!actor.loadout.slots[action.slot]) {
        throw new Error(`Actor ${actor.id} AI action ${action.slot} is not equipped`);
      }
      if (!Number.isFinite(action.minRange) || action.minRange < 0) {
        throw new Error(`Actor ${actor.id} AI minRange must be non-negative`);
      }
      if (!Number.isFinite(action.maxRange) || action.maxRange <= action.minRange) {
        throw new Error(`Actor ${actor.id} AI maxRange must exceed minRange`);
      }
      this.assertPositive(action.weight, `${actor.id} AI action weight`);
      const minimumTelegraph = actor.role === "boss" ? 0.55 : 0.25;
      if (!Number.isFinite(action.telegraphSeconds) || action.telegraphSeconds < minimumTelegraph) {
        throw new Error(`Actor ${actor.id} AI telegraph must be at least ${minimumTelegraph} seconds`);
      }
      if (!Number.isFinite(action.recoverySeconds) || action.recoverySeconds < 0) {
        throw new Error(`Actor ${actor.id} AI recovery must be non-negative`);
      }
      if (
        action.maxUsesPerPhase !== undefined
        && (!Number.isInteger(action.maxUsesPerPhase) || action.maxUsesPerPhase <= 0)
      ) {
        throw new Error(`Actor ${actor.id} maxUsesPerPhase must be a positive integer`);
      }
      for (const [name, value] of Object.entries(action.telegraph ?? {})) {
        if (name === "shape" || name === "damageType" || value === undefined) continue;
        this.assertPositive(value as number, `${actor.id} telegraph ${name}`);
      }
    }
  }

  private validateEffect(node: EffectNode): void {
    if (node.type === "sequence" || node.type === "parallel") {
      for (const child of node.children) this.validateEffect(child);
    }
    if (node.type === "delay") {
      this.assertPositive(node.seconds, "delay seconds");
      this.validateEffect(node.child);
    }
    if (node.type === "if_targets") {
      this.validateEffect(node.then);
      if (node.otherwise) this.validateEffect(node.otherwise);
    }
    if (node.type === "apply_status") {
      this.status(node.status);
      if (
        node.durationAdd !== undefined
        && (!Number.isFinite(node.durationAdd) || node.durationAdd < 0)
      ) {
        throw new Error("apply_status durationAdd must be finite and nonnegative");
      }
      if (
        node.periodicMagnitude !== undefined
        && (!Number.isFinite(node.periodicMagnitude) || node.periodicMagnitude < 0)
      ) {
        throw new Error("apply_status periodicMagnitude must be finite and nonnegative");
      }
    }
    if (node.type === "remove_status") this.status(node.status);
    if (node.type === "query_melee" || node.type === "query_cone") {
      this.assertPositive(node.range, `${node.type} range`);
    }
    if (node.type === "query_circle") this.assertPositive(node.radius, "query_circle radius");
    if (node.type === "query_line") {
      this.assertPositive(node.length, "query_line length");
      this.assertPositive(node.width, "query_line width");
    }
    if (node.type === "chain_targets") {
      this.assertPositive(node.range, "chain_targets range");
      if (!Number.isInteger(node.maxTargets) || node.maxTargets < 1 || node.maxTargets > 6) {
        throw new Error("chain_targets maxTargets must be an integer from one to six");
      }
    }
    if (node.type === "spawn_projectile") {
      this.assertPositive(node.speed, "projectile speed");
      this.assertPositive(node.lifetime, "projectile lifetime");
      this.assertPositive(node.radius, "projectile radius");
    }
    if (node.type === "knockback" || node.type === "teleport_forward") {
      this.assertPositive(node.distance, `${node.type} distance`);
    }
    if (node.type === "summon_actor") {
      this.actor(node.actor);
      if (!Number.isInteger(node.count) || node.count < 1 || node.count > 8) {
        throw new Error(`summon_actor count must be an integer from one to eight`);
      }
      this.assertPositive(node.radius, "summon_actor radius");
    }
    if (node.type === "spawn_hazard") {
      this.assertPositive(node.radius, "spawn_hazard radius");
      this.assertPositive(node.duration, "spawn_hazard duration");
      if (node.duration > 12) throw new Error("spawn_hazard duration cannot exceed 12 seconds");
      if (!Number.isFinite(node.interval) || node.interval < 0.25) {
        throw new Error("spawn_hazard interval must be at least 0.25 seconds");
      }
      if (!node.visual) throw new Error("spawn_hazard requires a visual ID");
      this.validateEffect(node.child);
    }
    if (node.type === "spawn_summon") {
      this.actor(node.actor);
      this.assertPositive(node.duration, "spawn_summon duration");
      if (!Number.isInteger(node.maxOwned) || node.maxOwned < 1 || node.maxOwned > 2) {
        throw new Error("spawn_summon maxOwned must be an integer from one to two");
      }
    }
    if (node.type === "repeat") {
      if (!Number.isInteger(node.count) || node.count < 1 || node.count > 5) {
        throw new Error("repeat count must be an integer from one to five");
      }
      this.assertPositive(node.interval, "repeat interval");
      this.validateEffect(node.child);
    }
    if (node.type === "damage" || node.type === "spawn_projectile") {
      if (
        !Number.isInteger(node.value.minBase)
        || !Number.isInteger(node.value.maxBase)
        || node.value.minBase < 0
        || node.value.maxBase < node.value.minBase
      ) {
        throw new Error(`${node.type} damage bounds must be ordered nonnegative integers`);
      }
      if (!Number.isFinite(node.value.coefficient) || node.value.coefficient < 0) {
        throw new Error(`${node.type} coefficient must be finite and nonnegative`);
      }
      if (!Number.isFinite(node.value.procCoefficient) || node.value.procCoefficient < 0) {
        throw new Error(`${node.type} procCoefficient must be finite and nonnegative`);
      }
    }
    if (node.type === "heal") {
      const amount = node.value.type === "flat" ? node.value.amount : node.value.scale;
      this.assertPositive(amount, `${node.type} value`);
    }
  }

  private validateModifiers(modifiers: StatModifierSet, label: string): void {
    for (const layer of ["flat", "percent", "final"] as const) {
      for (const [name, value] of Object.entries(modifiers[layer] ?? {})) {
        if (!STAT_NAMES.includes(name as typeof STAT_NAMES[number]) || !Number.isFinite(value)) {
          throw new Error(`${label} ${layer} modifier ${name} must be a finite known stat`);
        }
        if (layer !== "flat" && value <= -1) {
          throw new Error(`${label} ${layer} modifier ${name} must be greater than -1`);
        }
      }
    }
  }

  private assertPositive(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be positive`);
  }
}
