// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。

export const ITEM_CATALOG_DATA = {
  "schemaVersion": 1,
  "bases": [
    {
      "id": "item.base.axe",
      "slot": "melee",
      "iconFamily": "icon.weapon.axe",
      "visual": "equipment.weapon.frontier_axe",
      "theme": "theme.neutral",
      "coreStat": "meleePower",
      "baseMin": 1.05,
      "baseMax": 1.25,
      "affixTags": [
        "offense",
        "attribute"
      ]
    },
    {
      "id": "item.base.bow",
      "slot": "ranged",
      "iconFamily": "icon.weapon.bow",
      "visual": "equipment.weapon.hunter_bow",
      "theme": "theme.neutral",
      "coreStat": "rangedPower",
      "baseMin": 0.9,
      "baseMax": 1.1,
      "affixTags": [
        "offense",
        "attribute",
        "utility"
      ]
    },
    {
      "id": "item.base.chest",
      "slot": "chest",
      "iconFamily": "icon.armor.chest",
      "visual": "equipment.chest.traveler_tunic",
      "theme": "theme.neutral",
      "coreStat": "armor",
      "baseMin": 1,
      "baseMax": 1.3,
      "affixTags": [
        "defense",
        "resist",
        "attribute"
      ]
    },
    {
      "id": "item.base.crossbow",
      "slot": "ranged",
      "iconFamily": "icon.weapon.crossbow",
      "visual": "equipment.weapon.hunter_bow",
      "theme": "theme.tide",
      "coreStat": "rangedPower",
      "baseMin": 1.05,
      "baseMax": 1.25,
      "affixTags": [
        "offense",
        "attribute"
      ]
    },
    {
      "id": "item.base.feet",
      "slot": "feet",
      "iconFamily": "icon.armor.feet",
      "visual": "equipment.feet.traveler_boots",
      "theme": "theme.storm",
      "coreStat": "armor",
      "baseMin": 0.5,
      "baseMax": 0.7,
      "affixTags": [
        "defense",
        "resist",
        "utility"
      ]
    },
    {
      "id": "item.base.focus",
      "slot": "ranged",
      "iconFamily": "icon.weapon.focus",
      "visual": "equipment.weapon.hunter_bow",
      "theme": "theme.spore",
      "coreStat": "skillPower",
      "baseMin": 0.95,
      "baseMax": 1.15,
      "affixTags": [
        "offense",
        "resist",
        "utility"
      ]
    },
    {
      "id": "item.base.head",
      "slot": "head",
      "iconFamily": "icon.armor.head",
      "visual": "equipment.head.traveler_cap",
      "theme": "theme.neutral",
      "coreStat": "armor",
      "baseMin": 0.6,
      "baseMax": 0.8,
      "affixTags": [
        "defense",
        "resist",
        "attribute",
        "utility"
      ]
    },
    {
      "id": "item.base.legs",
      "slot": "legs",
      "iconFamily": "icon.armor.legs",
      "visual": "equipment.legs.traveler_pants",
      "theme": "theme.spore",
      "coreStat": "armor",
      "baseMin": 0.8,
      "baseMax": 1,
      "affixTags": [
        "defense",
        "resist",
        "attribute"
      ]
    },
    {
      "id": "item.base.longblade",
      "slot": "melee",
      "iconFamily": "icon.weapon.longblade",
      "visual": "equipment.weapon.rust_blade",
      "theme": "theme.ember",
      "coreStat": "meleePower",
      "baseMin": 1,
      "baseMax": 1.2,
      "affixTags": [
        "offense",
        "attribute",
        "utility"
      ]
    },
    {
      "id": "item.base.sword",
      "slot": "melee",
      "iconFamily": "icon.weapon.sword",
      "visual": "equipment.weapon.guard_sword",
      "theme": "theme.neutral",
      "coreStat": "meleePower",
      "baseMin": 0.9,
      "baseMax": 1.1,
      "affixTags": [
        "offense",
        "attribute",
        "utility"
      ]
    },
    {
      "id": "item.base.wrists",
      "slot": "wrists",
      "iconFamily": "icon.armor.wrists",
      "visual": "equipment.wrists.traveler_bracers",
      "theme": "theme.tide",
      "coreStat": "armor",
      "baseMin": 0.45,
      "baseMax": 0.65,
      "affixTags": [
        "defense",
        "offense",
        "utility"
      ]
    }
  ],
  "affixes": [
    {
      "id": "affix.attribute_finesse",
      "group": "attribute.finesse",
      "kind": "prefix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet",
        "melee",
        "ranged"
      ],
      "stat": "finesse",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.08,
          "maxFactor": 0.15
        }
      ]
    },
    {
      "id": "affix.attribute_might",
      "group": "attribute.might",
      "kind": "prefix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet",
        "melee"
      ],
      "stat": "might",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.08,
          "maxFactor": 0.15
        }
      ]
    },
    {
      "id": "affix.attribute_resolve",
      "group": "attribute.resolve",
      "kind": "prefix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet",
        "ranged"
      ],
      "stat": "resolve",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.08,
          "maxFactor": 0.15
        }
      ]
    },
    {
      "id": "affix.attribute_vitality",
      "group": "attribute.vitality",
      "kind": "prefix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet"
      ],
      "stat": "vitality",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.08,
          "maxFactor": 0.15
        }
      ]
    },
    {
      "id": "affix.defense_armor",
      "group": "defense.armor",
      "kind": "prefix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet"
      ],
      "stat": "armor",
      "core": true,
      "tiers": [
        {
          "minFactor": 0.3,
          "maxFactor": 0.55
        }
      ]
    },
    {
      "id": "affix.defense_health",
      "group": "defense.health",
      "kind": "prefix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet"
      ],
      "stat": "maxHealth",
      "core": true,
      "tiers": [
        {
          "minFactor": 0.8,
          "maxFactor": 1.2
        }
      ]
    },
    {
      "id": "affix.offense_attack_speed",
      "group": "offense.attack_speed",
      "kind": "suffix",
      "slots": [
        "melee",
        "ranged",
        "wrists"
      ],
      "stat": "attackSpeed",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.003,
          "maxFactor": 0.006
        }
      ]
    },
    {
      "id": "affix.offense_crit",
      "group": "offense.crit",
      "kind": "suffix",
      "slots": [
        "melee",
        "ranged",
        "head",
        "wrists"
      ],
      "stat": "critRating",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.2,
          "maxFactor": 0.35
        }
      ]
    },
    {
      "id": "affix.offense_crit_damage",
      "group": "offense.crit_damage",
      "kind": "suffix",
      "slots": [
        "melee",
        "ranged",
        "head",
        "wrists"
      ],
      "stat": "critDamage",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.003,
          "maxFactor": 0.006
        }
      ]
    },
    {
      "id": "affix.power_melee",
      "group": "power.melee",
      "kind": "prefix",
      "slots": [
        "melee",
        "head",
        "wrists"
      ],
      "stat": "meleePower",
      "core": true,
      "tiers": [
        {
          "minFactor": 0.12,
          "maxFactor": 0.22
        }
      ]
    },
    {
      "id": "affix.power_ranged",
      "group": "power.ranged",
      "kind": "prefix",
      "slots": [
        "ranged",
        "head",
        "wrists"
      ],
      "stat": "rangedPower",
      "core": true,
      "tiers": [
        {
          "minFactor": 0.12,
          "maxFactor": 0.22
        }
      ]
    },
    {
      "id": "affix.power_skill",
      "group": "power.skill",
      "kind": "prefix",
      "slots": [
        "ranged",
        "head",
        "wrists"
      ],
      "stat": "skillPower",
      "core": true,
      "tiers": [
        {
          "minFactor": 0.12,
          "maxFactor": 0.22
        }
      ]
    },
    {
      "id": "affix.resist_fire",
      "group": "resist.fire",
      "kind": "suffix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet",
        "melee",
        "ranged"
      ],
      "stat": "fireResist",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.004,
          "maxFactor": 0.008
        }
      ]
    },
    {
      "id": "affix.resist_ice",
      "group": "resist.ice",
      "kind": "suffix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet",
        "melee",
        "ranged"
      ],
      "stat": "iceResist",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.004,
          "maxFactor": 0.008
        }
      ]
    },
    {
      "id": "affix.resist_poison",
      "group": "resist.poison",
      "kind": "suffix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet",
        "melee",
        "ranged"
      ],
      "stat": "poisonResist",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.004,
          "maxFactor": 0.008
        }
      ]
    },
    {
      "id": "affix.resist_storm",
      "group": "resist.storm",
      "kind": "suffix",
      "slots": [
        "head",
        "chest",
        "wrists",
        "legs",
        "feet",
        "melee",
        "ranged"
      ],
      "stat": "stormResist",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.004,
          "maxFactor": 0.008
        }
      ]
    },
    {
      "id": "affix.utility_cooldown_recovery",
      "group": "utility.cooldown_recovery",
      "kind": "suffix",
      "slots": [
        "ranged",
        "head",
        "wrists"
      ],
      "stat": "cooldownRecovery",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.003,
          "maxFactor": 0.006
        }
      ]
    },
    {
      "id": "affix.utility_move_speed",
      "group": "utility.move_speed",
      "kind": "suffix",
      "slots": [
        "feet"
      ],
      "stat": "moveSpeed",
      "core": false,
      "tiers": [
        {
          "minFactor": 0.003,
          "maxFactor": 0.006
        }
      ]
    }
  ],
  "uniques": [
    {
      "id": "item.unique.blind_overseer_helm",
      "base": "item.base.head",
      "dungeon": "dungeon.frost_mine",
      "affixes": [
        "affix.defense_armor",
        "affix.defense_health",
        "affix.resist_ice",
        "affix.attribute_resolve"
      ]
    },
    {
      "id": "item.unique.copper_archive_bracers",
      "base": "item.base.wrists",
      "dungeon": "dungeon.sunken_library",
      "affixes": [
        "affix.defense_armor",
        "affix.resist_storm",
        "affix.offense_attack_speed",
        "affix.utility_cooldown_recovery"
      ]
    },
    {
      "id": "item.unique.frost_bell_hammer",
      "base": "item.base.axe",
      "dungeon": "dungeon.frost_mine",
      "affixes": [
        "affix.power_melee",
        "affix.attribute_might",
        "affix.offense_crit_damage",
        "affix.offense_attack_speed"
      ]
    },
    {
      "id": "item.unique.hearns_oathblade",
      "base": "item.base.longblade",
      "dungeon": "dungeon.production_foundation",
      "affixes": [
        "affix.power_melee",
        "affix.attribute_might",
        "affix.offense_crit",
        "affix.offense_attack_speed"
      ]
    },
    {
      "id": "item.unique.last_index_bow",
      "base": "item.base.bow",
      "dungeon": "dungeon.sunken_library",
      "affixes": [
        "affix.power_ranged",
        "affix.attribute_finesse",
        "affix.offense_crit",
        "affix.utility_cooldown_recovery"
      ]
    },
    {
      "id": "item.unique.prisoners_mantle",
      "base": "item.base.chest",
      "dungeon": "dungeon.production_foundation",
      "affixes": [
        "affix.defense_health",
        "affix.defense_armor",
        "affix.resist_fire",
        "affix.attribute_vitality"
      ]
    },
    {
      "id": "item.unique.regents_coil_blade",
      "base": "item.base.sword",
      "dungeon": "dungeon.storm_throne",
      "affixes": [
        "affix.power_melee",
        "affix.attribute_finesse",
        "affix.resist_storm",
        "affix.offense_crit"
      ]
    },
    {
      "id": "item.unique.rootbound_greaves",
      "base": "item.base.feet",
      "dungeon": "dungeon.moss_sanctum",
      "affixes": [
        "affix.defense_health",
        "affix.defense_armor",
        "affix.resist_poison",
        "affix.utility_move_speed"
      ]
    },
    {
      "id": "item.unique.sporecrown_focus",
      "base": "item.base.focus",
      "dungeon": "dungeon.moss_sanctum",
      "affixes": [
        "affix.power_skill",
        "affix.attribute_resolve",
        "affix.resist_poison",
        "affix.utility_cooldown_recovery"
      ]
    },
    {
      "id": "item.unique.thunder_crown",
      "base": "item.base.head",
      "dungeon": "dungeon.storm_throne",
      "affixes": [
        "affix.defense_armor",
        "affix.resist_storm",
        "affix.offense_crit_damage",
        "affix.utility_cooldown_recovery"
      ]
    }
  ]
} as const;
