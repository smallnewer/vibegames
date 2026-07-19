// 运行时性能预算是工程契约，不依赖 Babylon、React 或浏览器 API。
// 新增重复实体、特效、光源或后处理前必须先在这里和专项文档中声明预算。
export const PERFORMANCE_BUDGETS = {
  targetFps: 60,
  frameBudgetMs: 1000 / 60,
  workloadP95Ms: 12,
  workloadP99Ms: 16,
  logicP95Ms: 3,
  renderP95Ms: 6,
  gpuP95Ms: 8,
  maxNormalDrawCalls: 80,
  maxStressDrawCalls: 120,
  maxRenderPixels: 960 * 540,
  stressPlayers: 4,
  stressEnemies: 30,
  stressProjectiles: 64,
  stressVfx: 48,
  diagnosticsHz: 4,
  sampleWindow: 600,
} as const;
