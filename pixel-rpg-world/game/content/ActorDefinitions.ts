import type { ActorAction } from "../actor/ActorComponents";
import type { MaterialId } from "../item/ItemComponents";
import type {
  AbilitySlot,
  PassiveSlot,
  StatValues,
} from "./Definitions";

export type ActorRole = "hero" | "minion" | "boss";

export interface ActorAnimationMap extends Partial<Record<ActorAction, string>> {
  readonly idle: string;
}

export interface ActorAnimationDurationMap extends Partial<Record<ActorAction, number>> {
  readonly idle: number;
}

export interface ActorPlaybackDef {
  readonly layer: "full" | "upper";
  readonly exitAt: number;
  readonly blendSpeed: number;
}

export type ActorPlaybackMap = Partial<Record<ActorAction, ActorPlaybackDef>>;

// 事件点使用片段归一化时间，动作变速后仍会落在同一骨骼姿势上。
export interface ActorAnimationEventDef {
  readonly id: string;
  readonly at: number;
}

export interface ActorAnimationPlayback {
  readonly clip: string;
  readonly events: readonly ActorAnimationEventDef[];
}

// 所有人形共用语义动作契约，换模型时必须一次补齐，玩法层不依赖资源片段名。
export interface HumanoidActionClips {
  readonly melee: readonly [string, string, ...string[]];
  readonly bow: string;
  readonly cast: {
    readonly enter: string;
    readonly loop: string;
    readonly release: string;
    readonly exit: string;
  };
}

export interface ActorSocketDef {
  readonly node?: string;
  readonly fallback: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

export interface ActorVisualBudget {
  readonly maxBytes: number;
  readonly maxTriangles: number;
  readonly maxBones: number;
  readonly maxTextures: number;
  readonly maxAnimations: number;
}

export interface ActorLodDef {
  readonly maxAnimatedInstances: number;
  readonly fallback: "voxel";
}

export interface ActorVisualDef {
  readonly id: string;
  readonly appearance?: string;
  readonly asset: string;
  readonly url: string;
  readonly scale: number;
  readonly yOffset: number;
  readonly rotationY: number;
  readonly animations: ActorAnimationMap;
  readonly animationDurations: ActorAnimationDurationMap;
  readonly clipDurations: Readonly<Record<string, number>>;
  readonly humanoidActions?: HumanoidActionClips;
  readonly animationEvents?: Readonly<Record<string, readonly ActorAnimationEventDef[]>>;
  readonly playback: ActorPlaybackMap;
  readonly sockets: {
    readonly melee: ActorSocketDef;
    readonly ranged: ActorSocketDef;
  };
  readonly budget: ActorVisualBudget;
  readonly lod: ActorLodDef;
}

export interface ActorLoadoutDef {
  readonly slots: Readonly<Record<AbilitySlot, string | undefined>>;
  readonly passives: Readonly<Record<PassiveSlot, string | undefined>>;
}

export interface AiActionDef {
  readonly slot: AbilitySlot;
  readonly minRange: number;
  readonly maxRange: number;
  readonly weight: number;
  readonly telegraphSeconds: number;
  readonly recoverySeconds: number;
  readonly requiresLineOfSight: boolean;
  readonly maxUsesPerPhase?: number;
  readonly telegraph?: {
    readonly shape: "circle" | "cone" | "line";
    readonly damageType?: import("../combat/DamagePacket").DamageType;
    readonly radius?: number;
    readonly angle?: number;
    readonly length?: number;
    readonly width?: number;
  };
}

export interface AiProfileDef {
  readonly thinkSeconds: number;
  readonly warmupSeconds?: number;
  readonly aggroRange: number;
  readonly leashRange: number;
  readonly actions: readonly AiActionDef[];
}

export type ActorDropDef =
  | { readonly type: "item"; readonly item: string }
  | { readonly type: "ability"; readonly ability: string }
  | { readonly type: "material"; readonly material: MaterialId; readonly amount: number };

export interface BossPhaseDef {
  readonly id: string;
  readonly name: string;
  readonly startsAtHealthRatio: number;
  readonly speedMultiplier: number;
  readonly actions: readonly AiActionDef[];
  readonly enterDuration: number;
  readonly enterVisual: string;
  readonly clearPendingEffects: boolean;
}

export interface ActorArchetypeDef {
  readonly id: string;
  readonly name: string;
  readonly role: ActorRole;
  readonly visual: string;
  readonly stats: StatValues;
  readonly radius: number;
  readonly loadout: ActorLoadoutDef;
  readonly ai?: AiProfileDef;
  readonly boss?: {
    readonly phases: readonly BossPhaseDef[];
  };
  readonly drops: readonly ActorDropDef[];
}
