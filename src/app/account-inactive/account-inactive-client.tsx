"use client";

import { signOut } from "next-auth/react";

export function AccountInactiveClient({ label }: { label: string }) {
  return <button className="btn btn-primary btn-lg" type="button" onClick={() => void signOut({ callbackUrl: "/sign-in?deactivated=1" })}>{label}</button>;
}
