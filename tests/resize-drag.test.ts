import { startResizeDrag } from "../src/client/chrome/resize-drag.js";
import { expect, test } from "vitest";

function fakeHandle() {
  const listeners = new Map<string, (event: { pointerId: number; clientX: number }) => void>();
  const classes = new Set<string>();
  const attrs = new Map<string, string>();
  return {
    ownerDocument: {
      documentElement: {
        classList: {
          add(name: string) { classes.add(name); },
          remove(name: string) { classes.delete(name); },
          contains(name: string) { return classes.has(name); },
        },
      },
    },
    captured: [] as number[],
    released: [] as number[],
    setAttribute(name: string, value: string) { attrs.set(name, value); },
    removeAttribute(name: string) { attrs.delete(name); },
    getAttribute(name: string) { return attrs.get(name) ?? null; },
    setPointerCapture(pointerId: number) { this.captured.push(pointerId); },
    releasePointerCapture(pointerId: number) { this.released.push(pointerId); },
    addEventListener(type: string, listener: (event: { pointerId: number; clientX: number }) => void) { listeners.set(type, listener); },
    removeEventListener(type: string) { listeners.delete(type); },
    dispatch(type: string, event: { pointerId: number; clientX: number }) { listeners.get(type)?.(event); },
  };
}

test("resize drag captures the pointer and marks the document until it ends", () => {
  const handle = fakeHandle();
  const widths: number[] = [];
  startResizeDrag(handle, 7, (event) => widths.push(event.clientX));

  expect(handle.captured).toEqual([7]);
  expect(handle.ownerDocument.documentElement.classList.contains("dsh-wb-is-resizing")).toBe(true);
  expect(handle.getAttribute("data-resizing")).toBe("true");

  handle.dispatch("pointermove", { pointerId: 7, clientX: 420 });
  handle.dispatch("pointermove", { pointerId: 8, clientX: 100 });
  expect(widths).toEqual([420]);

  handle.dispatch("pointerup", { pointerId: 7, clientX: 420 });
  expect(handle.released).toEqual([7]);
  expect(handle.ownerDocument.documentElement.classList.contains("dsh-wb-is-resizing")).toBe(false);
  expect(handle.getAttribute("data-resizing")).toBe(null);
});
