import { WORKBENCH_CSS } from "../styles.generated.js";

const STYLE_SELECTOR = "style[data-dsh-workbench-styles]";

export function installWorkbenchStyles(document: Document): void {
  if (document.querySelector(STYLE_SELECTOR)) return;
  const style = document.createElement("style");
  style.setAttribute("data-dsh-workbench-styles", "");
  style.textContent = WORKBENCH_CSS;
  document.head.append(style);
}
