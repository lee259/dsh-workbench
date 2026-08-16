export type DshRequire = (id: string) => unknown;

export type WorkbenchSlotContext = {
  slots: {
    inject(name: string, factory: () => unknown): void;
    register(slot: Record<string, unknown>, component: unknown): unknown;
  };
};

export type WorkbenchClientContext = WorkbenchSlotContext & {
  locale: DshLocaleFace;
};

export type WorkbenchPlugin = {
  inject: ["slots", "locale"];
  apply(ctx: WorkbenchClientContext): void;
};
import type { DshLocaleFace } from "../shared/i18n.js";
