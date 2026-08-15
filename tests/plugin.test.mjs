import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { apply, inject, name } from "../lib/index.js";
import { ACTIVITY_API_PATH, EVENTS_API_PATH, FILES_API_PATH, FILE_API_PATH } from "../lib/shared/types.js";

test("host plugin exports the Cordis contract", () => {
  assert.equal(name, "dsh-workbench");
  assert.deepEqual(inject, ["sessions", "webServer"]);
  assert.equal(typeof apply, "function");
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
  assert.deepEqual(routes.map((route) => route.path), [FILES_API_PATH, FILE_API_PATH, ACTIVITY_API_PATH, EVENTS_API_PATH]);
  assert.deepEqual(listeners.map((listener) => listener.event), ["session/created", "session/event"]);
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
  assert.ok(body.files.some((file) => file.path === "package.json"));
  assert.equal(Object.keys(body.files[0]).sort().join(","), "path,size");
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
  await routes[2].handler(
    { url: ACTIVITY_API_PATH },
    {
      setHeader() {},
      end(data) {
        body = JSON.parse(data);
      },
    },
  );
  assert.equal(body.records.length, 1);
  assert.deepEqual(body.records[0], {
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
  assert.equal(body.source, "dsh-write");
  assert.equal(body.content, "REPLAYED");
});

test("client bundle registers with DSH ModuleLoader as a classic script", async () => {
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
  assert.deepEqual(registered, ["dsh-workbench"]);
});
