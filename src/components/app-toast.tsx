"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icon";

export function AppToast({ message, locale, onDismiss, duration = 5000 }: { message: string; locale: "EN" | "FIL"; onDismiss: () => void; duration?: number }) {
  const dismiss = useRef(onDismiss);
  useEffect(() => { dismiss.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => dismiss.current(), duration);
    return () => clearTimeout(timer);
  }, [duration, message]);
  if (!message) return null;
  return <div className="toast-region" role="status" aria-live="polite">
    <div className="toast app-toast">
      <span className="app-toast-icon"><Icon name="check"/></span>
      <div className="toast-body">{message}</div>
      <button className="toast-close" type="button" aria-label={locale === "FIL" ? "Isara" : "Dismiss"} onClick={onDismiss}><Icon name="x" className="icon icon-sm"/></button>
    </div>
  </div>;
}
