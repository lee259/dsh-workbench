import { Icon } from "../chrome/icons.js";
import { useWorkbenchServices } from "./runtime.js";
import { WorkbenchStyles } from "./styles.js";
import { useSyncExternalStore } from "react";

export function WorkbenchToggle() {
    const { store, i18n } = useWorkbenchServices();
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const t = i18n.t;
    const label = state.visible ? t("hidePanel") : t("showPanel");
    return (
      <button
        className="dsh-wb-toggle"
        type="button"
        aria-label={label}
        aria-expanded={state.visible}
        data-open={state.visible ? "true" : "false"}
        title={`${label} · ${t("shortcutHint")}`}
        onClick={() => (state.visible ? store.hide() : store.show())}
      >
        <WorkbenchStyles />
        <span className="dsh-wb-toggle-label">{t("workbench")}</span>
        <Icon name="panel" />
      </button>
    );
}
