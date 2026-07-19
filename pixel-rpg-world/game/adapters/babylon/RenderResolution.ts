import { PERFORMANCE_BUDGETS } from "../../host/PerformanceBudgets";

export const MAX_RENDER_PIXELS = PERFORMANCE_BUDGETS.maxRenderPixels;

// CSS 视口保持铺满；仅限制内部像素数，避免窗口尺寸把 GPU 预算悄悄冲穿。
export function renderHardwareScaling(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  return Math.max(1, Math.sqrt(width * height / MAX_RENDER_PIXELS));
}
