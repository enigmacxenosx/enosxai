/*
 * ENOSX AI — Switch
 * Accessible two-state toggle used by voice settings and the admin console.
 */

import { motion } from "framer-motion";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-9 h-5 rounded-full transition-colors duration-200"
      style={{
        background: checked ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.15)",
      }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="absolute top-0.5 w-4 h-4 rounded-full shadow-sm"
        style={{
          left: checked ? "auto" : 2,
          right: checked ? 2 : "auto",
          background: checked ? "#0a0c12" : "rgba(255, 255, 255, 0.8)",
        }}
      />
    </button>
  );
}
