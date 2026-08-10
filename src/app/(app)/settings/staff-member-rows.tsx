"use client";

import { useState } from "react";

type Member = {
  id: string;
  role: "OWNER" | "STAFF";
  status: string;
  user: { name: string | null; email: string };
};

const copy = {
  EN: { active: "Active", owner: "Owner", staff: "Staff", remove: "Remove access", confirm: "Remove staff", cancel: "Keep access", error: "We couldn't remove this staff member." },
  FIL: { active: "Aktibo", owner: "Owner", staff: "Staff", remove: "Alisin ang access", confirm: "Alisin ang staff", cancel: "Panatilihin", error: "Hindi maalis ang access ng staff na ito." },
} as const;

export function StaffMemberRows({ initialMembers, locale }: { initialMembers: Member[]; locale: "EN" | "FIL" }) {
  const t = copy[locale];
  const [members, setMembers] = useState(initialMembers);
  const [confirmId, setConfirmId] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [errorId, setErrorId] = useState("");

  async function remove(memberId: string) {
    setPendingId(memberId);
    setErrorId("");
    try {
      const response = await fetch(`/api/settings/staff/members/${memberId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMembers(current => current.filter(member => member.id !== memberId));
      setConfirmId("");
    } catch {
      setErrorId(memberId);
    } finally {
      setPendingId("");
    }
  }

  return <>
    {members.map(member => <div key={member.id}>
      <div className="row-item">
        <span className="avatar">{(member.user.name || member.user.email).slice(0, 2).toUpperCase()}</span>
        <span className="row-main">
          <span className="row-title">{member.user.name || member.user.email}</span>
          <span className="row-meta">{member.user.email} · {member.role === "OWNER" ? t.owner : t.staff}</span>
        </span>
        <span className="settings-row-actions">
          <span className="badge badge-success">{t.active}</span>
          {member.role === "STAFF" && (confirmId === member.id
            ? <><button className="btn btn-ghost btn-sm" type="button" disabled={pendingId === member.id} onClick={() => setConfirmId("")}>{t.cancel}</button><button className="btn btn-secondary btn-sm" type="button" disabled={pendingId === member.id} onClick={() => void remove(member.id)}>{pendingId === member.id ? "…" : t.confirm}</button></>
            : <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setErrorId(""); setConfirmId(member.id); }}>{t.remove}</button>)}
        </span>
      </div>
      {errorId === member.id && <p className="field-error" role="alert" style={{ padding: "0 var(--space-5) var(--space-3)" }}>{t.error}</p>}
    </div>)}
  </>;
}
