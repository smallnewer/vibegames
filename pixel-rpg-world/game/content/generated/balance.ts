// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。

export const BALANCE_DATA = {
  "version": 1,
  "levelCap": 30,
  "xpExponent": 1.55,
  "attributePointsPerLevel": 3,
  "startingSkillPoints": 1,
  "skillPointEveryLevels": 2,
  "skillRankMultipliers": [
    1,
    1.12,
    1.25,
    1.39,
    1.55
  ],
  "resistanceMin": -0.25,
  "resistanceMax": 0.75,
  "armorCap": 0.65,
  "partyHealth": [
    1,
    1.65,
    2.2,
    2.7
  ],
  "partyDamage": [
    1,
    1.08,
    1.16,
    1.24
  ],
  "partyLoot": [
    1,
    1.6,
    2.1,
    2.5
  ],
  "rarityWeights": {
    "normal": 0.68,
    "magic": 0.26,
    "rare": 0.055,
    "unique": 0.005
  },
  "reinforcement": [
    {
      "level": 1,
      "baseMultiplier": 1.08,
      "scrap": 4,
      "essence": 0,
      "seal": 0
    },
    {
      "level": 2,
      "baseMultiplier": 1.17,
      "scrap": 8,
      "essence": 2,
      "seal": 0
    },
    {
      "level": 3,
      "baseMultiplier": 1.27,
      "scrap": 14,
      "essence": 4,
      "seal": 1
    },
    {
      "level": 4,
      "baseMultiplier": 1.38,
      "scrap": 22,
      "essence": 7,
      "seal": 2
    },
    {
      "level": 5,
      "baseMultiplier": 1.5,
      "scrap": 32,
      "essence": 10,
      "seal": 4
    }
  ]
} as const;
