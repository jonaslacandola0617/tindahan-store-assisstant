"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/icon";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  locale?: "EN" | "FIL";
};

export function PasswordInput({ className = "input", locale = "EN", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const action = visible
    ? locale === "FIL" ? "Itago ang password" : "Hide password"
    : locale === "FIL" ? "Ipakita ang password" : "Show password";

  return (
    <div className="password-input-wrap">
      <input {...props} className={className} type={visible ? "text" : "password"} />
      <button
        className="password-visibility-toggle"
        type="button"
        aria-label={action}
        aria-pressed={visible}
        title={action}
        onClick={() => setVisible(current => !current)}
      >
        <Icon name={visible ? "eyeOff" : "eye"} />
      </button>
    </div>
  );
}
