// 客户端 bundle 入口 shim：tsdown 以本文件为入口（见 tsdown.config.ts），
// 实际实现位于 src/client/entry.ts。保持此文件在 src/ 根目录，避免改 tsdown 与 package.json。
export * from "./client/entry.js";
