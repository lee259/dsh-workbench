import { createLocaleStore, followDshLocale, resolveLocale, translate } from "../src/shared/i18n.js";
import { expect, test } from "vitest";

test("zh and en resolve from language tags", () => {
  expect(resolveLocale("zh-CN")).toBe("zh");
  expect(resolveLocale("en-US")).toBe("en");
  expect(resolveLocale("")).toBe("en");
});

test("translate fills placeholders from the active catalog", () => {
  expect(translate("zh", "linesWorkspace", { count: 12 })).toBe("12 行 · 当前工作区");
  expect(translate("en", "linesWorkspace", { count: 12 })).toBe("12 lines · workspace");
  expect(translate("zh", "workbench")).toBe("工作台");
  expect(translate("en", "workbench")).toBe("Workbench");
  expect(translate("zh", "hideTree")).toBe("隐藏文件栏");
  expect(translate("en", "showTree")).toBe("Show file pane");
  expect(translate("zh", "addReviewNote")).toBe("添加审查意见");
  expect(translate("zh", "notPreviewableHint")).toBe("该文件类型不在工作台预览白名单中");
  expect(translate("zh", "fileTooLargeHint")).toBe("文本文件最大 800 KB，图片最大 12 MB");
  expect(translate("en", "file_too_large")).toBe("File exceeds preview size limit");
  expect(translate("en", "collapseAllDiffs")).toBe("Collapse all diffs");
  expect(translate("en", "reviewNoteTemplate", { reference: "@src/example.ts:2" })).toBe(
    "Please inspect and address this review note:\n\n@src/example.ts:2\n\nReview note:",
  );
});

test("locale store switches catalogs", () => {
  const i18n = createLocaleStore("en");
  expect(i18n.t("close")).toBe("Close");
  i18n.setLocale("zh");
  expect(i18n.t("close")).toBe("关闭");
});

test("followDshLocale tracks the DSH locale snapshot", () => {
  let active = "en";
  const listeners = new Set();
  const i18n = createLocaleStore("en");
  const stop = followDshLocale(i18n, {
    getLocale: () => ({ active }),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  });
  expect(i18n.getSnapshot()).toBe("en");
  active = "zh-CN";
  for (const listener of listeners) listener();
  expect(i18n.getSnapshot()).toBe("zh");
  stop();
});
