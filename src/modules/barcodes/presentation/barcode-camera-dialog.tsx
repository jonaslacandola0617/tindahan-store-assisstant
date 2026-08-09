"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { InlineLoading } from "@/components/loading";
import { cameraErrorKind, shouldAutoStartCamera } from "./camera-error";

const text = {
  EN: {
    title: "Scan manufacturer barcode",
    help: "Hold the barcode on the package inside the frame.",
    ready: "Ready to scan",
    readyHelp: "The barcode will be placed in the product form after it is read.",
    use: "Use camera",
    looking: "Looking for a barcode…",
    cancel: "Cancel scan",
    retry: "Try camera again",
    close: "Close",
    error: "Camera isn't available",
    denied: "Camera permission was blocked. Allow camera access in the browser's site settings, then try again.",
    missing: "No available camera was found.",
    busy: "The camera is already in use by another app or browser tab. Close it there, then try again.",
    unsupported: "This browser cannot open the camera. Enter the barcode instead.",
    unavailable: "The camera could not start. Try again or enter the barcode instead.",
    decoder: "The barcode reader could not start. Refresh the page and try again, or enter the barcode instead.",
  },
  FIL: {
    title: "I-scan ang barcode ng gumawa",
    help: "Ilagay sa loob ng kahon ang barcode na nasa pakete.",
    ready: "Handa nang mag-scan",
    readyHelp: "Ilalagay ang barcode sa form kapag nabasa na ito.",
    use: "Gamitin ang camera",
    looking: "Hinahanap ang barcode…",
    cancel: "Itigil ang pag-scan",
    retry: "Subukan ulit ang camera",
    close: "Isara",
    error: "Hindi magamit ang camera",
    denied: "Hindi pinayagan ang camera. Payagan ito sa site settings ng browser, tapos subukan ulit.",
    missing: "Walang makitang camera na maaaring gamitin.",
    busy: "Ginagamit na ang camera ng ibang app o browser tab. Isara muna iyon, tapos subukan ulit.",
    unsupported: "Hindi mabuksan ng browser na ito ang camera. Ilagay na lang ang barcode.",
    unavailable: "Hindi nagsimula ang camera. Subukan ulit o ilagay na lang ang barcode.",
    decoder: "Hindi nagsimula ang barcode reader. I-refresh ang pahina at subukan ulit, o ilagay na lang ang barcode.",
  },
} as const;

type View = "ready" | "requesting" | "scanning" | "error";

export function BarcodeCameraDialog({ open, locale, onClose, onDetected }: { open: boolean; locale: "EN" | "FIL"; onClose: () => void; onDetected: (code: string) => void }) {
  const t = text[locale];
  const [view, setView] = useState<View>("ready");
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scanner = useRef<{ stop: () => void } | null>(null);

  const stop = useCallback(() => {
    scanner.current?.stop();
    scanner.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    setMessage("");
    setView("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new TypeError("Camera capture is unavailable.");
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      stream.current = nextStream;
      setView("scanning");
      requestAnimationFrame(() => {
        void (async () => {
          try {
            const preview = video.current;
            if (!preview || stream.current !== nextStream) return;
            const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");
            if (stream.current !== nextStream) return;
            const reader = new BrowserMultiFormatOneDReader(undefined, { delayBetweenScanAttempts: 160, delayBetweenScanSuccess: 160 });
            const controls = await reader.decodeFromStream(nextStream, preview, (result, _error, currentControls) => {
              if (!result) return;
              const code = result.getText().replace(/[\s-]/g, "").trim();
              if (!/^\d{8,14}$/.test(code)) return;
              currentControls.stop();
              stop();
              onDetected(code);
              onClose();
            });
            if (stream.current === nextStream) scanner.current = controls;
            else controls.stop();
          } catch {
            if (stream.current !== nextStream) return;
            stop();
            setMessage(t.decoder);
            setView("error");
          }
        })();
      });
    } catch (error) {
      stop();
      setMessage(t[cameraErrorKind(error)]);
      setView("error");
    }
  }, [onClose, onDetected, stop, t]);

  useEffect(() => {
    if (!open) { stop(); return; }
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setView("ready");
      setMessage("");
      try {
        if (!navigator.permissions?.query) return;
        const permission = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (!cancelled && shouldAutoStartCamera(permission.state)) await start();
      } catch {}
    })();
    return () => { cancelled = true; stop(); };
  }, [open, start, stop]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>("button")?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose, open]);

  if (!open) return null;
  return <div className="overlay-scrim camera-dialog-layer is-open" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} className="modal modal-wide is-open scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="manufacturer-scan-title">
      <div className="modal-header"><div><h3 id="manufacturer-scan-title">{t.title}</h3><p className="card-subtitle">{t.help}</p></div><button className="btn-icon btn-ghost" type="button" aria-label={t.close} onClick={onClose}><Icon name="x"/></button></div>
      {view === "ready" && <><div className="scanner-surface"><span className="scanner-frame"><Icon name="camera"/></span><p className="font-medium">{t.ready}</p><p className="text-sm text-muted">{t.readyHelp}</p></div><button className="btn btn-secondary btn-block" type="button" onClick={start}>{t.use}</button></>}
      {(view === "requesting" || view === "scanning") && <div className="scanner-state"><div className="scanner-surface is-scanning" aria-busy="true"><video ref={video} className="scanner-video" muted playsInline/><span className="scanner-frame scanner-frame-overlay"/><InlineLoading message={t.looking}/></div><button className="btn btn-secondary" type="button" onClick={() => { stop(); setView("ready"); }}>{t.cancel}</button></div>}
      {view === "error" && <div className="scanner-state"><div className="banner banner-warning"><Icon name="camera"/><div><strong>{t.error}</strong><p className="text-sm">{message}</p></div></div><button className="btn btn-secondary" type="button" onClick={start}>{t.retry}</button></div>}
    </div>
  </div>;
}
