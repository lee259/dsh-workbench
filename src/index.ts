// 插件入口 shim：package.json 的 main/exports 指向 lib/index.js，
// 实际实现位于 src/host/index.ts。保持此文件在 src/ 根目录，避免改导出路径。
export * from "./host/index.js";
