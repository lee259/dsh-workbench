import assert from "node:assert/strict";
import test from "node:test";
import { createLocaleStore, followDshLocale, resolveLocale, translate } from "../lib/shared/i18n.js";

test("zh and en resolve from language tags", () => {
  assert.equal(resolveLocale("zh-CN"), "zh");
  assert.equal(resolveLocale("en-US"), "en");
  assert.equal(resolveLocale(""), "en");
});

test("translate fills placeholders from the active catalog", () => {
  assert.equal(translate("zh", "linesWorkspace", { count: 12 }), "12 行 · 当前工作区");
  assert.equal(translate("en", "linesWorkspace", { count: 12 }), "12 lines · workspace");
  assert.equal(translate("zh", "footerBrand"), "DSH 工作台");
  assert.equal(translate("en", "footerBrand"), "DSH Workbench");
});

test("locale store switches catalogs", () => {
  const i18n = createLocaleStore("en");
  assert.equal(i18n.t("close"), "Close");
  i18n.setLocale("zh");
  assert.equal(i18n.t("close"), "关闭");
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
  assert.equal(i18n.getSnapshot(), "en");
  active = "zh-CN";
  for (const listener of listeners) listener();
  assert.equal(i18n.getSnapshot(), "zh");
  stop();
});
