import type { ReactNode } from "react";
import { Tooltip } from "@deepseek-ai/dsh-client-ui-primitives";

export function WorkbenchTooltip({ label, children }: { label: string; children: ReactNode }) {
  return <Tooltip label={label} side="bottom" delayMs={400}>{children}</Tooltip>;
}
