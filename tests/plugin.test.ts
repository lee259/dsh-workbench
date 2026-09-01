import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { reviewCountsFor } from "../src/host/file-preview.js";
import { apply, inject, name } from "../src/index.js";
import { ACTIVITY_API_PATH, CONTENT_SEARCH_API_PATH, EVENTS_API_PATH, FILES_API_PATH, FILE_API_PATH, FILE_ASSET_API_PATH, GIT_DIFF_API_PATH, GIT_STATUS_API_PATH, REVIEW_API_PATH, WORKSPACE_API_PATH } from "../src/shared/types.js";
import { expect, test } from "vitest";

function jsonRequest(url, body, method = "GET") {
  const payload = body == null ? "" : JSON.stringify(body);
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      if (payload) yield Buffer.from(payload);
    },
  };
}

function jsonSink() {
  let body;
  return {
    res: {
      setHeader() {},
      end(data) {
        body = JSON.parse(data);
      },
    },
    read() {
      return body;
    },
  };
}

test("host plugin exports the Cordis contract", () => {
  expect(name).toBe("dsh-workbench");
  expect(inject).toEqual(["sessions", "webServer"]);
  expect(typeof apply).toBe("function");
});

test("apply registers the file route and records session events", async () => {
  const routes = [];
  const listeners = [];
  apply({
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on(event, handler) {
      listeners.push({ event, handler });
    },
  });
  expect(routes.map((route) => route.path)).toEqual([FILES_API_PATH, FILE_API_PATH, CONTENT_SEARCH_API_PATH, ACTIVITY_API_PATH, REVIEW_API_PATH, WORKSPACE_API_PATH, EVENTS_API_PATH, FILE_ASSET_API_PATH, GIT_STATUS_API_PATH, GIT_DIFF_API_PATH]);
  expect(listeners.map((listener) => listener.event)).toEqual(["session/created", "session/event"]);
});

test("workspace files route searches paths without reading file contents", async () => {
  const routes = [];
  apply({
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on() {},
  });
  let body;
  await routes[0].handler(
    { url: `${FILES_API_PATH}?q=package.json` },
    {
      setHeader() {},
      end(data) {
        body = JSON.parse(data);
      },
    },
  );
  expect(body.files.some((file) => file.path === "package.json")).toBeTruthy();
  expect(Object.keys(body.files[0]).sort().join(",")).toBe("path,size");
});

test("activity route returns normalized session activity", async () => {
  const routes = [];
  apply({
    sessions: {
      list: () => [{
        id: "s1",
        events: [
          {
            type: "tool/call",
            data: {
              callId: "c1",
              name: "write",
              arguments: JSON.stringify({ file_path: "src/index.ts", content: "x" }),
            },
          },
          { type: "tool/result", data: { message: { callId: "c1" } } },
        ],
      }],
    },
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on() {},
  });
  let body;
  await routes.find((route) => route.path === ACTIVITY_API_PATH).handler(
    { url: ACTIVITY_API_PATH },
    {
      setHeader() {},
      end(data) {
        body = JSON.parse(data);
      },
    },
  );
  expect(body.records.length).toBe(1);
  expect(body.records[0]).toEqual({
    id: "s1:c1",
    sessionId: "s1",
    kind: "tool",
    name: "write",
    path: "src/index.ts",
    summary: null,
    status: "done",
    createdAt: body.records[0].createdAt,
    finishedAt: body.records[0].finishedAt,
  });
});

test("activity events notify open clients without invalidating the workspace", () => {
  const routes = [];
  const listeners = [];
  apply({
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on(event, handler) {
      listeners.push({ event, handler });
    },
  });
  const output = [];
  routes.find((route) => route.path === EVENTS_API_PATH).handler(
    { on() {} },
    { setHeader() {}, write(chunk) { output.push(chunk); } },
  );
  listeners.find((listener) => listener.event === "session/event").handler(
    { id: "s1" },
    { type: "tool/call", data: { callId: "c1", name: "bash" } },
  );
  expect(output).toContain("event: activity\ndata: {}\n\n");
  expect(output).not.toContain("event: change\ndata: {}\n\n");
});

test("review route defaults to the session that wrote last", async () => {
  const routes = [];
  apply({
    sessions: {
      list: () => [
        {
          id: "s1",
          events: [
            { type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "a" }, callId: "w1" } },
          ],
        },
        {
          id: "s2",
          events: [
            { type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "b.ts", content: "b" }, callId: "w2" } },
          ],
        },
        {
          id: "s1",
          events: [
            { type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "aa" }, callId: "w3" } },
          ],
        },
      ],
    },
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on() {},
  });
  let body;
  await routes.find((route) => route.path === REVIEW_API_PATH).handler(
    { url: REVIEW_API_PATH },
    {
      setHeader() {},
      end(data) {
        body = JSON.parse(data);
      },
    },
  );
  expect(body.sessionId).toBe("s1");
  expect(body.sessions).toEqual(["s2", "s1"]);
  expect(body.changes.map((change) => change.path)).toEqual(["a.ts"]);
});

