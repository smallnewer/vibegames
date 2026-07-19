// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。
import { hydrateDungeonPack, type DungeonPackSource } from "../../dungeon/DungeonDefinitions";

const DUNGEON_PACK_SOURCES = [
  {
    "schemaVersion": 1,
    "id": "dungeon.frost_mine",
    "name": "霜钟矿井",
    "lore": {
      "region": "北境界炉",
      "summary": "永冻矿井里仍保留着矿工宿舍、冰轨与升降钟，所有出口都被最后一任矿监封死。",
      "boss": {
        "name": "伊萨",
        "title": "盲眼矿监",
        "background": "他用永冻封住矿难亡魂，也封住了幸存者；每次钟响，他都以为救援队终于抵达。"
      }
    },
    "manifest": {
      "themeId": "theme.frost_mine",
      "resource": {
        "id": "frost_bell_shard",
        "name": "霜钟碎片"
      }
    },
    "map": {
      "mode": "production",
      "screenWidth": 18,
      "screenDepth": 12,
      "bounds": {
        "minX": -9,
        "maxX": 63,
        "minZ": -6,
        "maxZ": 42
      },
      "sections": [
        {
          "id": "section.frost_boss_a",
          "zone": "zone.frost_bell_pit",
          "name": "霜钟井底",
          "preset": "boss_arena",
          "gridX": 2,
          "gridZ": 3,
          "rotation": 0
        },
        {
          "id": "section.frost_boss_b",
          "zone": "zone.frost_bell_pit",
          "name": "霜钟井底",
          "preset": "boss_arena",
          "gridX": 3,
          "gridZ": 3,
          "rotation": 0
        },
        {
          "id": "section.frost_collapse",
          "zone": "zone.frost_collapse",
          "name": "塌方支井",
          "preset": "stone_corridor",
          "gridX": 0,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.frost_corridor",
          "zone": "zone.frost_junction",
          "name": "轨道交汇井",
          "preset": "stone_corridor",
          "gridX": 1,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.frost_entry",
          "zone": "zone.frost_mouth",
          "name": "封霜矿口",
          "preset": "entry_hall",
          "gridX": 0,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.frost_living",
          "zone": "zone.frost_bunks",
          "name": "矿工棚屋",
          "preset": "living_quarters",
          "gridX": 1,
          "gridZ": 0,
          "rotation": 0
        },
        {
          "id": "section.frost_training_a",
          "zone": "zone.frost_quarry",
          "name": "回声采掘大厅",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.frost_training_b",
          "zone": "zone.frost_quarry",
          "name": "回声采掘大厅",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.frost_training_c",
          "zone": "zone.frost_quarry",
          "name": "回声采掘大厅",
          "preset": "training_arena",
          "gridX": 1,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.frost_workshop",
          "zone": "zone.frost_liftworks",
          "name": "升降机房",
          "preset": "workshop",
          "gridX": 2,
          "gridZ": 0,
          "rotation": 0
        }
      ],
      "navigation": {
        "walkable": [
          {
            "id": "walkable.frost_boss_a",
            "x": 36,
            "z": 36,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_boss_b",
            "x": 54,
            "z": 36,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_collapse",
            "x": 0,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_corridor",
            "x": 18,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_entry",
            "x": 0,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_living",
            "x": 18,
            "z": 0,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_training_a",
            "x": 36,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_training_b",
            "x": 36,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_training_c",
            "x": 18,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.frost_workshop",
            "x": 36,
            "z": 0,
            "width": 18,
            "depth": 12
          }
        ],
        "blockers": [
          {
            "id": "blocker.wall_frost_boss_a_south_full",
            "x": 36,
            "z": 41.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_boss_a_west_full",
            "x": 27.28,
            "z": 36,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_boss_b_east_full",
            "x": 62.72,
            "z": 36,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_boss_b_north_full",
            "x": 54,
            "z": 30.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_boss_b_south_full",
            "x": 54,
            "z": 41.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_collapse_east_a",
            "x": 8.72,
            "z": 19.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_collapse_east_b",
            "x": 8.72,
            "z": 28.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_collapse_south_full",
            "x": 0,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_collapse_west_full",
            "x": -8.72,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_corridor_east_a",
            "x": 26.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_corridor_east_b",
            "x": 26.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_corridor_south_a",
            "x": 12.35,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_corridor_south_b",
            "x": 23.65,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_entry_east_a",
            "x": 8.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_entry_east_b",
            "x": 8.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_entry_north_full",
            "x": 0,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_entry_south_a",
            "x": -5.65,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_entry_south_b",
            "x": 5.65,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_entry_west_full",
            "x": -8.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_living_east_a",
            "x": 26.72,
            "z": -4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_living_east_b",
            "x": 26.72,
            "z": 4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_living_north_full",
            "x": 18,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_living_south_a",
            "x": 12.35,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_living_south_b",
            "x": 23.65,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_living_west_full",
            "x": 9.28,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_training_a_east_full",
            "x": 44.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_training_b_east_full",
            "x": 44.72,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_training_b_south_a",
            "x": 30.35,
            "z": 29.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_training_b_south_b",
            "x": 41.65,
            "z": 29.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_training_c_south_full",
            "x": 18,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_workshop_east_full",
            "x": 44.72,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_workshop_north_full",
            "x": 36,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_workshop_south_a",
            "x": 30.35,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_frost_workshop_south_b",
            "x": 41.65,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          }
        ]
      }
    },
    "spawnPoints": [
      {
        "id": "spawn.frost_player_1",
        "x": -6,
        "z": 12
      },
      {
        "id": "spawn.frost_player_2",
        "x": -7,
        "z": 12
      },
      {
        "id": "spawn.frost_player_3",
        "x": -6,
        "z": 13
      },
      {
        "id": "spawn.frost_player_4",
        "x": -7,
        "z": 13
      }
    ],
    "enemies": [
      {
        "id": "enemy.frost_boss",
        "kind": "boss.ember_colossus",
        "encounter": "encounter.frost_boss",
        "x": 45,
        "z": 36
      },
      {
        "id": "enemy.frost_guard_1",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.frost_boss",
        "x": 41,
        "z": 33
      },
      {
        "id": "enemy.frost_guard_2",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.frost_boss",
        "x": 41,
        "z": 39
      },
      {
        "id": "enemy.frost_guard_3",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.frost_boss",
        "x": 48,
        "z": 32
      },
      {
        "id": "enemy.frost_guard_4",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.frost_boss",
        "x": 48,
        "z": 40
      }
    ],
    "encounters": [
      {
        "id": "encounter.frost_boss",
        "members": [
          "enemy.frost_boss",
          "enemy.frost_guard_1",
          "enemy.frost_guard_2",
          "enemy.frost_guard_3",
          "enemy.frost_guard_4"
        ]
      }
    ],
    "interactions": [
      {
        "id": "interaction.frost_door",
        "name": "霜钟矿井王庭门",
        "kind": "door",
        "trigger": "interact",
        "x": 36,
        "z": 30,
        "radius": 1.8
      },
      {
        "id": "interaction.frost_encounter",
        "name": "霜钟矿井守卫",
        "kind": "encounter",
        "trigger": "enter",
        "encounter": "encounter.frost_boss",
        "x": 36,
        "z": 29,
        "radius": 2.2
      },
      {
        "id": "interaction.frost_portal",
        "name": "霜钟矿井归途",
        "kind": "portal",
        "trigger": "interact",
        "x": 58,
        "z": 36,
        "radius": 1.8,
        "destination": {
          "x": -6,
          "z": 12
        }
      },
      {
        "id": "interaction.frost_resource",
        "name": "霜钟碎片",
        "kind": "harvest",
        "trigger": "interact",
        "x": 18,
        "z": 0,
        "radius": 1.5,
        "reward": {
          "resource": "frost_bell_shard",
          "name": "霜钟碎片",
          "amount": 1
        }
      }
    ],
    "visual": {
      "profile": "voxel_dungeon",
      "clearColor": "#0c1824",
      "groundColor": "#354b59",
      "groundSize": 18,
      "palette": {
        "stone": {
          "base": "#55717e",
          "dark": "#263944",
          "light": "#9dc4cf"
        },
        "rock": {
          "base": "#324957",
          "dark": "#162630",
          "light": "#638494"
        },
        "metal": {
          "base": "#627987",
          "dark": "#2c3c48",
          "light": "#b7d3dc"
        },
        "wood": {
          "base": "#59473c",
          "dark": "#2a211d",
          "light": "#92745e"
        },
        "rune": {
          "base": "#244f70",
          "dark": "#10283b",
          "light": "#78e4ff"
        },
        "hazard": {
          "base": "#47b9dc",
          "dark": "#1e6487",
          "light": "#d5fbff"
        },
        "light": {
          "fill": "#b9d8e6",
          "key": "#e7fbff",
          "accent": "#68dcff",
          "fog": "#0c1c29"
        }
      },
      "enemy": {
        "stone": "#324957",
        "bone": "#9dc4cf",
        "crystal": "#78e4ff",
        "emissive": "#d5fbff",
        "projectile": "#78e4ff"
      },
      "interactions": {
        "harvest": {
          "color": "#244f70",
          "emissive": "#78e4ff"
        },
        "encounter": {
          "color": "#47b9dc",
          "emissive": "#d5fbff"
        },
        "doorStone": {
          "color": "#55717e",
          "emissive": "#162630"
        },
        "doorGate": {
          "color": "#627987",
          "emissive": "#2c3c48"
        },
        "portal": {
          "color": "#244f70",
          "emissive": "#10283b"
        },
        "portalActive": "#78e4ff"
      }
    },
    "assets": [],
    "placements": [],
    "decorations": [],
    "budgets": {
      "dynamicLights": 1,
      "estimatedDrawItems": 256,
      "estimatedTriangles": 20000
    }
  },
  {
    "schemaVersion": 1,
    "id": "dungeon.ice_room",
    "name": "霜镜密室",
    "lore": {
      "region": "霜钟矿井",
      "summary": "一间被永冻截断的矿井密室，冰层下仍回荡着旧升降钟的余音。",
      "boss": {
        "name": "霜镜守卫",
        "title": "井下残影",
        "background": "矿难后留下的守卫幻影，把每个闯入者都当成尚未撤离的矿工。"
      }
    },
    "manifest": {
      "themeId": "theme.frost_mirror",
      "resource": {
        "id": "frost_shard",
        "name": "霜晶碎片"
      }
    },
    "map": {
      "mode": "showcase",
      "screenWidth": 18,
      "screenDepth": 12,
      "bounds": {
        "minX": -9,
        "maxX": 9,
        "minZ": -6,
        "maxZ": 6
      },
      "sections": [
        {
          "id": "section.ice",
          "preset": "foundation_room",
          "gridX": 0,
          "gridZ": 0,
          "rotation": 0
        }
      ],
      "navigation": {
        "walkable": [
          {
            "id": "walkable.ice",
            "x": 0,
            "z": 0,
            "width": 18,
            "depth": 12
          }
        ],
        "blockers": [
          {
            "id": "blocker.ice_spire_a",
            "x": -5.6,
            "z": -4.8,
            "width": 0.7,
            "depth": 0.7,
            "height": 3.2
          },
          {
            "id": "blocker.ice_spire_c",
            "x": 5.6,
            "z": -4.8,
            "width": 0.8,
            "depth": 0.8,
            "height": 2.6
          }
        ]
      }
    },
    "spawnPoints": [
      {
        "id": "spawn.ice_player_1",
        "x": -4,
        "z": -2
      },
      {
        "id": "spawn.ice_player_2",
        "x": -3,
        "z": -2
      },
      {
        "id": "spawn.ice_player_3",
        "x": -4,
        "z": -1
      },
      {
        "id": "spawn.ice_player_4",
        "x": -3,
        "z": -1
      }
    ],
    "enemies": [
      {
        "id": "enemy.ice_sentinel",
        "kind": "enemy.crystal_turret",
        "encounter": "encounter.frost_gate",
        "x": 2.5,
        "z": 0
      }
    ],
    "encounters": [
      {
        "id": "encounter.frost_gate",
        "members": [
          "enemy.ice_sentinel"
        ]
      }
    ],
    "interactions": [
      {
        "id": "interaction.frost_gate_door",
        "name": "霜镜门",
        "kind": "door",
        "trigger": "interact",
        "x": 1.5,
        "z": 0,
        "radius": 1.4
      },
      {
        "id": "interaction.frost_gate_trigger",
        "name": "寒霜守卫遭遇",
        "kind": "encounter",
        "trigger": "enter",
        "encounter": "encounter.frost_gate",
        "x": -0.5,
        "z": 0,
        "radius": 1
      },
      {
        "id": "interaction.frost_shard",
        "name": "霜晶碎片",
        "kind": "harvest",
        "trigger": "interact",
        "x": -4,
        "z": -1,
        "radius": 1.4,
        "reward": {
          "resource": "frost_shard",
          "name": "霜晶碎片",
          "amount": 1
        }
      },
      {
        "id": "interaction.ice_return_portal",
        "name": "冰镜传送门",
        "kind": "portal",
        "trigger": "interact",
        "x": 3.8,
        "z": 0,
        "radius": 1.5,
        "destination": {
          "x": -4,
          "z": 2.5
        }
      }
    ],
    "visual": {
      "profile": "foundation",
      "clearColor": "#06101c",
      "groundColor": "#17354d",
      "groundSize": 14,
      "enemy": {
        "stone": "#213649",
        "bone": "#b9d9e8",
        "crystal": "#65d9ff",
        "emissive": "#237fa8",
        "projectile": "#8de8ff"
      },
      "interactions": {
        "harvest": {
          "color": "#b9ecff",
          "emissive": "#4eabc9"
        },
        "encounter": {
          "color": "#5ac8fa",
          "emissive": "#246b9b"
        },
        "doorStone": {
          "color": "#24445b",
          "emissive": "#0b1f32"
        },
        "doorGate": {
          "color": "#8bc9dc",
          "emissive": "#2d758e"
        },
        "portal": {
          "color": "#487aa3",
          "emissive": "#183a5a"
        },
        "portalActive": "#c5f5ff"
      }
    },
    "assets": [],
    "placements": [],
    "decorations": [
      {
        "id": "decoration.ice_altar",
        "x": -0.5,
        "y": 0.2,
        "z": 2.8,
        "width": 2.2,
        "height": 0.4,
        "depth": 1.4,
        "color": "#315d76",
        "emissive": "#123d59"
      },
      {
        "id": "decoration.ice_spire_a",
        "x": -5.6,
        "y": 1.6,
        "z": -4.8,
        "width": 0.7,
        "height": 3.2,
        "depth": 0.7,
        "color": "#74cce7",
        "emissive": "#1e617b"
      },
      {
        "id": "decoration.ice_spire_b",
        "x": -5.6,
        "y": 1.2,
        "z": 4.8,
        "width": 0.8,
        "height": 2.4,
        "depth": 0.8,
        "color": "#74cce7",
        "emissive": "#1e617b"
      },
      {
        "id": "decoration.ice_spire_c",
        "x": 5.6,
        "y": 1.3,
        "z": -4.8,
        "width": 0.8,
        "height": 2.6,
        "depth": 0.8,
        "color": "#74cce7",
        "emissive": "#1e617b"
      },
      {
        "id": "decoration.ice_spire_d",
        "x": 5.6,
        "y": 1.7,
        "z": 4.8,
        "width": 0.7,
        "height": 3.4,
        "depth": 0.7,
        "color": "#74cce7",
        "emissive": "#1e617b"
      },
      {
        "id": "decoration.ice_wall_north",
        "x": 0,
        "y": 1,
        "z": -6.4,
        "width": 13,
        "height": 2,
        "depth": 0.45,
        "color": "#173047"
      },
      {
        "id": "decoration.ice_wall_south",
        "x": 0,
        "y": 1,
        "z": 6.4,
        "width": 13,
        "height": 2,
        "depth": 0.45,
        "color": "#173047"
      }
    ],
    "budgets": {
      "dynamicLights": 1,
      "estimatedDrawItems": 72,
      "estimatedTriangles": 6000
    }
  },
  {
    "schemaVersion": 1,
    "id": "dungeon.lava_showcase",
    "name": "熔火王座",
    "lore": {
      "region": "余烬监城",
      "summary": "从余烬监城截取的单厅演示，王座与熔流仍保留着守炉时代的样貌。",
      "boss": {
        "name": "赫恩之影",
        "title": "铁誓残像",
        "background": "典狱长留在王座前的一段战斗记忆，只会重复最后一次守城。"
      }
    },
    "manifest": {
      "themeId": "theme.lava_fortress",
      "resource": {
        "id": "ember_crystal",
        "name": "余烬晶核"
      }
    },
    "map": {
      "mode": "showcase",
      "screenWidth": 18,
      "screenDepth": 12,
      "bounds": {
        "minX": -9,
        "maxX": 9,
        "minZ": -6,
        "maxZ": 6
      },
      "sections": [
        {
          "id": "section.lava_bridge",
          "preset": "lava_bridge_arena",
          "gridX": 0,
          "gridZ": 0,
          "rotation": 0
        }
      ],
      "navigation": {
        "walkable": [
          {
            "id": "walkable.lava_room",
            "x": 0,
            "z": 0,
            "width": 18,
            "depth": 12
          }
        ],
        "blockers": [
          {
            "id": "blocker.lava_pool_left",
            "x": -4,
            "z": 3.8,
            "width": 6,
            "depth": 3,
            "height": 2
          },
          {
            "id": "blocker.lava_pool_right",
            "x": 4,
            "z": 3.8,
            "width": 6,
            "depth": 3,
            "height": 2
          }
        ]
      }
    },
    "spawnPoints": [
      {
        "id": "spawn.lava_player_1",
        "x": -6,
        "z": 0
      },
      {
        "id": "spawn.lava_player_2",
        "x": -7,
        "z": 0
      },
      {
        "id": "spawn.lava_player_3",
        "x": -6,
        "z": 1
      },
      {
        "id": "spawn.lava_player_4",
        "x": -7,
        "z": 1
      }
    ],
    "enemies": [
      {
        "id": "enemy.ember_warden",
        "kind": "boss.ember_colossus",
        "encounter": "encounter.ember_throne",
        "x": 2,
        "z": 0
      }
    ],
    "encounters": [
      {
        "id": "encounter.ember_throne",
        "members": [
          "enemy.ember_warden"
        ]
      }
    ],
    "interactions": [
      {
        "id": "interaction.ember_crystal",
        "name": "余烬晶核",
        "kind": "harvest",
        "trigger": "interact",
        "x": -6,
        "z": 1,
        "radius": 1.4,
        "reward": {
          "resource": "ember_crystal",
          "name": "余烬晶核",
          "amount": 1
        }
      },
      {
        "id": "interaction.ember_return_portal",
        "name": "熔火传送门",
        "kind": "portal",
        "trigger": "interact",
        "x": 7,
        "z": 0,
        "radius": 1.5,
        "destination": {
          "x": -7,
          "z": -3
        }
      },
      {
        "id": "interaction.ember_throne_door",
        "name": "王座闸门",
        "kind": "door",
        "trigger": "interact",
        "x": 4,
        "z": 0,
        "radius": 1.5
      },
      {
        "id": "interaction.ember_throne_trigger",
        "name": "熔火守卫遭遇",
        "kind": "encounter",
        "trigger": "enter",
        "encounter": "encounter.ember_throne",
        "x": -1,
        "z": 0,
        "radius": 1
      }
    ],
    "visual": {
      "profile": "lava_fortress",
      "clearColor": "#070304",
      "groundColor": "#241519",
      "groundSize": 18,
      "enemy": {
        "stone": "#2c2428",
        "bone": "#b9a58a",
        "crystal": "#ff6a24",
        "emissive": "#ff2f0a",
        "projectile": "#ff7a2b"
      },
      "interactions": {
        "harvest": {
          "color": "#f5a43b",
          "emissive": "#d34a12"
        },
        "encounter": {
          "color": "#b73220",
          "emissive": "#ff3b12"
        },
        "doorStone": {
          "color": "#31262b",
          "emissive": "#090607"
        },
        "doorGate": {
          "color": "#77503a",
          "emissive": "#44170d"
        },
        "portal": {
          "color": "#7a291b",
          "emissive": "#d43c17"
        },
        "portalActive": "#ffb13b"
      }
    },
    "assets": [
      {
        "id": "asset.forge_crate",
        "kind": "model",
        "url": "/game-assets/props/box.glb"
      }
    ],
    "placements": [
      {
        "id": "placement.forge_crate_a",
        "asset": "asset.forge_crate",
        "section": "section.lava_bridge",
        "x": -4.7,
        "y": 0.2,
        "z": -2.4,
        "rotationY": 0.4,
        "scale": 0.7
      },
      {
        "id": "placement.forge_crate_b",
        "asset": "asset.forge_crate",
        "section": "section.lava_bridge",
        "x": 5.4,
        "y": 0.2,
        "z": -2.2,
        "rotationY": -0.5,
        "scale": 0.55
      }
    ],
    "decorations": [
      {
        "id": "decoration.lava_back_wall",
        "x": 0,
        "y": 1.5,
        "z": -5.7,
        "width": 18,
        "height": 3,
        "depth": 0.6,
        "color": "#24191d"
      },
      {
        "id": "decoration.lava_bridge",
        "x": 0,
        "y": 0.15,
        "z": 0,
        "width": 16,
        "height": 0.3,
        "depth": 4,
        "color": "#3a292a"
      },
      {
        "id": "decoration.lava_pillar_a",
        "x": -6.8,
        "y": 2,
        "z": -4.4,
        "width": 1.2,
        "height": 4,
        "depth": 1.2,
        "color": "#302225"
      },
      {
        "id": "decoration.lava_pillar_b",
        "x": -2.4,
        "y": 2.4,
        "z": -4.6,
        "width": 1.2,
        "height": 4.8,
        "depth": 1.2,
        "color": "#302225"
      },
      {
        "id": "decoration.lava_pillar_c",
        "x": 2.4,
        "y": 2.4,
        "z": -4.6,
        "width": 1.2,
        "height": 4.8,
        "depth": 1.2,
        "color": "#302225"
      },
      {
        "id": "decoration.lava_pillar_d",
        "x": 6.8,
        "y": 2,
        "z": -4.4,
        "width": 1.2,
        "height": 4,
        "depth": 1.2,
        "color": "#302225"
      },
      {
        "id": "decoration.lava_pool_left",
        "x": -4,
        "y": 0.03,
        "z": 3.8,
        "width": 6,
        "height": 0.06,
        "depth": 3,
        "color": "#ff4a12",
        "emissive": "#ff2408"
      },
      {
        "id": "decoration.lava_pool_right",
        "x": 4,
        "y": 0.03,
        "z": 3.8,
        "width": 6,
        "height": 0.06,
        "depth": 3,
        "color": "#ff4a12",
        "emissive": "#ff2408"
      }
    ],
    "budgets": {
      "dynamicLights": 1,
      "estimatedDrawItems": 160,
      "estimatedTriangles": 12000
    }
  },
  {
    "schemaVersion": 1,
    "id": "dungeon.moss_sanctum",
    "name": "苔王圣所",
    "lore": {
      "region": "翠壤界炉",
      "summary": "朝圣营地、药圃和孢子工房已经被同一片菌丝连成会呼吸的地下圣所。",
      "boss": {
        "name": "奥恩",
        "title": "药师王",
        "background": "他用菌群复活饥荒死者，最终失去自我，成为所有复生者共同说话的一张嘴。"
      }
    },
    "manifest": {
      "themeId": "theme.moss_sanctum",
      "resource": {
        "id": "heart_spore",
        "name": "心脉孢子"
      }
    },
    "map": {
      "mode": "production",
      "screenWidth": 18,
      "screenDepth": 12,
      "bounds": {
        "minX": -9,
        "maxX": 81,
        "minZ": -6,
        "maxZ": 30
      },
      "sections": [
        {
          "id": "section.moss_boss_a",
          "zone": "zone.moss_mother_altar",
          "name": "母菌圣坛",
          "preset": "boss_arena",
          "gridX": 3,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.moss_boss_b",
          "zone": "zone.moss_mother_altar",
          "name": "母菌圣坛",
          "preset": "boss_arena",
          "gridX": 4,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.moss_corridor",
          "zone": "zone.moss_root_hall",
          "name": "根须议厅",
          "preset": "stone_corridor",
          "gridX": 3,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.moss_entry",
          "zone": "zone.moss_pilgrim_gate",
          "name": "朝圣藤门",
          "preset": "entry_hall",
          "gridX": 0,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.moss_living",
          "zone": "zone.moss_camp",
          "name": "朝圣者营地",
          "preset": "living_quarters",
          "gridX": 1,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.moss_nursery",
          "zone": "zone.moss_nursery",
          "name": "复生育床",
          "preset": "stone_corridor",
          "gridX": 1,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.moss_training_a",
          "zone": "zone.moss_garden",
          "name": "菌群药圃",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 0,
          "rotation": 0
        },
        {
          "id": "section.moss_training_b",
          "zone": "zone.moss_garden",
          "name": "菌群药圃",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.moss_training_c",
          "zone": "zone.moss_garden",
          "name": "菌群药圃",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.moss_workshop",
          "zone": "zone.moss_sporeworks",
          "name": "孢子工房",
          "preset": "workshop",
          "gridX": 1,
          "gridZ": 0,
          "rotation": 0
        }
      ],
      "navigation": {
        "walkable": [
          {
            "id": "walkable.moss_boss_a",
            "x": 54,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_boss_b",
            "x": 72,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_corridor",
            "x": 54,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_entry",
            "x": 0,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_living",
            "x": 18,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_nursery",
            "x": 18,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_training_a",
            "x": 36,
            "z": 0,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_training_b",
            "x": 36,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_training_c",
            "x": 36,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.moss_workshop",
            "x": 18,
            "z": 0,
            "width": 18,
            "depth": 12
          }
        ],
        "blockers": [
          {
            "id": "blocker.wall_moss_boss_a_south_full",
            "x": 54,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_boss_b_east_full",
            "x": 80.72,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_boss_b_north_full",
            "x": 72,
            "z": 18.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_boss_b_south_full",
            "x": 72,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_corridor_east_full",
            "x": 62.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_corridor_north_full",
            "x": 54,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_corridor_south_a",
            "x": 48.35,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_corridor_south_b",
            "x": 59.65,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_entry_east_a",
            "x": 8.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_entry_east_b",
            "x": 8.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_entry_north_full",
            "x": 0,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_entry_south_full",
            "x": 0,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_entry_west_full",
            "x": -8.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_living_east_a",
            "x": 26.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_living_east_b",
            "x": 26.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_living_south_a",
            "x": 12.35,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_living_south_b",
            "x": 23.65,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_nursery_east_a",
            "x": 26.72,
            "z": 19.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_nursery_east_b",
            "x": 26.72,
            "z": 28.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_nursery_south_full",
            "x": 18,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_nursery_west_full",
            "x": 9.28,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_training_a_east_full",
            "x": 44.72,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_training_a_north_full",
            "x": 36,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_training_b_east_a",
            "x": 44.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_training_b_east_b",
            "x": 44.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_training_c_east_a",
            "x": 44.72,
            "z": 19.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_training_c_east_b",
            "x": 44.72,
            "z": 28.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_training_c_south_full",
            "x": 36,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_workshop_east_a",
            "x": 26.72,
            "z": -4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_workshop_east_b",
            "x": 26.72,
            "z": 4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_workshop_north_full",
            "x": 18,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_workshop_south_a",
            "x": 12.35,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_workshop_south_b",
            "x": 23.65,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_moss_workshop_west_full",
            "x": 9.28,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          }
        ]
      }
    },
    "spawnPoints": [
      {
        "id": "spawn.moss_player_1",
        "x": -6,
        "z": 12
      },
      {
        "id": "spawn.moss_player_2",
        "x": -7,
        "z": 12
      },
      {
        "id": "spawn.moss_player_3",
        "x": -6,
        "z": 13
      },
      {
        "id": "spawn.moss_player_4",
        "x": -7,
        "z": 13
      }
    ],
    "enemies": [
      {
        "id": "enemy.moss_boss",
        "kind": "boss.ember_colossus",
        "encounter": "encounter.moss_boss",
        "x": 63,
        "z": 24
      },
      {
        "id": "enemy.moss_guard_1",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.moss_boss",
        "x": 59,
        "z": 21
      },
      {
        "id": "enemy.moss_guard_2",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.moss_boss",
        "x": 59,
        "z": 27
      },
      {
        "id": "enemy.moss_guard_3",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.moss_boss",
        "x": 66,
        "z": 20
      },
      {
        "id": "enemy.moss_guard_4",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.moss_boss",
        "x": 66,
        "z": 28
      }
    ],
    "encounters": [
      {
        "id": "encounter.moss_boss",
        "members": [
          "enemy.moss_boss",
          "enemy.moss_guard_1",
          "enemy.moss_guard_2",
          "enemy.moss_guard_3",
          "enemy.moss_guard_4"
        ]
      }
    ],
    "interactions": [
      {
        "id": "interaction.moss_door",
        "name": "苔王圣所王庭门",
        "kind": "door",
        "trigger": "interact",
        "x": 54,
        "z": 18,
        "radius": 1.8
      },
      {
        "id": "interaction.moss_encounter",
        "name": "苔王圣所守卫",
        "kind": "encounter",
        "trigger": "enter",
        "encounter": "encounter.moss_boss",
        "x": 54,
        "z": 17,
        "radius": 2.2
      },
      {
        "id": "interaction.moss_portal",
        "name": "苔王圣所归途",
        "kind": "portal",
        "trigger": "interact",
        "x": 77,
        "z": 24,
        "radius": 1.8,
        "destination": {
          "x": -6,
          "z": 12
        }
      },
      {
        "id": "interaction.moss_resource",
        "name": "心脉孢子",
        "kind": "harvest",
        "trigger": "interact",
        "x": 18,
        "z": 24,
        "radius": 1.5,
        "reward": {
          "resource": "heart_spore",
          "name": "心脉孢子",
          "amount": 1
        }
      }
    ],
    "visual": {
      "profile": "voxel_dungeon",
      "clearColor": "#101a10",
      "groundColor": "#40513a",
      "groundSize": 18,
      "palette": {
        "stone": {
          "base": "#5b6750",
          "dark": "#2b3427",
          "light": "#97a77e"
        },
        "rock": {
          "base": "#344333",
          "dark": "#18231a",
          "light": "#64755a"
        },
        "metal": {
          "base": "#636756",
          "dark": "#303427",
          "light": "#aa9d72"
        },
        "wood": {
          "base": "#60472f",
          "dark": "#2c2116",
          "light": "#9b7549"
        },
        "rune": {
          "base": "#4e3159",
          "dark": "#24162b",
          "light": "#d98aff"
        },
        "hazard": {
          "base": "#718d2f",
          "dark": "#354b18",
          "light": "#cbea69"
        },
        "light": {
          "fill": "#c5d2af",
          "key": "#f1e6bd",
          "accent": "#b979dc",
          "fog": "#132015"
        }
      },
      "enemy": {
        "stone": "#344333",
        "bone": "#97a77e",
        "crystal": "#d98aff",
        "emissive": "#cbea69",
        "projectile": "#d98aff"
      },
      "interactions": {
        "harvest": {
          "color": "#4e3159",
          "emissive": "#d98aff"
        },
        "encounter": {
          "color": "#718d2f",
          "emissive": "#cbea69"
        },
        "doorStone": {
          "color": "#5b6750",
          "emissive": "#18231a"
        },
        "doorGate": {
          "color": "#636756",
          "emissive": "#303427"
        },
        "portal": {
          "color": "#4e3159",
          "emissive": "#24162b"
        },
        "portalActive": "#d98aff"
      }
    },
    "assets": [],
    "placements": [],
    "decorations": [],
    "budgets": {
      "dynamicLights": 1,
      "estimatedDrawItems": 256,
      "estimatedTriangles": 20000
    }
  },
  {
    "schemaVersion": 1,
    "id": "dungeon.production_foundation",
    "name": "余烬监城",
    "lore": {
      "region": "余烬监城",
      "summary": "旧王国的守炉监城，难民生活区、军械区和审判庭被一道永不解除的军令封锁。",
      "boss": {
        "name": "赫恩",
        "title": "铁誓典狱长",
        "background": "战败后他把难民和士兵一同锁进堡垒，直到今天仍坚信开门等于叛国。"
      }
    },
    "manifest": {
      "themeId": "theme.ember_bastion",
      "resource": {
        "id": "ember_crystal",
        "name": "余烬炉心"
      }
    },
    "map": {
      "mode": "production",
      "screenWidth": 18,
      "screenDepth": 12,
      "bounds": {
        "minX": -9,
        "maxX": 81,
        "minZ": -6,
        "maxZ": 30
      },
      "sections": [
        {
          "id": "section.ember_boss_a",
          "zone": "zone.ember_judgement",
          "name": "封城审判庭",
          "preset": "boss_arena",
          "gridX": 4,
          "gridZ": 0,
          "rotation": 0
        },
        {
          "id": "section.ember_boss_b",
          "zone": "zone.ember_judgement",
          "name": "封城审判庭",
          "preset": "boss_arena",
          "gridX": 4,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.ember_corridor",
          "zone": "zone.ember_armory_gallery",
          "name": "军械门廊",
          "preset": "stone_corridor",
          "gridX": 1,
          "gridZ": 0,
          "rotation": 0
        },
        {
          "id": "section.ember_entry",
          "zone": "zone.ember_gate",
          "name": "难民关城门",
          "preset": "entry_hall",
          "gridX": 0,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.ember_living",
          "zone": "zone.ember_refuge",
          "name": "难民牢区",
          "preset": "living_quarters",
          "gridX": 1,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.ember_prison",
          "zone": "zone.ember_cells",
          "name": "弃置牢翼",
          "preset": "living_quarters",
          "gridX": 1,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.ember_training_a",
          "zone": "zone.ember_drill_court",
          "name": "三旗操练庭",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 0,
          "rotation": 0
        },
        {
          "id": "section.ember_training_b",
          "zone": "zone.ember_drill_court",
          "name": "三旗操练庭",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.ember_training_c",
          "zone": "zone.ember_drill_court",
          "name": "三旗操练庭",
          "preset": "training_arena",
          "gridX": 3,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.ember_workshop",
          "zone": "zone.ember_forge",
          "name": "典狱锻炉",
          "preset": "workshop",
          "gridX": 3,
          "gridZ": 0,
          "rotation": 0
        }
      ],
      "navigation": {
        "walkable": [
          {
            "id": "walkable.ember_boss_a",
            "x": 72,
            "z": 0,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_boss_b",
            "x": 72,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_corridor",
            "x": 18,
            "z": 0,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_entry",
            "x": 0,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_living",
            "x": 18,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_prison",
            "x": 18,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_training_a",
            "x": 36,
            "z": 0,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_training_b",
            "x": 36,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_training_c",
            "x": 54,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.ember_workshop",
            "x": 54,
            "z": 0,
            "width": 18,
            "depth": 12
          }
        ],
        "blockers": [
          {
            "id": "blocker.wall_ember_boss_a_east_full",
            "x": 80.72,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_boss_a_north_full",
            "x": 72,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_boss_b_east_full",
            "x": 80.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_boss_b_south_full",
            "x": 72,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_corridor_east_a",
            "x": 26.72,
            "z": -4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_corridor_east_b",
            "x": 26.72,
            "z": 4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_corridor_north_full",
            "x": 18,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_corridor_south_a",
            "x": 12.35,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_corridor_south_b",
            "x": 23.65,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_corridor_west_full",
            "x": 9.28,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_entry_east_a",
            "x": 8.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_entry_east_b",
            "x": 8.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_entry_north_full",
            "x": 0,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_entry_south_full",
            "x": 0,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_entry_west_full",
            "x": -8.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_living_east_a",
            "x": 26.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_living_east_b",
            "x": 26.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_living_south_a",
            "x": 12.35,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_living_south_b",
            "x": 23.65,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_prison_east_full",
            "x": 26.72,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_prison_south_full",
            "x": 18,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_prison_west_full",
            "x": 9.28,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_training_a_east_a",
            "x": 44.72,
            "z": -4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_training_a_east_b",
            "x": 44.72,
            "z": 4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_training_a_north_full",
            "x": 36,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_training_b_south_full",
            "x": 36,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_training_c_east_a",
            "x": 62.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_training_c_east_b",
            "x": 62.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_training_c_south_full",
            "x": 54,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_workshop_east_a",
            "x": 62.72,
            "z": -4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_workshop_east_b",
            "x": 62.72,
            "z": 4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_workshop_north_full",
            "x": 54,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_workshop_south_a",
            "x": 48.35,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_ember_workshop_south_b",
            "x": 59.65,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          }
        ]
      }
    },
    "run": {
      "gameplayVersion": 1,
      "levelBand": {
        "normal": [
          1,
          4
        ],
        "echo": [
          16,
          20
        ]
      },
      "entrySection": "section.ember_entry",
      "bossEncounter": "encounter.warden_hearn",
      "completionPortal": "interaction.ember_portal",
      "firstClearUnlock": "dungeon.frost_mine"
    },
    "spawnPoints": [
      {
        "id": "spawn.ember_player_1",
        "x": -6,
        "z": 12
      },
      {
        "id": "spawn.ember_player_2",
        "x": -7,
        "z": 12
      },
      {
        "id": "spawn.ember_player_3",
        "x": -6,
        "z": 13
      },
      {
        "id": "spawn.ember_player_4",
        "x": -7,
        "z": 13
      }
    ],
    "encounterSpawns": [
      {
        "id": "spawn.armory_1",
        "x": 12,
        "z": -3
      },
      {
        "id": "spawn.armory_2",
        "x": 18,
        "z": -3
      },
      {
        "id": "spawn.armory_3",
        "x": 24,
        "z": -3
      },
      {
        "id": "spawn.armory_4",
        "x": 14,
        "z": 3
      },
      {
        "id": "spawn.armory_5",
        "x": 20,
        "z": 3
      },
      {
        "id": "spawn.armory_6",
        "x": 25,
        "z": 3
      },
      {
        "id": "spawn.champion_1",
        "x": 50,
        "z": 10
      },
      {
        "id": "spawn.champion_2",
        "x": 54,
        "z": 10
      },
      {
        "id": "spawn.champion_3",
        "x": 58,
        "z": 10
      },
      {
        "id": "spawn.champion_4",
        "x": 54,
        "z": 15
      },
      {
        "id": "spawn.forge_1",
        "x": 47,
        "z": -3
      },
      {
        "id": "spawn.forge_2",
        "x": 52,
        "z": -3
      },
      {
        "id": "spawn.forge_3",
        "x": 58,
        "z": -3
      },
      {
        "id": "spawn.forge_4",
        "x": 61,
        "z": 0
      },
      {
        "id": "spawn.forge_5",
        "x": 48,
        "z": 3
      },
      {
        "id": "spawn.forge_6",
        "x": 54,
        "z": 3
      },
      {
        "id": "spawn.forge_7",
        "x": 60,
        "z": 3
      },
      {
        "id": "spawn.refuge_1",
        "x": 14,
        "z": 10
      },
      {
        "id": "spawn.refuge_2",
        "x": 18,
        "z": 10
      },
      {
        "id": "spawn.refuge_3",
        "x": 22,
        "z": 10
      },
      {
        "id": "spawn.refuge_4",
        "x": 18,
        "z": 15
      },
      {
        "id": "spawn.warden_hearn",
        "x": 72,
        "z": 0
      }
    ],
    "enemies": [],
    "encounters": [
      {
        "id": "encounter.armory_crossing",
        "kind": "normal",
        "trigger": {
          "section": "section.ember_corridor",
          "x": 12,
          "z": 0,
          "radius": 2.2
        },
        "lockInteractions": [
          "interaction.door_armory"
        ],
        "rewardTable": "loot.encounter.ember",
        "waves": [
          {
            "delay": 0,
            "members": [
              {
                "id": "member.armory_gaoler_1",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.armory_4",
                "levelOffset": 0
              },
              {
                "id": "member.armory_gaoler_2",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.armory_5",
                "levelOffset": 0
              },
              {
                "id": "member.armory_gaoler_3",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.armory_6",
                "levelOffset": 0
              },
              {
                "id": "member.armory_slinger_1",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.armory_1",
                "levelOffset": 0
              },
              {
                "id": "member.armory_slinger_2",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.armory_2",
                "levelOffset": 0
              },
              {
                "id": "member.armory_slinger_3",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.armory_3",
                "levelOffset": 0
              }
            ]
          }
        ]
      },
      {
        "id": "encounter.ember_champion",
        "kind": "elite",
        "trigger": {
          "section": "section.ember_training_c",
          "x": 47,
          "z": 12,
          "radius": 2.2
        },
        "lockInteractions": [
          "interaction.door_elite"
        ],
        "rewardTable": "loot.elite.ember_prison",
        "waves": [
          {
            "delay": 0,
            "members": [
              {
                "id": "member.champion",
                "actor": "elite.ember_champion",
                "spawn": "spawn.champion_1",
                "levelOffset": 1,
                "eliteAffix": "elite.molten_ground"
              },
              {
                "id": "member.champion_gaoler_1",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.champion_2",
                "levelOffset": 1
              },
              {
                "id": "member.champion_gaoler_2",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.champion_3",
                "levelOffset": 1
              },
              {
                "id": "member.champion_gaoler_3",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.champion_4",
                "levelOffset": 1
              }
            ]
          }
        ]
      },
      {
        "id": "encounter.forge_floor",
        "kind": "normal",
        "trigger": {
          "section": "section.ember_workshop",
          "x": 47,
          "z": 0,
          "radius": 2.2
        },
        "lockInteractions": [
          "interaction.door_forge"
        ],
        "rewardTable": "loot.encounter.ember",
        "waves": [
          {
            "delay": 0,
            "members": [
              {
                "id": "member.forge_gaoler_1",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.forge_1",
                "levelOffset": 1
              },
              {
                "id": "member.forge_gaoler_2",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.forge_2",
                "levelOffset": 1
              },
              {
                "id": "member.forge_gaoler_3",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.forge_3",
                "levelOffset": 1
              },
              {
                "id": "member.forge_gaoler_4",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.forge_4",
                "levelOffset": 1
              },
              {
                "id": "member.forge_slinger_1",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.forge_5",
                "levelOffset": 1
              },
              {
                "id": "member.forge_slinger_2",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.forge_6",
                "levelOffset": 1
              },
              {
                "id": "member.forge_slinger_3",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.forge_7",
                "levelOffset": 1
              }
            ]
          },
          {
            "delay": 1.5,
            "members": [
              {
                "id": "member.forge_gaoler_5",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.forge_1",
                "levelOffset": 1
              },
              {
                "id": "member.forge_gaoler_6",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.forge_2",
                "levelOffset": 1
              },
              {
                "id": "member.forge_slinger_4",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.forge_5",
                "levelOffset": 1
              },
              {
                "id": "member.forge_slinger_5",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.forge_6",
                "levelOffset": 1
              }
            ]
          }
        ]
      },
      {
        "id": "encounter.refuge_gate",
        "kind": "normal",
        "trigger": {
          "section": "section.ember_living",
          "x": 11,
          "z": 12,
          "radius": 2.2
        },
        "lockInteractions": [
          "interaction.door_refuge"
        ],
        "rewardTable": "loot.encounter.ember",
        "waves": [
          {
            "delay": 0,
            "members": [
              {
                "id": "member.refuge_gaoler_1",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.refuge_1",
                "levelOffset": 0
              },
              {
                "id": "member.refuge_gaoler_2",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.refuge_2",
                "levelOffset": 0
              },
              {
                "id": "member.refuge_gaoler_3",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.refuge_3",
                "levelOffset": 0
              },
              {
                "id": "member.refuge_gaoler_4",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.refuge_4",
                "levelOffset": 0
              }
            ]
          },
          {
            "delay": 1.25,
            "members": [
              {
                "id": "member.refuge_gaoler_5",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.refuge_1",
                "levelOffset": 0
              },
              {
                "id": "member.refuge_gaoler_6",
                "actor": "enemy.ember_gaoler",
                "spawn": "spawn.refuge_2",
                "levelOffset": 0
              },
              {
                "id": "member.refuge_slinger_1",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.refuge_3",
                "levelOffset": 0
              },
              {
                "id": "member.refuge_slinger_2",
                "actor": "enemy.furnace_slinger",
                "spawn": "spawn.refuge_4",
                "levelOffset": 0
              }
            ]
          }
        ]
      },
      {
        "id": "encounter.warden_hearn",
        "kind": "boss",
        "trigger": {
          "section": "section.ember_boss_a",
          "x": 65,
          "z": 0,
          "radius": 2.2
        },
        "lockInteractions": [
          "interaction.door_boss"
        ],
        "rewardTable": "loot.boss.ember_prison",
        "checkpoint": "checkpoint.warden_hearn",
        "bossPhases": [
          "phase.iron_oath",
          "phase.burning_edict",
          "phase.last_lock"
        ],
        "waves": [
          {
            "delay": 0,
            "members": [
              {
                "id": "member.warden_hearn",
                "actor": "boss.warden_hearn",
                "spawn": "spawn.warden_hearn",
                "levelOffset": 2
              }
            ]
          }
        ]
      }
    ],
    "interactions": [
      {
        "id": "interaction.door_armory",
        "name": "军械门廊铁门",
        "kind": "door",
        "trigger": "interact",
        "x": 27,
        "z": 0,
        "radius": 1.8
      },
      {
        "id": "interaction.door_boss",
        "name": "封城审判庭王门",
        "kind": "door",
        "trigger": "interact",
        "x": 63,
        "z": 0,
        "radius": 1.8
      },
      {
        "id": "interaction.door_elite",
        "name": "冠军操练庭闸门",
        "kind": "door",
        "trigger": "interact",
        "x": 63,
        "z": 12,
        "radius": 1.8
      },
      {
        "id": "interaction.door_forge",
        "name": "典狱锻炉铁门",
        "kind": "door",
        "trigger": "interact",
        "x": 45,
        "z": 0,
        "radius": 1.8
      },
      {
        "id": "interaction.door_refuge",
        "name": "难民牢区闸门",
        "kind": "door",
        "trigger": "interact",
        "x": 27,
        "z": 12,
        "radius": 1.8
      },
      {
        "id": "interaction.ember_portal",
        "name": "余烬监城归途",
        "kind": "portal",
        "trigger": "interact",
        "x": 77,
        "z": 6,
        "radius": 1.8,
        "destination": {
          "x": -6,
          "z": 12
        }
      },
      {
        "id": "interaction.ember_resource",
        "name": "余烬炉心",
        "kind": "harvest",
        "trigger": "interact",
        "x": 18,
        "z": 12,
        "radius": 1.5,
        "reward": {
          "resource": "ember_crystal",
          "name": "余烬炉心",
          "amount": 1
        }
      }
    ],
    "visual": {
      "profile": "voxel_dungeon",
      "clearColor": "#160b0d",
      "groundColor": "#443035",
      "groundSize": 18,
      "palette": {
        "stone": {
          "base": "#654b50",
          "dark": "#302226",
          "light": "#a77c76"
        },
        "rock": {
          "base": "#3b3034",
          "dark": "#1d171a",
          "light": "#70565c"
        },
        "metal": {
          "base": "#625a5d",
          "dark": "#2d292c",
          "light": "#b89472"
        },
        "wood": {
          "base": "#6d3d2e",
          "dark": "#321b16",
          "light": "#b96a43"
        },
        "rune": {
          "base": "#522017",
          "dark": "#260d0a",
          "light": "#ff9a3c"
        },
        "hazard": {
          "base": "#f34a12",
          "dark": "#8f170a",
          "light": "#ffd85a"
        },
        "light": {
          "fill": "#b3b8c9",
          "key": "#ffe0b8",
          "accent": "#ff6a28",
          "fog": "#19090b"
        }
      },
      "enemy": {
        "stone": "#3b3034",
        "bone": "#a77c76",
        "crystal": "#ff9a3c",
        "emissive": "#ffd85a",
        "projectile": "#ff9a3c"
      },
      "interactions": {
        "harvest": {
          "color": "#522017",
          "emissive": "#ff9a3c"
        },
        "encounter": {
          "color": "#f34a12",
          "emissive": "#ffd85a"
        },
        "doorStone": {
          "color": "#654b50",
          "emissive": "#1d171a"
        },
        "doorGate": {
          "color": "#625a5d",
          "emissive": "#2d292c"
        },
        "portal": {
          "color": "#522017",
          "emissive": "#260d0a"
        },
        "portalActive": "#ff9a3c"
      }
    },
    "assets": [],
    "placements": [],
    "decorations": [],
    "budgets": {
      "dynamicLights": 1,
      "estimatedDrawItems": 256,
      "estimatedTriangles": 20000
    }
  },
  {
    "schemaVersion": 1,
    "id": "dungeon.storm_throne",
    "name": "风暴王台",
    "lore": {
      "region": "天穹界炉",
      "summary": "塔底营房、避雷廊和演武台围绕雷冠王座盘旋，困住王城最后一场风暴。",
      "boss": {
        "name": "凯洛",
        "title": "守雷摄政王",
        "background": "他把雷暴锁进塔内等待失踪的国王归来，三百年后仍拒绝承认王朝已经结束。"
      }
    },
    "manifest": {
      "themeId": "theme.storm_throne",
      "resource": {
        "id": "storm_crown",
        "name": "雷冠残片"
      }
    },
    "map": {
      "mode": "production",
      "screenWidth": 18,
      "screenDepth": 12,
      "bounds": {
        "minX": -9,
        "maxX": 81,
        "minZ": -6,
        "maxZ": 30
      },
      "sections": [
        {
          "id": "section.storm_boss_a",
          "zone": "zone.storm_throne",
          "name": "雷冠王座",
          "preset": "boss_arena",
          "gridX": 4,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.storm_boss_b",
          "zone": "zone.storm_throne",
          "name": "雷冠王座",
          "preset": "boss_arena",
          "gridX": 4,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.storm_corridor",
          "zone": "zone.storm_west_bridge",
          "name": "西避雷桥",
          "preset": "stone_corridor",
          "gridX": 1,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.storm_east_bridge",
          "zone": "zone.storm_east_bridge",
          "name": "东悬链桥",
          "preset": "stone_corridor",
          "gridX": 3,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.storm_entry",
          "zone": "zone.storm_gate",
          "name": "断云门台",
          "preset": "entry_hall",
          "gridX": 0,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.storm_living",
          "zone": "zone.storm_barracks",
          "name": "守雷营房",
          "preset": "living_quarters",
          "gridX": 1,
          "gridZ": 0,
          "rotation": 0
        },
        {
          "id": "section.storm_training_a",
          "zone": "zone.storm_drill_cross",
          "name": "雷鸣十字演武台",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.storm_training_b",
          "zone": "zone.storm_drill_cross",
          "name": "雷鸣十字演武台",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 0,
          "rotation": 0
        },
        {
          "id": "section.storm_training_c",
          "zone": "zone.storm_drill_cross",
          "name": "雷鸣十字演武台",
          "preset": "training_arena",
          "gridX": 2,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.storm_workshop",
          "zone": "zone.storm_machinery",
          "name": "风暴机括室",
          "preset": "workshop",
          "gridX": 3,
          "gridZ": 0,
          "rotation": 0
        }
      ],
      "navigation": {
        "walkable": [
          {
            "id": "walkable.storm_boss_a",
            "x": 72,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_boss_b",
            "x": 72,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_corridor",
            "x": 18,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_east_bridge",
            "x": 54,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_entry",
            "x": 0,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_living",
            "x": 18,
            "z": 0,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_training_a",
            "x": 36,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_training_b",
            "x": 36,
            "z": 0,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_training_c",
            "x": 36,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.storm_workshop",
            "x": 54,
            "z": 0,
            "width": 18,
            "depth": 12
          }
        ],
        "blockers": [
          {
            "id": "blocker.wall_storm_boss_a_east_full",
            "x": 80.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_boss_a_north_full",
            "x": 72,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_boss_b_east_full",
            "x": 80.72,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_boss_b_south_full",
            "x": 72,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_boss_b_west_full",
            "x": 63.28,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_corridor_east_a",
            "x": 26.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_corridor_east_b",
            "x": 26.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_corridor_south_full",
            "x": 18,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_east_bridge_east_a",
            "x": 62.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_east_bridge_east_b",
            "x": 62.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_east_bridge_south_full",
            "x": 54,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_entry_east_a",
            "x": 8.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_entry_east_b",
            "x": 8.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_entry_north_full",
            "x": 0,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_entry_south_full",
            "x": 0,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_entry_west_full",
            "x": -8.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_living_east_a",
            "x": 26.72,
            "z": -4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_living_east_b",
            "x": 26.72,
            "z": 4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_living_north_full",
            "x": 18,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_living_south_a",
            "x": 12.35,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_living_south_b",
            "x": 23.65,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_living_west_full",
            "x": 9.28,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_training_a_east_a",
            "x": 44.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_training_a_east_b",
            "x": 44.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_training_b_east_a",
            "x": 44.72,
            "z": -4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_training_b_east_b",
            "x": 44.72,
            "z": 4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_training_b_north_full",
            "x": 36,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_training_c_east_full",
            "x": 44.72,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_training_c_south_full",
            "x": 36,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_training_c_west_full",
            "x": 27.28,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_workshop_east_full",
            "x": 62.72,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_workshop_north_full",
            "x": 54,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_workshop_south_a",
            "x": 48.35,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_storm_workshop_south_b",
            "x": 59.65,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          }
        ]
      }
    },
    "spawnPoints": [
      {
        "id": "spawn.storm_player_1",
        "x": -6,
        "z": 12
      },
      {
        "id": "spawn.storm_player_2",
        "x": -7,
        "z": 12
      },
      {
        "id": "spawn.storm_player_3",
        "x": -6,
        "z": 13
      },
      {
        "id": "spawn.storm_player_4",
        "x": -7,
        "z": 13
      }
    ],
    "enemies": [
      {
        "id": "enemy.storm_boss",
        "kind": "boss.ember_colossus",
        "encounter": "encounter.storm_boss",
        "x": 72,
        "z": 18
      },
      {
        "id": "enemy.storm_guard_1",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.storm_boss",
        "x": 68,
        "z": 15
      },
      {
        "id": "enemy.storm_guard_2",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.storm_boss",
        "x": 68,
        "z": 21
      },
      {
        "id": "enemy.storm_guard_3",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.storm_boss",
        "x": 75,
        "z": 14
      },
      {
        "id": "enemy.storm_guard_4",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.storm_boss",
        "x": 75,
        "z": 22
      }
    ],
    "encounters": [
      {
        "id": "encounter.storm_boss",
        "members": [
          "enemy.storm_boss",
          "enemy.storm_guard_1",
          "enemy.storm_guard_2",
          "enemy.storm_guard_3",
          "enemy.storm_guard_4"
        ]
      }
    ],
    "interactions": [
      {
        "id": "interaction.storm_door",
        "name": "风暴王台王庭门",
        "kind": "door",
        "trigger": "interact",
        "x": 64.5,
        "z": 12,
        "radius": 1.8
      },
      {
        "id": "interaction.storm_encounter",
        "name": "风暴王台守卫",
        "kind": "encounter",
        "trigger": "enter",
        "encounter": "encounter.storm_boss",
        "x": 63.5,
        "z": 12,
        "radius": 2.2
      },
      {
        "id": "interaction.storm_portal",
        "name": "风暴王台归途",
        "kind": "portal",
        "trigger": "interact",
        "x": 77,
        "z": 18,
        "radius": 1.8,
        "destination": {
          "x": -6,
          "z": 12
        }
      },
      {
        "id": "interaction.storm_resource",
        "name": "雷冠残片",
        "kind": "harvest",
        "trigger": "interact",
        "x": 18,
        "z": 0,
        "radius": 1.5,
        "reward": {
          "resource": "storm_crown",
          "name": "雷冠残片",
          "amount": 1
        }
      }
    ],
    "visual": {
      "profile": "voxel_dungeon",
      "clearColor": "#0d1028",
      "groundColor": "#343a62",
      "groundSize": 18,
      "palette": {
        "stone": {
          "base": "#555c83",
          "dark": "#282d4a",
          "light": "#939bc5"
        },
        "rock": {
          "base": "#323754",
          "dark": "#171a31",
          "light": "#60698d"
        },
        "metal": {
          "base": "#686f8a",
          "dark": "#30364e",
          "light": "#c7bb86"
        },
        "wood": {
          "base": "#51422f",
          "dark": "#251e17",
          "light": "#8e7047"
        },
        "rune": {
          "base": "#665318",
          "dark": "#302709",
          "light": "#ffe36a"
        },
        "hazard": {
          "base": "#376dd6",
          "dark": "#183577",
          "light": "#9fc5ff"
        },
        "light": {
          "fill": "#bac8ec",
          "key": "#fff0b8",
          "accent": "#ffd84f",
          "fog": "#10152f"
        }
      },
      "enemy": {
        "stone": "#323754",
        "bone": "#939bc5",
        "crystal": "#ffe36a",
        "emissive": "#9fc5ff",
        "projectile": "#ffe36a"
      },
      "interactions": {
        "harvest": {
          "color": "#665318",
          "emissive": "#ffe36a"
        },
        "encounter": {
          "color": "#376dd6",
          "emissive": "#9fc5ff"
        },
        "doorStone": {
          "color": "#555c83",
          "emissive": "#171a31"
        },
        "doorGate": {
          "color": "#686f8a",
          "emissive": "#30364e"
        },
        "portal": {
          "color": "#665318",
          "emissive": "#302709"
        },
        "portalActive": "#ffe36a"
      }
    },
    "assets": [],
    "placements": [],
    "decorations": [],
    "budgets": {
      "dynamicLights": 1,
      "estimatedDrawItems": 256,
      "estimatedTriangles": 20000
    }
  },
  {
    "schemaVersion": 1,
    "id": "dungeon.sunken_library",
    "name": "沉潮书库",
    "lore": {
      "region": "沉潮界炉",
      "summary": "档案馆被主动沉入地下水层，抄写区、泵房和禁书库在潮汐中反复显露。",
      "boss": {
        "name": "弥娅",
        "title": "末席馆长",
        "background": "她让整座书库沉水以保护会改写记忆的禁书，最后连自己为何守门也被书页抹去。"
      }
    },
    "manifest": {
      "themeId": "theme.sunken_archive",
      "resource": {
        "id": "memory_page",
        "name": "潮蚀书页"
      }
    },
    "map": {
      "mode": "production",
      "screenWidth": 18,
      "screenDepth": 12,
      "bounds": {
        "minX": -9,
        "maxX": 81,
        "minZ": -6,
        "maxZ": 30
      },
      "sections": [
        {
          "id": "section.tide_boss_a",
          "zone": "zone.tide_forbidden_archive",
          "name": "禁书下沉库",
          "preset": "boss_arena",
          "gridX": 4,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.tide_boss_b",
          "zone": "zone.tide_forbidden_archive",
          "name": "禁书下沉库",
          "preset": "boss_arena",
          "gridX": 4,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.tide_corridor",
          "zone": "zone.tide_catalog",
          "name": "中央目录庭",
          "preset": "stone_corridor",
          "gridX": 2,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.tide_entry",
          "zone": "zone.tide_dock",
          "name": "退潮石埠",
          "preset": "entry_hall",
          "gridX": 0,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.tide_living",
          "zone": "zone.tide_scriptorium",
          "name": "抄写员席",
          "preset": "living_quarters",
          "gridX": 1,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.tide_side_archive",
          "zone": "zone.tide_side_archive",
          "name": "失忆档案塔",
          "preset": "stone_corridor",
          "gridX": 2,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.tide_training_a",
          "zone": "zone.tide_reading_hall",
          "name": "潮汐阅览大厅",
          "preset": "training_arena",
          "gridX": 3,
          "gridZ": 0,
          "rotation": 0
        },
        {
          "id": "section.tide_training_b",
          "zone": "zone.tide_reading_hall",
          "name": "潮汐阅览大厅",
          "preset": "training_arena",
          "gridX": 3,
          "gridZ": 1,
          "rotation": 0
        },
        {
          "id": "section.tide_training_c",
          "zone": "zone.tide_reading_hall",
          "name": "潮汐阅览大厅",
          "preset": "training_arena",
          "gridX": 3,
          "gridZ": 2,
          "rotation": 0
        },
        {
          "id": "section.tide_workshop",
          "zone": "zone.tide_pumps",
          "name": "铜泵房",
          "preset": "workshop",
          "gridX": 2,
          "gridZ": 0,
          "rotation": 0
        }
      ],
      "navigation": {
        "walkable": [
          {
            "id": "walkable.tide_boss_a",
            "x": 72,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_boss_b",
            "x": 72,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_corridor",
            "x": 36,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_entry",
            "x": 0,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_living",
            "x": 18,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_side_archive",
            "x": 36,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_training_a",
            "x": 54,
            "z": 0,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_training_b",
            "x": 54,
            "z": 12,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_training_c",
            "x": 54,
            "z": 24,
            "width": 18,
            "depth": 12
          },
          {
            "id": "walkable.tide_workshop",
            "x": 36,
            "z": 0,
            "width": 18,
            "depth": 12
          }
        ],
        "blockers": [
          {
            "id": "blocker.wall_tide_boss_a_east_full",
            "x": 80.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_boss_a_north_full",
            "x": 72,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_boss_b_east_full",
            "x": 80.72,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_boss_b_south_full",
            "x": 72,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_corridor_east_a",
            "x": 44.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_corridor_east_b",
            "x": 44.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_corridor_south_a",
            "x": 30.35,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_corridor_south_b",
            "x": 41.65,
            "z": 17.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_entry_east_a",
            "x": 8.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_entry_east_b",
            "x": 8.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_entry_north_full",
            "x": 0,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_entry_south_full",
            "x": 0,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_entry_west_full",
            "x": -8.72,
            "z": 12,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_living_east_a",
            "x": 26.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_living_east_b",
            "x": 26.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_living_north_full",
            "x": 18,
            "z": 6.28,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_living_south_full",
            "x": 18,
            "z": 17.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_side_archive_east_a",
            "x": 44.72,
            "z": 19.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_side_archive_east_b",
            "x": 44.72,
            "z": 28.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_side_archive_south_full",
            "x": 36,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_side_archive_west_full",
            "x": 27.28,
            "z": 24,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_training_a_east_full",
            "x": 62.72,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_training_a_north_full",
            "x": 54,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_training_b_east_a",
            "x": 62.72,
            "z": 7.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_training_b_east_b",
            "x": 62.72,
            "z": 16.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_training_c_east_a",
            "x": 62.72,
            "z": 19.85,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_training_c_east_b",
            "x": 62.72,
            "z": 28.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_training_c_south_full",
            "x": 54,
            "z": 29.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_workshop_east_a",
            "x": 44.72,
            "z": -4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_workshop_east_b",
            "x": 44.72,
            "z": 4.15,
            "width": 0.56,
            "depth": 3.7,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_workshop_north_full",
            "x": 36,
            "z": -5.72,
            "width": 18,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_workshop_south_a",
            "x": 30.35,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_workshop_south_b",
            "x": 41.65,
            "z": 5.72,
            "width": 6.7,
            "depth": 0.56,
            "height": 3.9
          },
          {
            "id": "blocker.wall_tide_workshop_west_full",
            "x": 27.28,
            "z": 0,
            "width": 0.56,
            "depth": 12,
            "height": 3.9
          }
        ]
      }
    },
    "spawnPoints": [
      {
        "id": "spawn.tide_player_1",
        "x": -6,
        "z": 12
      },
      {
        "id": "spawn.tide_player_2",
        "x": -7,
        "z": 12
      },
      {
        "id": "spawn.tide_player_3",
        "x": -6,
        "z": 13
      },
      {
        "id": "spawn.tide_player_4",
        "x": -7,
        "z": 13
      }
    ],
    "enemies": [
      {
        "id": "enemy.tide_boss",
        "kind": "boss.ember_colossus",
        "encounter": "encounter.tide_boss",
        "x": 72,
        "z": 18
      },
      {
        "id": "enemy.tide_guard_1",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.tide_boss",
        "x": 68,
        "z": 15
      },
      {
        "id": "enemy.tide_guard_2",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.tide_boss",
        "x": 68,
        "z": 21
      },
      {
        "id": "enemy.tide_guard_3",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.tide_boss",
        "x": 75,
        "z": 14
      },
      {
        "id": "enemy.tide_guard_4",
        "kind": "enemy.ember_stalker",
        "encounter": "encounter.tide_boss",
        "x": 75,
        "z": 22
      }
    ],
    "encounters": [
      {
        "id": "encounter.tide_boss",
        "members": [
          "enemy.tide_boss",
          "enemy.tide_guard_1",
          "enemy.tide_guard_2",
          "enemy.tide_guard_3",
          "enemy.tide_guard_4"
        ]
      }
    ],
    "interactions": [
      {
        "id": "interaction.tide_door",
        "name": "沉潮书库王庭门",
        "kind": "door",
        "trigger": "interact",
        "x": 63,
        "z": 12,
        "radius": 1.8
      },
      {
        "id": "interaction.tide_encounter",
        "name": "沉潮书库守卫",
        "kind": "encounter",
        "trigger": "enter",
        "encounter": "encounter.tide_boss",
        "x": 62,
        "z": 12,
        "radius": 2.2
      },
      {
        "id": "interaction.tide_portal",
        "name": "沉潮书库归途",
        "kind": "portal",
        "trigger": "interact",
        "x": 77,
        "z": 18,
        "radius": 1.8,
        "destination": {
          "x": -6,
          "z": 12
        }
      },
      {
        "id": "interaction.tide_resource",
        "name": "潮蚀书页",
        "kind": "harvest",
        "trigger": "interact",
        "x": 36,
        "z": 0,
        "radius": 1.5,
        "reward": {
          "resource": "memory_page",
          "name": "潮蚀书页",
          "amount": 1
        }
      }
    ],
    "visual": {
      "profile": "voxel_dungeon",
      "clearColor": "#071c1e",
      "groundColor": "#285156",
      "groundSize": 18,
      "palette": {
        "stone": {
          "base": "#426b6b",
          "dark": "#1d383b",
          "light": "#7fa39b"
        },
        "rock": {
          "base": "#29494b",
          "dark": "#10282a",
          "light": "#527675"
        },
        "metal": {
          "base": "#4e756c",
          "dark": "#203d39",
          "light": "#a0b58a"
        },
        "wood": {
          "base": "#5c4932",
          "dark": "#2a2118",
          "light": "#998057"
        },
        "rune": {
          "base": "#155c64",
          "dark": "#082c33",
          "light": "#58f0dd"
        },
        "hazard": {
          "base": "#168a94",
          "dark": "#0b4654",
          "light": "#8ef9e8"
        },
        "light": {
          "fill": "#a9d6d0",
          "key": "#e1f2cf",
          "accent": "#42d9c7",
          "fog": "#082326"
        }
      },
      "enemy": {
        "stone": "#29494b",
        "bone": "#7fa39b",
        "crystal": "#58f0dd",
        "emissive": "#8ef9e8",
        "projectile": "#58f0dd"
      },
      "interactions": {
        "harvest": {
          "color": "#155c64",
          "emissive": "#58f0dd"
        },
        "encounter": {
          "color": "#168a94",
          "emissive": "#8ef9e8"
        },
        "doorStone": {
          "color": "#426b6b",
          "emissive": "#10282a"
        },
        "doorGate": {
          "color": "#4e756c",
          "emissive": "#203d39"
        },
        "portal": {
          "color": "#155c64",
          "emissive": "#082c33"
        },
        "portalActive": "#58f0dd"
      }
    },
    "assets": [],
    "placements": [],
    "decorations": [],
    "budgets": {
      "dynamicLights": 1,
      "estimatedDrawItems": 256,
      "estimatedTriangles": 20000
    }
  },
  {
    "schemaVersion": 1,
    "id": "dungeon.training_ground",
    "name": "晶体门训练场",
    "lore": {
      "region": "余烬边境",
      "summary": "守炉军团留下的训练前哨，如今只剩失控的晶体炮台仍在执行操练命令。",
      "boss": {
        "name": "零号炮台",
        "title": "晶体门教官",
        "background": "没有人记得它训练过多少士兵，它只记得下一轮考核永远不能停。"
      }
    },
    "manifest": {
      "themeId": "theme.ember_ruins",
      "resource": {
        "id": "ember_ore",
        "name": "余烬矿"
      }
    },
    "map": {
      "mode": "showcase",
      "screenWidth": 18,
      "screenDepth": 12,
      "bounds": {
        "minX": -9,
        "maxX": 9,
        "minZ": -6,
        "maxZ": 6
      },
      "sections": [
        {
          "id": "section.training",
          "preset": "foundation_room",
          "gridX": 0,
          "gridZ": 0,
          "rotation": 0
        }
      ],
      "navigation": {
        "walkable": [
          {
            "id": "walkable.training",
            "x": 0,
            "z": 0,
            "width": 18,
            "depth": 12
          }
        ],
        "blockers": [
          {
            "id": "blocker.training_pillar_a",
            "x": -5,
            "z": -4,
            "width": 0.8,
            "depth": 0.8,
            "height": 2.4
          },
          {
            "id": "blocker.training_pillar_b",
            "x": 5,
            "z": 4,
            "width": 0.8,
            "depth": 0.8,
            "height": 2.4
          }
        ]
      }
    },
    "spawnPoints": [
      {
        "id": "spawn.player_1",
        "x": -3,
        "z": 0
      },
      {
        "id": "spawn.player_2",
        "x": -4,
        "z": 0
      },
      {
        "id": "spawn.player_3",
        "x": -3,
        "z": 1
      },
      {
        "id": "spawn.player_4",
        "x": -4,
        "z": 1
      }
    ],
    "enemies": [
      {
        "id": "enemy.crystal_turret",
        "kind": "enemy.crystal_turret",
        "encounter": "encounter.crystal_gate",
        "x": 3,
        "z": 0
      }
    ],
    "encounters": [
      {
        "id": "encounter.crystal_gate",
        "members": [
          "enemy.crystal_turret"
        ]
      }
    ],
    "interactions": [
      {
        "id": "interaction.crystal_gate_door",
        "name": "晶体门",
        "kind": "door",
        "trigger": "interact",
        "x": 2,
        "z": 0,
        "radius": 1.4
      },
      {
        "id": "interaction.crystal_gate_trigger",
        "name": "晶体守卫遭遇",
        "kind": "encounter",
        "trigger": "enter",
        "encounter": "encounter.crystal_gate",
        "x": 0,
        "z": 0,
        "radius": 0.9
      },
      {
        "id": "interaction.ember_ore",
        "name": "余烬矿",
        "kind": "harvest",
        "trigger": "interact",
        "x": -3,
        "z": 1,
        "radius": 1.4,
        "reward": {
          "resource": "ember_ore",
          "name": "余烬矿",
          "amount": 1
        }
      },
      {
        "id": "interaction.return_portal",
        "name": "返程传送门",
        "kind": "portal",
        "trigger": "interact",
        "x": 4,
        "z": 0,
        "radius": 1.4,
        "destination": {
          "x": -4,
          "z": -3
        }
      }
    ],
    "visual": {
      "profile": "foundation",
      "clearColor": "#070508",
      "groundColor": "#291a14",
      "groundSize": 12,
      "enemy": {
        "stone": "#29252c",
        "bone": "#b7aa91",
        "crystal": "#8b5cff",
        "emissive": "#6c24ff",
        "projectile": "#9b62ff"
      },
      "interactions": {
        "harvest": {
          "color": "#d9aa45",
          "emissive": "#8b681f"
        },
        "encounter": {
          "color": "#7d4cff",
          "emissive": "#5b26d9"
        },
        "doorStone": {
          "color": "#322d35",
          "emissive": "#08070a"
        },
        "doorGate": {
          "color": "#8a6b4f",
          "emissive": "#4f2e16"
        },
        "portal": {
          "color": "#276575",
          "emissive": "#173943"
        },
        "portalActive": "#42e4ff"
      }
    },
    "assets": [],
    "placements": [],
    "decorations": [
      {
        "id": "decoration.ember_pillar_a",
        "x": -5,
        "y": 1.2,
        "z": -4,
        "width": 0.8,
        "height": 2.4,
        "depth": 0.8,
        "color": "#4a2a22"
      },
      {
        "id": "decoration.ember_pillar_b",
        "x": -5,
        "y": 1.2,
        "z": 4,
        "width": 0.8,
        "height": 2.4,
        "depth": 0.8,
        "color": "#4a2a22"
      },
      {
        "id": "decoration.ember_pillar_c",
        "x": 5,
        "y": 1.2,
        "z": -4,
        "width": 0.8,
        "height": 2.4,
        "depth": 0.8,
        "color": "#4a2a22"
      },
      {
        "id": "decoration.ember_pillar_d",
        "x": 5,
        "y": 1.2,
        "z": 4,
        "width": 0.8,
        "height": 2.4,
        "depth": 0.8,
        "color": "#4a2a22"
      },
      {
        "id": "decoration.ember_wall_north",
        "x": 0,
        "y": 0.75,
        "z": -5.5,
        "width": 11,
        "height": 1.5,
        "depth": 0.5,
        "color": "#2d2020"
      },
      {
        "id": "decoration.ember_wall_south",
        "x": 0,
        "y": 0.75,
        "z": 5.5,
        "width": 11,
        "height": 1.5,
        "depth": 0.5,
        "color": "#2d2020"
      }
    ],
    "budgets": {
      "dynamicLights": 1,
      "estimatedDrawItems": 64,
      "estimatedTriangles": 5000
    }
  }
] as const satisfies readonly DungeonPackSource[];

export const DUNGEON_PACK_DATA = DUNGEON_PACK_SOURCES.map(hydrateDungeonPack);
