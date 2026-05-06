"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
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
  const captureRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        captureRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (pathname?.startsWith("/design-system")) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="topbar">
        <Link href="/today" className="brand">
          <span className="brand-mark">P&amp;P</span>
          <span>Prod &amp; Pri</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {navItems.map((item) => {
            const isActive =
              item.href === "/today"
                ? pathname === "/today" || pathname === "/"
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "active" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form
          className="topbar-right"
          onSubmit={async (event) => {
            event.preventDefault();
            await createTask(captureValue);
            setCaptureValue("");
          }}
        >
          <label className="sr-only" htmlFor="global-capture">
            Quick capture
          </label>
          <div className="capture">
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              style={{ color: "var(--muted)" }}
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m17 17-3.5-3.5" />
            </svg>
            <input
              ref={captureRef}
              id="global-capture"
              placeholder="Quick capture a task…"
              value={captureValue}
              onChange={(event) => setCaptureValue(event.target.value)}
              disabled={isSaving}
            />
            <kbd>⌘K</kbd>
          </div>
          <button type="submit" className="btn primary" disabled={isSaving || !captureValue.trim()}>
            {isSaving ? "Saving…" : "Capture"}
          </button>
        </form>
      </header>
      <div className="page-shell">{children}</div>
    </>
  );
}
