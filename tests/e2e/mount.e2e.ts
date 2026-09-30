import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { test, expect } from "@playwright/test";

test("packed plugin mounts, loads the editor on demand, and preserves edits", async ({ page }) => {
  const url = process.env.DSH_E2E_URL;
  const workspace = process.env.DSH_E2E_WORKSPACE;
  if (!url || !workspace) throw new Error("Run pnpm test:mount to start the isolated DSH host");
  const errors: string[] = [];
  const editorRequests: string[] = [];
  const fileTreeRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (request.url().endsWith("/api/dsh-workbench/editor.js")) editorRequests.push(request.url());
    if (request.url().endsWith("/api/dsh-workbench/files")) fileTreeRequests.push(request.url());
  });
  await page.goto(url);
  const origin = new URL(url).origin;
  const rpc = async (method: string, request: Record<string, unknown>) => {
    const response = await page.request.post(`${origin}/api/${method}`, { data: {
      type: "client-request", rpcId: `smoke-${method}`, method, payload: { args: { request } },
    } });
    expect(response.ok(), await response.text()).toBe(true);
    const body = await response.json();
    expect(body.result.ok, JSON.stringify(body)).toBe(true);
    return body.result.value;
  };
  await rpc("workspace/create", { path: workspace });
  await page.reload();
  const testingNotice = page.getByRole("dialog", { name: /^(Internal Testing Notice|Preview Notice)$/ });
  await testingNotice.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (await testingNotice.count() && await testingNotice.isVisible()) {
    await testingNotice.getByRole("button", { name: "Continue" }).click({ force: true });
    await expect(testingNotice).toBeHidden({ timeout: 10_000 });
  }
  const configureLater = page.getByRole("button", { name: /^(Configure later|稍后配置)$/ });
  await configureLater.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (await configureLater.isVisible()) await configureLater.click();
  const chooseWorkspace = page.getByRole("button", { name: /^Choose workspace$/ });
  await chooseWorkspace.click();
  const workspaceChoice = page.getByRole("menuitem", { name: "workspace", exact: true });
  await workspaceChoice.waitFor({ state: "visible", timeout: 10_000 });
  await workspaceChoice.click();
  await page.getByRole("button", { name: /^New session$/i }).first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('style[data-dsh-workbench-styles]')).toHaveCount(1);
  const expandRight = page.getByRole("button", { name: /^(Expand sidebar|Open right sidebar|展开侧栏|打开右侧栏)$/ });
  if (await expandRight.count()) await expandRight.click();
  const reviewGuideEntry = page.getByRole("button", { name: /Review|审查/i }).last();
  await expect(reviewGuideEntry).toBeVisible({ timeout: 30_000 });
  await reviewGuideEntry.click();
  await expect(page.locator(".dsh-wb-code-review")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => {
    const response = await page.request.get(`${origin}/api/dsh-workbench/workspace`);
    return basename((await response.json()).root);
  }).toBe("workspace");
  await expect.poll(async () => {
    const response = await page.request.get(`${origin}/api/dsh-workbench/files`);
    const payload = await response.json();
    return (payload.files ?? []).some((file: { path: string }) => file.path === "readme.md");
  }).toBe(true);
  const nativeTree = page.locator(".dsh-wb-native-tree-page");
  if (await expandRight.count()) await expandRight.click();
  const nativeEntry = page.getByRole("button", { name: /^(File workspace|文件工作区)(?:\s|$)/ }).last();
  if (process.env.DSH_E2E_VERSION?.startsWith("0.2.")) await expect(nativeEntry).toBeVisible();
  if (await nativeEntry.count()) {
    await nativeEntry.click();
    await expect(nativeTree).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".dsh-wb-sidebar")).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(fileTreeRequests.length).toBeGreaterThan(0);
    const nativeRow = page.locator('.dsh-wb-native-tree-page .dsh-wb-tree-row[data-path="readme.md"]');
    await expect(nativeRow).toBeVisible({ timeout: 10_000 });
    await nativeRow.click();
    await expect(page.locator(".dsh-wb-native-content-page .dsh-wb-markdown-preview")).toContainText("Mount smoke");
    expect(errors).toEqual([]);
    return;
  } else {
    const toggle = page.locator(".dsh-wb-toggle");
    if (!(await toggle.count())) {
      expect(errors).toEqual([]);
      return;
    }
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await toggle.click();
  }
  const row = (path: string) => page.locator(`.dsh-wb-tree-row[data-path="${path}"]`);
  await row("readme.md").click();
  await expect(page.locator(".dsh-wb-markdown-preview")).toContainText("Mount smoke");
  expect(editorRequests).toHaveLength(0);
  const loaded = page.waitForResponse((response) => response.url().endsWith("/api/dsh-workbench/editor.js"));
  await row("sample.m").click();
  expect((await loaded).ok()).toBe(true);
  const editor = page.locator(".dsh-wb-cm .cm-content");
  await expect(editor).toContainText("x = 1;");
  await page.getByRole("button", { name: /^(Edit file|编辑文件)$/ }).click();
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("y = 2;\n");
  await expect(editor).toContainText("y = 2;");
  await row("other.ts").click();
  await expect(editor).toContainText("export const other");
  await page.getByRole("tab", { name: "sample.m", exact: true }).click();
  await expect(editor).toContainText("y = 2;");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor).not.toContainText("y = 2;");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(editor).toContainText("y = 2;");
  const close = page.getByRole("button", { name: /^(Close file|关闭文件): sample.m$/ });
  page.once("dialog", (dialog) => dialog.dismiss());
  await close.click();
  await expect(editor).toContainText("y = 2;");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+s");
  await expect.poll(() => readFile(join(workspace, "sample.m"), "utf8")).toContain("y = 2;");
  // A switch/reload must never replace the baseline used for conflict detection.
  await page.getByRole("button", { name: /^(Edit file|编辑文件)$/ }).click();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("z = 3;\n");
  await row("other.ts").click();
  await writeFile(join(workspace, "sample.m"), "% external change\n");
  await page.getByRole("tab", { name: "sample.m", exact: true }).click();
  await expect(editor).toContainText("z = 3;");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+s");
  await expect(page.locator(".dsh-wb-error")).toBeVisible();
  expect(await readFile(join(workspace, "sample.m"), "utf8")).toBe("% external change\n");
  page.once("dialog", (dialog) => dialog.accept());
  await close.click();
  await expect(page.getByRole("tab", { name: "sample.m", exact: true })).toHaveCount(0);
  expect(editorRequests).toHaveLength(1);
  // The intentional save conflict is the only expected failed network request.
  expect(errors.filter((error) => !error.includes("409 (Conflict)"))).toEqual([]);
});
