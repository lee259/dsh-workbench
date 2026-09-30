import { createWorkbenchNavigation } from "../src/client/navigation.js";
import { expect, test } from "vitest";

test("navigation publishes file and review requests to its presentation", () => {
  const navigation = createWorkbenchNavigation();
  const requests = [];
  navigation.subscribe((request) => requests.push(request));

  navigation.openFile("src/client/ui.tsx", "view", 18);
  navigation.openReview("src/client/ui.tsx");

  expect(requests).toEqual([
    { kind: "file", path: "src/client/ui.tsx", mode: "view", line: 18 },
    { kind: "review", path: "src/client/ui.tsx", focus: true },
  ]);
});

test("navigation subscriptions can be detached", () => {
  const navigation = createWorkbenchNavigation();
  const requests = [];
  const stop = navigation.subscribe((request) => requests.push(request));

  stop();
  navigation.openReview();

  expect(requests).toEqual([]);
});

test("navigation retains the latest request for a just-mounted workbench", () => {
  const navigation = createWorkbenchNavigation();
  navigation.openFile("src/main.ts", "view", 7);

  expect(navigation.latest()).toEqual({
    version: 1,
    request: { kind: "file", path: "src/main.ts", mode: "view", line: 7 },
  });
});
