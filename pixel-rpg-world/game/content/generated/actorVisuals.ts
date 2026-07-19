// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。
import type { ActorVisualDef } from "../ActorDefinitions";

export const ACTOR_VISUAL_DATA = [
  {
    "id": "visual.actor.ember_boss",
    "appearance": "appearance.boss.ember",
    "asset": "asset.actor.humanoid_combat",
    "url": "/game-assets/actors/humanoid-combat.gltf",
    "scale": 1.05,
    "yOffset": 0,
    "rotationY": 0,
    "animations": {
      "idle": "Idle_Loop",
      "run": "Sprint_Loop",
      "roll": "Roll",
      "melee": "Sword_Attack",
      "ranged": "Library_Bow_Shoot",
      "skill": "Spell_Simple_Shoot",
      "hit": "Hit_Chest",
      "dead": "Death01"
    },
    "humanoidActions": {
      "melee": [
        "Sword_Attack",
        "Sword_Attack_RM"
      ],
      "bow": "Library_Bow_Shoot",
      "cast": {
        "enter": "Spell_Simple_Enter",
        "loop": "Spell_Simple_Idle_Loop",
        "release": "Spell_Simple_Shoot",
        "exit": "Spell_Simple_Exit"
      }
    },
    "animationEvents": {
      "Sword_Attack": [
        {
          "id": "slash",
          "at": 0.42
        }
      ],
      "Sword_Attack_RM": [
        {
          "id": "slash",
          "at": 0.44
        }
      ]
    },
    "playback": {
      "idle": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "run": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "roll": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "melee": {
        "layer": "upper",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "ranged": {
        "layer": "upper",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "skill": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "hit": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "dead": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      }
    },
    "sockets": {
      "melee": {
        "node": "socket.weapon.right",
        "fallback": {
          "x": 0.55,
          "y": 1.2,
          "z": 0.25
        }
      },
      "ranged": {
        "node": "hand_l",
        "fallback": {
          "x": -0.55,
          "y": 1.2,
          "z": 0.25
        }
      }
    },
    "budget": {
      "maxBytes": 4000000,
      "maxTriangles": 20000,
      "maxBones": 80,
      "maxTextures": 4,
      "maxAnimations": 24
    },
    "lod": {
      "maxAnimatedInstances": 1,
      "fallback": "voxel"
    },
    "animationDurations": {
      "idle": 2.5,
      "run": 0.6666666666666666,
      "roll": 1.4583333333333333,
      "melee": 1.5416666666666667,
      "ranged": 1,
      "skill": 0.5,
      "hit": 0.3333333333333333,
      "dead": 2.375
    },
    "clipDurations": {
      "Idle_Loop": 2.5,
      "Sprint_Loop": 0.6666666666666666,
      "Roll": 1.4583333333333333,
      "Sword_Attack": 1.5416666666666667,
      "Library_Bow_Shoot": 1,
      "Spell_Simple_Shoot": 0.5,
      "Hit_Chest": 0.3333333333333333,
      "Death01": 2.375,
      "Sword_Attack_RM": 1.5416666666666667,
      "Spell_Simple_Enter": 0.5,
      "Spell_Simple_Idle_Loop": 2.0833333333333335,
      "Spell_Simple_Exit": 0.4166666666666667
    }
  },
  {
    "id": "visual.actor.ember_hero",
    "appearance": "appearance.hero.ember",
    "asset": "asset.actor.humanoid_combat",
    "url": "/game-assets/actors/humanoid-combat.gltf",
    "scale": 0.78,
    "yOffset": 0,
    "rotationY": 0,
    "animations": {
      "idle": "Idle_Loop",
      "run": "Sprint_Loop",
      "roll": "Roll",
      "melee": "Sword_Attack",
      "ranged": "Library_Bow_Shoot",
      "skill": "Spell_Simple_Shoot",
      "hit": "Hit_Chest",
      "dead": "Death01"
    },
    "humanoidActions": {
      "melee": [
        "Sword_Attack",
        "Sword_Attack_RM"
      ],
      "bow": "Library_Bow_Shoot",
      "cast": {
        "enter": "Spell_Simple_Enter",
        "loop": "Spell_Simple_Idle_Loop",
        "release": "Spell_Simple_Shoot",
        "exit": "Spell_Simple_Exit"
      }
    },
    "animationEvents": {
      "Sword_Attack": [
        {
          "id": "slash",
          "at": 0.42
        }
      ],
      "Sword_Attack_RM": [
        {
          "id": "slash",
          "at": 0.44
        }
      ]
    },
    "playback": {
      "idle": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "run": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "roll": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "melee": {
        "layer": "upper",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "ranged": {
        "layer": "upper",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "skill": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "hit": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "dead": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      }
    },
    "sockets": {
      "melee": {
        "node": "socket.weapon.right",
        "fallback": {
          "x": 0.55,
          "y": 1.2,
          "z": 0.25
        }
      },
      "ranged": {
        "node": "hand_l",
        "fallback": {
          "x": -0.55,
          "y": 1.2,
          "z": 0.25
        }
      }
    },
    "budget": {
      "maxBytes": 4000000,
      "maxTriangles": 20000,
      "maxBones": 80,
      "maxTextures": 4,
      "maxAnimations": 24
    },
    "lod": {
      "maxAnimatedInstances": 4,
      "fallback": "voxel"
    },
    "animationDurations": {
      "idle": 2.5,
      "run": 0.6666666666666666,
      "roll": 1.4583333333333333,
      "melee": 1.5416666666666667,
      "ranged": 1,
      "skill": 0.5,
      "hit": 0.3333333333333333,
      "dead": 2.375
    },
    "clipDurations": {
      "Idle_Loop": 2.5,
      "Sprint_Loop": 0.6666666666666666,
      "Roll": 1.4583333333333333,
      "Sword_Attack": 1.5416666666666667,
      "Library_Bow_Shoot": 1,
      "Spell_Simple_Shoot": 0.5,
      "Hit_Chest": 0.3333333333333333,
      "Death01": 2.375,
      "Sword_Attack_RM": 1.5416666666666667,
      "Spell_Simple_Enter": 0.5,
      "Spell_Simple_Idle_Loop": 2.0833333333333335,
      "Spell_Simple_Exit": 0.4166666666666667
    }
  },
  {
    "id": "visual.actor.ember_minion",
    "appearance": "appearance.minion.ember",
    "asset": "asset.actor.humanoid_combat",
    "url": "/game-assets/actors/humanoid-combat.gltf",
    "scale": 0.68,
    "yOffset": 0,
    "rotationY": 0,
    "animations": {
      "idle": "Idle_Loop",
      "run": "Sprint_Loop",
      "roll": "Roll",
      "melee": "Sword_Attack",
      "ranged": "Library_Bow_Shoot",
      "skill": "Spell_Simple_Shoot",
      "hit": "Hit_Chest",
      "dead": "Death01"
    },
    "humanoidActions": {
      "melee": [
        "Sword_Attack",
        "Sword_Attack_RM"
      ],
      "bow": "Library_Bow_Shoot",
      "cast": {
        "enter": "Spell_Simple_Enter",
        "loop": "Spell_Simple_Idle_Loop",
        "release": "Spell_Simple_Shoot",
        "exit": "Spell_Simple_Exit"
      }
    },
    "animationEvents": {
      "Sword_Attack": [
        {
          "id": "slash",
          "at": 0.42
        }
      ],
      "Sword_Attack_RM": [
        {
          "id": "slash",
          "at": 0.44
        }
      ]
    },
    "playback": {
      "idle": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "run": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "roll": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "melee": {
        "layer": "upper",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "ranged": {
        "layer": "upper",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "skill": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "hit": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "dead": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      }
    },
    "sockets": {
      "melee": {
        "node": "socket.weapon.right",
        "fallback": {
          "x": 0.55,
          "y": 1.2,
          "z": 0.25
        }
      },
      "ranged": {
        "node": "hand_l",
        "fallback": {
          "x": -0.55,
          "y": 1.2,
          "z": 0.25
        }
      }
    },
    "budget": {
      "maxBytes": 4000000,
      "maxTriangles": 20000,
      "maxBones": 80,
      "maxTextures": 4,
      "maxAnimations": 24
    },
    "lod": {
      "maxAnimatedInstances": 4,
      "fallback": "voxel"
    },
    "animationDurations": {
      "idle": 2.5,
      "run": 0.6666666666666666,
      "roll": 1.4583333333333333,
      "melee": 1.5416666666666667,
      "ranged": 1,
      "skill": 0.5,
      "hit": 0.3333333333333333,
      "dead": 2.375
    },
    "clipDurations": {
      "Idle_Loop": 2.5,
      "Sprint_Loop": 0.6666666666666666,
      "Roll": 1.4583333333333333,
      "Sword_Attack": 1.5416666666666667,
      "Library_Bow_Shoot": 1,
      "Spell_Simple_Shoot": 0.5,
      "Hit_Chest": 0.3333333333333333,
      "Death01": 2.375,
      "Sword_Attack_RM": 1.5416666666666667,
      "Spell_Simple_Enter": 0.5,
      "Spell_Simple_Idle_Loop": 2.0833333333333335,
      "Spell_Simple_Exit": 0.4166666666666667
    }
  },
  {
    "id": "visual.actor.ember_sentinel",
    "appearance": "appearance.sentinel.ember",
    "asset": "asset.actor.humanoid_combat",
    "url": "/game-assets/actors/humanoid-combat.gltf",
    "scale": 0.75,
    "yOffset": 0,
    "rotationY": 0,
    "animations": {
      "idle": "Idle_Loop",
      "run": "Sprint_Loop",
      "roll": "Roll",
      "melee": "Sword_Attack",
      "ranged": "Library_Bow_Shoot",
      "skill": "Spell_Simple_Shoot",
      "hit": "Hit_Chest",
      "dead": "Death01"
    },
    "humanoidActions": {
      "melee": [
        "Sword_Attack",
        "Sword_Attack_RM"
      ],
      "bow": "Library_Bow_Shoot",
      "cast": {
        "enter": "Spell_Simple_Enter",
        "loop": "Spell_Simple_Idle_Loop",
        "release": "Spell_Simple_Shoot",
        "exit": "Spell_Simple_Exit"
      }
    },
    "animationEvents": {
      "Sword_Attack": [
        {
          "id": "slash",
          "at": 0.42
        }
      ],
      "Sword_Attack_RM": [
        {
          "id": "slash",
          "at": 0.44
        }
      ]
    },
    "playback": {
      "idle": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "run": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "roll": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "melee": {
        "layer": "upper",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "ranged": {
        "layer": "upper",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "skill": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.1
      },
      "hit": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "dead": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      }
    },
    "sockets": {
      "melee": {
        "node": "socket.weapon.right",
        "fallback": {
          "x": 0.55,
          "y": 1.2,
          "z": 0.25
        }
      },
      "ranged": {
        "node": "hand_l",
        "fallback": {
          "x": -0.55,
          "y": 1.2,
          "z": 0.25
        }
      }
    },
    "budget": {
      "maxBytes": 4000000,
      "maxTriangles": 20000,
      "maxBones": 80,
      "maxTextures": 4,
      "maxAnimations": 24
    },
    "lod": {
      "maxAnimatedInstances": 4,
      "fallback": "voxel"
    },
    "animationDurations": {
      "idle": 2.5,
      "run": 0.6666666666666666,
      "roll": 1.4583333333333333,
      "melee": 1.5416666666666667,
      "ranged": 1,
      "skill": 0.5,
      "hit": 0.3333333333333333,
      "dead": 2.375
    },
    "clipDurations": {
      "Idle_Loop": 2.5,
      "Sprint_Loop": 0.6666666666666666,
      "Roll": 1.4583333333333333,
      "Sword_Attack": 1.5416666666666667,
      "Library_Bow_Shoot": 1,
      "Spell_Simple_Shoot": 0.5,
      "Hit_Chest": 0.3333333333333333,
      "Death01": 2.375,
      "Sword_Attack_RM": 1.5416666666666667,
      "Spell_Simple_Enter": 0.5,
      "Spell_Simple_Idle_Loop": 2.0833333333333335,
      "Spell_Simple_Exit": 0.4166666666666667
    }
  },
  {
    "id": "visual.actor.fox",
    "asset": "asset.actor.fox",
    "url": "/game-assets/actors/fox.glb",
    "scale": 0.025,
    "yOffset": 0,
    "rotationY": 3.141593,
    "animations": {
      "idle": "Survey",
      "run": "Run",
      "roll": "Run",
      "melee": "Walk",
      "ranged": "Survey",
      "skill": "Survey",
      "hit": "Survey",
      "dead": "Survey"
    },
    "sockets": {
      "melee": {
        "node": "b_Head_05",
        "fallback": {
          "x": 0,
          "y": 0.7,
          "z": 0.8
        }
      },
      "ranged": {
        "node": "b_Head_05",
        "fallback": {
          "x": 0,
          "y": 0.8,
          "z": 0.5
        }
      }
    },
    "budget": {
      "maxBytes": 250000,
      "maxTriangles": 20000,
      "maxBones": 32,
      "maxTextures": 2,
      "maxAnimations": 4
    },
    "lod": {
      "maxAnimatedInstances": 4,
      "fallback": "voxel"
    },
    "animationDurations": {
      "idle": 3.4166667461395264,
      "run": 1.1583333015441895,
      "roll": 1.1583333015441895,
      "melee": 0.7083333134651184,
      "ranged": 3.4166667461395264,
      "skill": 3.4166667461395264,
      "hit": 3.4166667461395264,
      "dead": 3.4166667461395264
    },
    "clipDurations": {
      "Survey": 3.4166667461395264,
      "Run": 1.1583333015441895,
      "Walk": 0.7083333134651184
    },
    "playback": {
      "idle": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "run": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "roll": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "melee": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "ranged": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "skill": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "hit": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      },
      "dead": {
        "layer": "full",
        "exitAt": 1,
        "blendSpeed": 0.08
      }
    }
  }
] as const satisfies readonly ActorVisualDef[];
