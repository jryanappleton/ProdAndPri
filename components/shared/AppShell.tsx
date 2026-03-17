"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { useAppActions, useAppUiState } from "@/components/shared/AppStateProvider";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/tasks", label: "All Tasks" },
  { href: "/inbox", label: "Inbox" },
  { href: "/settings", label: "Settings" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { createTask } = useAppActions();
  const { isSaving } = useAppUiState();
  const [captureValue, setCaptureValue] = useState("");

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark">P&P</span>
          <div>
            <p className="eyebrow">Decision-support workspace</p>
            <h1>Prod & Pri</h1>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form
          className="quick-capture"
          onSubmit={async (event) => {
            event.preventDefault();
            await createTask(captureValue);
            setCaptureValue("");
          }}
        >
          <label className="sr-only" htmlFor="global-capture">
            Quick capture
          </label>
          <input
            id="global-capture"
            placeholder="Quick capture a task..."
            value={captureValue}
            onChange={(event) => setCaptureValue(event.target.value)}
            disabled={isSaving}
          />
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Capture"}
          </button>
        </form>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  );
}
