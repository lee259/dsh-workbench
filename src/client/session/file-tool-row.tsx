import { filePathFromBlock } from "../capture/tool-path.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { WorkbenchStyles } from "../workbench/styles.js";

function toolLabelKey(name: string) {
  if (name === "read") return "toolRead" as const;
  if (name === "edit") return "toolEdit" as const;
  return "toolWrite" as const;
}

export function FileToolRow({ toolName, block }: { toolName: string; block?: unknown }) {
    const { store, i18n } = useWorkbenchServices();
    const t = i18n.t;
    const filePath = filePathFromBlock(block);
    const settled = Boolean(block && typeof block === "object" && "kind" in block);
    const failed = settled && Boolean((block as { isError?: boolean }).isError);
    const status = failed ? t("statusError") : settled ? t("statusDone") : t("statusRunning");
    return (
      <div className="dsh-wb-tool-row" data-tool={toolName}>
        <WorkbenchStyles />
        <span className="dsh-wb-tool-name">{t(toolLabelKey(toolName))}</span>
        <span className="dsh-wb-tool-sep">·</span>
        {filePath ? (
          <button className="dsh-wb-tool-path" data-dsh-wb-mode={toolName === "write" || toolName === "edit" ? "diff" : "view"} type="button" onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void store.open(filePath, toolName === "write" || toolName === "edit" ? "diff" : "view");
          }}>
            {filePath}
          </button>
        ) : <span className="dsh-wb-tool-fallback">{t("file")}</span>}
        <span className="dsh-wb-tool-status" data-kind={failed ? "error" : settled ? "ok" : undefined}>{status}</span>
      </div>
    );
}
