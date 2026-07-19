// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。
import type { AbilityDef } from "../Definitions";

export const ABILITY_DATA = [
  {
    "id": "ability.battle_focus",
    "name": "Battle Focus",
    "slot": "active",
    "tags": [
      "defense"
    ],
    "cooldown": 10,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.3,
    "telegraphSeconds": 0.1,
    "icon": "icon.skill.buff",
    "visual": "vfx.battle_focus",
    "effect": {
      "type": "sequence",
      "children": [
        {
          "type": "select_self"
        },
        {
          "type": "apply_status",
          "status": "status.battle_focus",
          "stacks": 1
        }
      ]
    },
    "rankBonuses": [
      {
        "rank": 3,
        "durationAdd": 2
      },
      {
        "rank": 5,
        "applyStatus": "status.battle_focus_master"
      }
    ]
  },
  {
    "id": "ability.ember_nova",
    "name": "Ember Nova",
    "slot": "active",
    "tags": [
      "area"
    ],
    "cooldown": 5,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.42,
    "telegraphSeconds": 0.18,
    "icon": "icon.skill.burst",
    "visual": "vfx.ember_nova",
    "effect": {
      "type": "delay",
      "seconds": 0.18,
      "child": {
        "type": "sequence",
        "children": [
          {
            "type": "query_circle",
            "center": "source",
            "radius": 3
          },
          {
            "type": "damage",
            "value": {
              "damageType": "fire",
              "minBase": 25,
              "maxBase": 25,
              "scalingStat": "skillPower",
              "coefficient": 1.05,
              "canCrit": true,
              "procCoefficient": 1
            }
          },
          {
            "type": "emit_visual",
            "visual": "vfx.ember_nova_impact"
          }
        ]
      }
    },
    "rankBonuses": [
      {
        "rank": 3,
        "radiusAdd": 0.3
      },
      {
        "rank": 5,
        "radiusAdd": 0.5
      }
    ]
  },
  {
    "id": "ability.frost_lance",
    "name": "霜枪",
    "slot": "active",
    "tags": [
      "area"
    ],
    "cooldown": 4,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.38,
    "telegraphSeconds": 0.14,
    "icon": "icon.skill.projectile",
    "visual": "vfx.frost_lance",
    "effect": {
      "type": "sequence",
      "children": [
        {
          "type": "query_line",
          "length": 8,
          "width": 0.5
        },
        {
          "type": "chain_targets",
          "range": 2.5,
          "maxTargets": 1
        },
        {
          "type": "damage",
          "value": {
            "damageType": "ice",
            "minBase": 12,
            "maxBase": 18,
            "scalingStat": "skillPower",
            "coefficient": 1.1,
            "canCrit": true,
            "procCoefficient": 1
          }
        },
        {
          "type": "apply_status",
          "status": "status.ice_slow",
          "stacks": 1
        },
        {
          "type": "emit_visual",
          "visual": "vfx.frost_lance_impact"
        }
      ]
    },
    "rankBonuses": [
      {
        "rank": 3,
        "targetCountAdd": 1
      },
      {
        "rank": 5,
        "targetCountAdd": 2
      }
    ]
  },
  {
    "id": "ability.gale_dash",
    "name": "疾风突进",
    "slot": "active",
    "tags": [
      "movement"
    ],
    "cooldown": 4.5,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.3,
    "telegraphSeconds": 0.08,
    "icon": "icon.skill.movement",
    "visual": "vfx.gale_dash",
    "effect": {
      "type": "sequence",
      "children": [
        {
          "type": "teleport_forward",
          "distance": 3.2
        },
        {
          "type": "query_cone",
          "range": 2.2,
          "frontDot": -0.1
        },
        {
          "type": "damage",
          "value": {
            "damageType": "storm",
            "minBase": 4,
            "maxBase": 8,
            "scalingStat": "skillPower",
            "coefficient": 0.55,
            "canCrit": true,
            "procCoefficient": 0.7
          }
        },
        {
          "type": "knockback",
          "distance": 1.2
        }
      ]
    },
    "rankBonuses": [
      {
        "rank": 3,
        "damageMultiplier": 1.15
      },
      {
        "rank": 5,
        "charges": 2
      }
    ]
  },
  {
    "id": "ability.hunter_volley",
    "name": "猎手齐射",
    "slot": "active",
    "tags": [
      "area"
    ],
    "cooldown": 5,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.4,
    "telegraphSeconds": 0.12,
    "icon": "icon.skill.projectile",
    "visual": "vfx.hunter_volley",
    "effect": {
      "type": "repeat",
      "count": 5,
      "interval": 0.05,
      "child": {
        "type": "spawn_projectile",
        "value": {
          "damageType": "physical",
          "minBase": 2,
          "maxBase": 4,
          "scalingStat": "rangedPower",
          "coefficient": 0.35,
          "canCrit": true,
          "procCoefficient": 0.35
        },
        "speed": 9,
        "lifetime": 2.2,
        "radius": 0.15
      }
    },
    "rankBonuses": [
      {
        "rank": 3,
        "targetCountAdd": 2
      },
      {
        "rank": 5,
        "targetCountAdd": 1,
        "damageMultiplier": 1.1
      }
    ]
  },
  {
    "id": "ability.ice_ring",
    "name": "冰环",
    "slot": "active",
    "tags": [
      "area",
      "defense"
    ],
    "cooldown": 7,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.48,
    "telegraphSeconds": 0.2,
    "icon": "icon.skill.control",
    "visual": "vfx.ice_ring",
    "effect": {
      "type": "sequence",
      "children": [
        {
          "type": "query_circle",
          "center": "source",
          "radius": 2.8
        },
        {
          "type": "damage",
          "value": {
            "damageType": "ice",
            "minBase": 8,
            "maxBase": 12,
            "scalingStat": "skillPower",
            "coefficient": 0.65,
            "canCrit": true,
            "procCoefficient": 0.8
          }
        },
        {
          "type": "apply_status",
          "status": "status.ice_slow",
          "stacks": 1
        },
        {
          "type": "emit_visual",
          "visual": "vfx.ice_ring_impact"
        }
      ]
    },
    "rankBonuses": [
      {
        "rank": 3,
        "applyStatus": "status.frozen"
      },
      {
        "rank": 5,
        "radiusAdd": 0.4
      }
    ]
  },
  {
    "id": "ability.molten_guard",
    "name": "Molten Guard",
    "slot": "active",
    "tags": [
      "defense",
      "area"
    ],
    "cooldown": 9,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.3,
    "telegraphSeconds": 0.1,
    "icon": "icon.skill.shield",
    "visual": "vfx.molten_guard",
    "effect": {
      "type": "sequence",
      "children": [
        {
          "type": "select_self"
        },
        {
          "type": "apply_status",
          "status": "status.molten_guard",
          "stacks": 1
        }
      ]
    },
    "rankBonuses": [
      {
        "rank": 3,
        "effect": {
          "type": "delay",
          "seconds": 3,
          "child": {
            "type": "sequence",
            "children": [
              {
                "type": "query_circle",
                "center": "source",
                "radius": 2.8
              },
              {
                "type": "damage",
                "value": {
                  "damageType": "fire",
                  "minBase": 10,
                  "maxBase": 14,
                  "scalingStat": "skillPower",
                  "coefficient": 0.45,
                  "canCrit": true,
                  "procCoefficient": 0.5
                }
              },
              {
                "type": "emit_visual",
                "visual": "vfx.molten_guard_explosion"
              }
            ]
          }
        }
      },
      {
        "rank": 5,
        "applyStatus": "status.molten_guard_master"
      }
    ]
  },
  {
    "id": "ability.poison_trap",
    "name": "毒素陷阱",
    "slot": "active",
    "tags": [
      "area"
    ],
    "cooldown": 6,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.45,
    "telegraphSeconds": 0.18,
    "icon": "icon.skill.trap",
    "visual": "vfx.poison_trap",
    "effect": {
      "type": "spawn_hazard",
      "radius": 2.2,
      "duration": 8,
      "interval": 1,
      "visual": "vfx.hazard.poison",
      "relation": "enemy",
      "child": {
        "type": "sequence",
        "children": [
          {
            "type": "damage",
            "value": {
              "damageType": "poison",
              "minBase": 6,
              "maxBase": 9,
              "scalingStat": "skillPower",
              "coefficient": 0.3,
              "canCrit": false,
              "procCoefficient": 0.35
            }
          },
          {
            "type": "apply_status",
            "status": "status.poisoned",
            "stacks": 1
          }
        ]
      }
    },
    "rankBonuses": [
      {
        "rank": 3,
        "radiusAdd": 0.4
      },
      {
        "rank": 5,
        "effect": {
          "type": "spawn_hazard",
          "radius": 2.2,
          "duration": 8,
          "interval": 1,
          "visual": "vfx.hazard.poison_double",
          "relation": "enemy",
          "child": {
            "type": "damage",
            "value": {
              "damageType": "poison",
              "minBase": 6,
              "maxBase": 9,
              "scalingStat": "skillPower",
              "coefficient": 0.3,
              "canCrit": false,
              "procCoefficient": 0.35
            }
          }
        }
      }
    ]
  },
  {
    "id": "ability.root_snare",
    "name": "缠根禁锢",
    "slot": "active",
    "tags": [
      "area",
      "defense"
    ],
    "cooldown": 8,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.5,
    "telegraphSeconds": 0.22,
    "icon": "icon.skill.control",
    "visual": "vfx.root_snare",
    "effect": {
      "type": "spawn_hazard",
      "radius": 2.4,
      "duration": 2,
      "interval": 0.5,
      "visual": "vfx.hazard.root",
      "relation": "enemy",
      "child": {
        "type": "sequence",
        "children": [
          {
            "type": "damage",
            "value": {
              "damageType": "poison",
              "minBase": 2,
              "maxBase": 5,
              "scalingStat": "skillPower",
              "coefficient": 0.2,
              "canCrit": false,
              "procCoefficient": 0.25
            }
          },
          {
            "type": "apply_status",
            "status": "status.rooted",
            "stacks": 1
          }
        ]
      }
    },
    "rankBonuses": [
      {
        "rank": 3,
        "effect": {
          "type": "spawn_hazard",
          "radius": 2.4,
          "duration": 2,
          "interval": 0.5,
          "visual": "vfx.hazard.root_vulnerable",
          "relation": "enemy",
          "child": {
            "type": "apply_status",
            "status": "status.vulnerable",
            "stacks": 1
          }
        }
      },
      {
        "rank": 5,
        "radiusAdd": 0.5
      }
    ]
  },
  {
    "id": "ability.shadow_step",
    "name": "Shadow Step",
    "slot": "active",
    "tags": [
      "movement"
    ],
    "cooldown": 4,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.28,
    "telegraphSeconds": 0.08,
    "icon": "icon.skill.movement",
    "visual": "vfx.shadow_step",
    "timeline": {
      "impactAt": 0.4
    },
    "effect": {
      "type": "sequence",
      "children": [
        {
          "type": "teleport_forward",
          "distance": 2.5
        },
        {
          "type": "query_cone",
          "range": 2.3,
          "frontDot": 0
        },
        {
          "type": "damage",
          "value": {
            "damageType": "physical",
            "minBase": 4,
            "maxBase": 8,
            "scalingStat": "meleePower",
            "coefficient": 0.85,
            "canCrit": true,
            "procCoefficient": 1
          }
        },
        {
          "type": "emit_visual",
          "visual": "vfx.shadow_step_impact"
        }
      ]
    },
    "rankBonuses": [
      {
        "rank": 3,
        "applyStatus": "status.vulnerable"
      },
      {
        "rank": 5,
        "effect": {
          "type": "delay",
          "seconds": 0.12,
          "child": {
            "type": "sequence",
            "children": [
              {
                "type": "damage",
                "value": {
                  "damageType": "physical",
                  "minBase": 2,
                  "maxBase": 4,
                  "scalingStat": "meleePower",
                  "coefficient": 0.45,
                  "canCrit": true,
                  "procCoefficient": 0.5
                }
              },
              {
                "type": "emit_visual",
                "visual": "vfx.shadow_step_afterimage"
              }
            ]
          }
        }
      }
    ]
  },
  {
    "id": "ability.storm_chain",
    "name": "连锁雷霆",
    "slot": "active",
    "tags": [
      "area"
    ],
    "cooldown": 5.5,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.44,
    "telegraphSeconds": 0.16,
    "icon": "icon.skill.projectile",
    "visual": "vfx.storm_chain",
    "effect": {
      "type": "sequence",
      "children": [
        {
          "type": "query_circle",
          "center": "aim",
          "radius": 4.5
        },
        {
          "type": "chain_targets",
          "range": 4.5,
          "maxTargets": 3
        },
        {
          "type": "damage",
          "value": {
            "damageType": "storm",
            "minBase": 8,
            "maxBase": 14,
            "scalingStat": "skillPower",
            "coefficient": 0.75,
            "canCrit": true,
            "procCoefficient": 0.7
          }
        },
        {
          "type": "emit_visual",
          "visual": "vfx.storm_chain_impact"
        }
      ]
    },
    "rankBonuses": [
      {
        "rank": 3,
        "targetCountAdd": 1
      },
      {
        "rank": 5,
        "targetCountAdd": 2
      }
    ]
  },
  {
    "id": "ability.warding_totem",
    "name": "守御图腾",
    "slot": "active",
    "tags": [
      "summon",
      "defense"
    ],
    "cooldown": 12,
    "charges": 1,
    "action": "skill",
    "actionTime": 0.55,
    "telegraphSeconds": 0.2,
    "icon": "icon.skill.totem",
    "visual": "vfx.warding_totem",
    "effect": {
      "type": "sequence",
      "children": [
        {
          "type": "spawn_summon",
          "actor": "summon.warding_totem",
          "duration": 6,
          "maxOwned": 1
        },
        {
          "type": "spawn_hazard",
          "radius": 3,
          "duration": 6,
          "interval": 0.5,
          "visual": "vfx.hazard.warding_totem",
          "relation": "ally",
          "child": {
            "type": "apply_status",
            "status": "status.warding_totem",
            "stacks": 1
          }
        }
      ]
    },
    "rankBonuses": [
      {
        "rank": 3,
        "effect": {
          "type": "spawn_hazard",
          "radius": 3,
          "duration": 6,
          "interval": 1,
          "visual": "vfx.hazard.warding_totem_heal",
          "relation": "ally",
          "child": {
            "type": "heal",
            "value": {
              "type": "stat",
              "stat": "maxHealth",
              "scale": 0.03
            }
          }
        }
      },
      {
        "rank": 5,
        "durationAdd": 2
      }
    ]
  }
] as const satisfies readonly AbilityDef[];
export const PLAYER_ABILITY_IDS = [
  "ability.battle_focus",
  "ability.ember_nova",
  "ability.frost_lance",
  "ability.gale_dash",
  "ability.hunter_volley",
  "ability.ice_ring",
  "ability.molten_guard",
  "ability.poison_trap",
  "ability.root_snare",
  "ability.shadow_step",
  "ability.storm_chain",
  "ability.warding_totem"
] as const;
export const ENEMY_ABILITY_IDS = [] as const;
