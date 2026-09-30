import { FILE_TOOLS } from "../../shared/types.js";
import type { WorkbenchSlotContext } from "../plugin-contract.js";

export function applyWorkbenchSlots(ctx: WorkbenchSlotContext, components: {
  FileToolRow: unknown;
  WorkbenchToggle: unknown;
  ReviewToggle?: unknown;
}, options: { showToggle?: boolean; showFileToolRows?: boolean; nativeReviewToggle?: boolean } = {}): void {
  if (options.showFileToolRows !== false) ctx.slots.inject("tool.call.toolview", function* () {
    for (const key of FILE_TOOLS) {
      yield ctx.slots.register(
        { name: "tool.call.toolview", key, locale: "conversation", priority: -1 },
        components.FileToolRow,
      );
    }
  });
  if (options.showToggle !== false) {
    ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register(
      { name: "conversation.session.header.utilities", id: "dsh-workbench", order: 10 },
      options.nativeReviewToggle && components.ReviewToggle ? components.ReviewToggle : components.WorkbenchToggle,
    ));
  }
}
