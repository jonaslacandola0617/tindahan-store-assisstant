"use client";

import { RefObject, useEffect, useRef } from "react";

const focusable = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Traps keyboard focus inside a modal and restores it when the modal closes. */
export function useDialogFocus(open: boolean, dialog: RefObject<HTMLElement | null>, close: () => void) {
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modal = dialog.current ?? document.querySelector<HTMLElement>(".overlay-scrim.is-open [role='dialog']");
    if (!modal) return;
    const elements = () => Array.from(modal.querySelectorAll<HTMLElement>(focusable));
    requestAnimationFrame(() => elements()[0]?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const items = elements();
      if (!items.length) return;
      const first = items[0]!, last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous.current?.focus(); };
  }, [open, dialog, close]);
}
