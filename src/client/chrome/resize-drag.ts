type ResizePointerEvent = {
  pointerId: number;
  clientX: number;
};

type ResizeHandle = {
  ownerDocument: {
    documentElement: {
      classList: {
        add(name: string): void;
        remove(name: string): void;
      };
    };
  };
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
  addEventListener(type: string, listener: (event: ResizePointerEvent) => void): void;
  removeEventListener(type: string, listener: (event: ResizePointerEvent) => void): void;
};

export function startResizeDrag(
  handle: ResizeHandle,
  pointerId: number,
  onMove: (event: ResizePointerEvent) => void,
): void {
  const resizingRoot = handle.ownerDocument.documentElement;
  const move = (event: ResizePointerEvent) => {
    if (event.pointerId === pointerId) onMove(event);
  };
  const stop = (event: ResizePointerEvent) => {
    if (event.pointerId !== pointerId) return;
    resizingRoot.classList.remove("dsh-wb-is-resizing");
    handle.removeAttribute("data-resizing");
    handle.releasePointerCapture(pointerId);
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", stop);
    handle.removeEventListener("pointercancel", stop);
  };

  resizingRoot.classList.add("dsh-wb-is-resizing");
  handle.setAttribute("data-resizing", "true");
  handle.setPointerCapture(pointerId);
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
}
