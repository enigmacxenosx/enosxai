import React from "react";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
  return <div className="neon-dashboard-stage relative h-dvh w-screen overflow-hidden bg-[#0a0a0a]">
    <div className="relative z-10 h-full w-full">{children}</div>
  </div>;
}
