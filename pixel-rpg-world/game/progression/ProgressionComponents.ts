export const PRIMARY_ATTRIBUTES = ["might", "finesse", "vitality", "resolve"] as const;
export type PrimaryAttribute = typeof PRIMARY_ATTRIBUTES[number];
export type SkillRank = 1 | 2 | 3 | 4 | 5;

export interface ProgressionComponent {
  level: number;
  experience: number;
  unspentAttributes: number;
  unspentSkills: number;
  allocated: Record<PrimaryAttribute, number>;
  skillRanks?: Record<string, SkillRank>;
}
