import { defineConfig } from "vitest/config";

// 单元测试不加载站点的 Cloudflare 构建插件。
export default defineConfig({
  test: {
    environment: "node",
  },
});
