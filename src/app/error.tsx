"use client";
import { useEffect } from "react";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error(error); }, [error]); return <main className="standalone"><div className="card card-pad" style={{ textAlign: "center" }}><h1>Something went wrong</h1><p className="text-muted" style={{ margin: "var(--space-3) 0 var(--space-5)" }}>Your data is safe. Try this page again.</p><button className="btn btn-primary" onClick={reset}>Try again</button></div></main>; }