test("apply replays existing session events into file previews", async () => {
  const routes = [];
  apply({
    sessions: {
      list: () => [{
        id: "s1",
        events: [
          {
            type: "tool/call",
            data: {
              callId: "c1",
              name: "write",
              arguments: JSON.stringify({ file_path: "package.json", content: "REPLAYED" }),
            },
          },
          { type: "tool/result", data: { message: { callId: "c1" } } },
        ],
      }],
    },
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on() {},
  });
  let body;
  await routes[1].handler(
    { url: `${FILE_API_PATH}?path=package.json` },
    {
      setHeader() {},
      end(data) {
        body = JSON.parse(data);
      },
    },
  );
  expect(body.source).toBe("dsh-write");
  expect(body.content).toBe("REPLAYED");
});

test("workspace POST retargets the file root", async () => {
  const routes = [];
  apply({
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on() {},
  });
  const workspaceRoute = routes.find((route) => route.path === WORKSPACE_API_PATH);
  const filesRoute = routes.find((route) => route.path === FILES_API_PATH);
  const first = jsonSink();
  await workspaceRoute.handler(jsonRequest(WORKSPACE_API_PATH), first.res);
  expect(first.read().root).toBe(resolve(process.cwd()));

  const other = resolve(process.cwd(), "src");
  const posted = jsonSink();
  await workspaceRoute.handler(jsonRequest(WORKSPACE_API_PATH, { root: other }, "POST"), posted.res);
  expect(posted.read().root).toBe(other);

  const files = jsonSink();
  await filesRoute.handler(jsonRequest(`${FILES_API_PATH}?q=index.ts`), files.res);
  expect(files.read().files.some((file) => file.path === "host/index.ts")).toBeTruthy();
  expect(files.read().files.some((file) => file.path === "package.json")).toBeFalsy();
});

test("review route counts the expanded disk diff", async () => {
  const routes = [];
  const before = '"name": "other"';
  const content = '"name": "dsh-workbench"';
  apply({
    sessions: {
      list: () => [{
        id: "s1",
        header: { cwd: process.cwd() },
        events: [
          { type: "tool/code-dispatch", data: { name: "edit", arguments: { file_path: "package.json", old_string: before, new_string: content }, callId: "e1" } },
        ],
      }],
    },
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on() {},
  });
  const reviewRoute = routes.find((route) => route.path === REVIEW_API_PATH);
  const sink = jsonSink();
  await reviewRoute.handler(jsonRequest(`${REVIEW_API_PATH}?session=s1`), sink.res);
  const disk = await readFile(resolve("package.json"), "utf8");
  expect(sink.read().changes[0]).toMatchObject({
    path: "package.json",
    ...reviewCountsFor({ ok: true, path: "package.json", content: disk, size: disk.length }, {
      path: "package.json",
      before,
      content,
      revision: 1,
      sessionId: "s1",
      source: "dsh-write",
    }),
  });
});

test("review route hides writes from another workspace cwd", async () => {
  const routes = [];
  apply({
    sessions: {
      list: () => [
        {
          id: "s1",
          header: { cwd: "/tmp/other-workspace" },
          events: [
            { type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "a" }, callId: "w1" } },
          ],
        },
        {
          id: "s2",
          header: { cwd: process.cwd() },
          events: [
            { type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "b.ts", content: "b" }, callId: "w2" } },
          ],
        },
      ],
    },
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    on() {},
  });
  const reviewRoute = routes.find((route) => route.path === REVIEW_API_PATH);
  const sink = jsonSink();
  await reviewRoute.handler(jsonRequest(REVIEW_API_PATH), sink.res);
  expect(sink.read().sessions).toEqual(["s2"]);
  expect(sink.read().changes.map((change) => change.path)).toEqual(["b.ts"]);
});

test.skipIf(!existsSync(new URL("../lib/client.js", import.meta.url)))("client bundle registers with DSH ModuleLoader as a classic script", async () => {
  const client = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  const registered = [];
  const window = {
    __ModuleLoader__: {
      load(module) {
        registered.push(module.id);
      },
    },
  };
  // DSH injects client.js as a classic <script>. The page already has
  // window.top, so a bare `const top` at script scope fails to register.
  new Function("window", "top", client)(window, {});
  expect(registered).toEqual(["dsh-workbench"]);
});
