const TOOLTIP_ATTRIBUTE = "data-dsh-wb-tooltip";
const TOOLTIP_ID = "dsh-wb-tooltip";
const TOOLTIP_DELAY = 400;

export function pointerLeavesTooltipTarget(target: Pick<Element, "contains"> | undefined, relatedTarget: Node | null): boolean {
  return target != null && !target.contains(relatedTarget);
}

function tooltipTarget(target: EventTarget | null): HTMLElement | undefined {
  if (!(target instanceof Element)) return undefined;
  const element = target.closest<HTMLElement>(`[${TOOLTIP_ATTRIBUTE}]`);
  return element?.getAttribute(TOOLTIP_ATTRIBUTE) ? element : undefined;
}

export function installWorkbenchTooltip(document: Document): () => void {
  let tooltip: HTMLDivElement | undefined;
  let active: HTMLElement | undefined;
  let showTimer: number | undefined;

  const hide = () => {
    if (showTimer !== undefined) {
      window.clearTimeout(showTimer);
      showTimer = undefined;
    }
    if (!active) return;
    if (active.getAttribute("aria-describedby") === TOOLTIP_ID) active.removeAttribute("aria-describedby");
    active = undefined;
    tooltip?.remove();
    tooltip = undefined;
  };

  const show = (target: HTMLElement) => {
    const text = target.getAttribute(TOOLTIP_ATTRIBUTE);
    if (!text || active === target) return;
    hide();
    active = target;
    tooltip = document.createElement("div");
    tooltip.id = TOOLTIP_ID;
    tooltip.className = "dsh-wb-tooltip";
    tooltip.role = "tooltip";
    tooltip.textContent = text;
    document.body.append(tooltip);
    target.setAttribute("aria-describedby", TOOLTIP_ID);

    const targetBox = target.getBoundingClientRect();
    const tooltipBox = tooltip.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, targetBox.left + targetBox.width / 2 - tooltipBox.width / 2),
      window.innerWidth - tooltipBox.width - 8,
    );
    const above = targetBox.top >= tooltipBox.height + 8;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${above ? targetBox.top - tooltipBox.height - 6 : targetBox.bottom + 6}px`;
  };

  const onPointerOver = (event: PointerEvent) => {
    const target = tooltipTarget(event.target);
    if (!target) return;
    if (showTimer !== undefined) window.clearTimeout(showTimer);
    showTimer = window.setTimeout(() => {
      showTimer = undefined;
      show(target);
    }, TOOLTIP_DELAY);
  };
  const onPointerOut = (event: PointerEvent) => {
    const target = tooltipTarget(event.target);
    if (pointerLeavesTooltipTarget(target, event.relatedTarget as Node | null)) hide();
  };
  const onFocusIn = (event: FocusEvent) => {
    const target = tooltipTarget(event.target);
    if (target) show(target);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (active && !active.contains(event.relatedTarget as Node | null)) hide();
  };

  document.addEventListener("pointerover", onPointerOver);
  document.addEventListener("pointerout", onPointerOut);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
  return () => {
    hide();
    document.removeEventListener("pointerover", onPointerOver);
    document.removeEventListener("pointerout", onPointerOut);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", onFocusOut);
  };
}
