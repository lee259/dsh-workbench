import type { DshLocaleFace } from "../shared/i18n.js";
import type { DshWorkspaceFaces } from "./workspace-identity.js";

export type WorkbenchSlotContext = {
  slots: {
    inject(name: string, factory: () => unknown): void;
    register(slot: Record<string, unknown>, component: unknown): unknown;
  };
};

export type WorkbenchClientContext = WorkbenchSlotContext & DshWorkspaceFaces & {
  locale: DshLocaleFace;
  sidebarRight?: unknown;
  sidebarRightTabs?: unknown;
  get(name: string): unknown;
  effect(factory: () => (() => void) | void, name: string): void;
};

export type WorkbenchPlugin = {
  inject: ["slots", "locale", "sessions", "workspaces"];
  apply(ctx: WorkbenchClientContext): void;
};
