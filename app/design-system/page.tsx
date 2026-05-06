"use client";

import { useEffect } from "react";

export default function DesignSystemPage() {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(".ds-page .toc a")
    );
    const secs = links
      .map((a) => {
        const href = a.getAttribute("href");
        return href ? document.querySelector<HTMLElement>(`.ds-page ${href}`) : null;
      })
      .filter((el): el is HTMLElement => !!el);

    function onScroll() {
      const y = window.scrollY + 120;
      let active = secs[0];
      for (const s of secs) {
        if (s.offsetTop <= y) active = s;
      }
      if (!active) return;
      for (const l of links) {
        l.classList.toggle("active", l.getAttribute("href") === `#${active.id}`);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onClick = (event: MouseEvent) => {
      const target = event.currentTarget as HTMLAnchorElement;
      const id = target.getAttribute("href");
      if (!id) return;
      const el = document.querySelector<HTMLElement>(`.ds-page ${id}`);
      if (el) {
        event.preventDefault();
        window.scrollTo({ top: el.offsetTop - 40, behavior: "smooth" });
        history.replaceState(null, "", id);
      }
    };

    for (const a of links) {
      a.addEventListener("click", onClick as EventListener);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      for (const a of links) {
        a.removeEventListener("click", onClick as EventListener);
      }
    };
  }, []);

  return (
    <div className="ds-page">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{DS_CSS}</style>

      <div className="layout">
        <aside className="side">
          <div className="mast">
            <div className="mark">P&amp;P</div>
            <div>
              <div className="name">Prod &amp; Pri</div>
              <div className="sub">Design System v0.1</div>
            </div>
          </div>
          <nav className="toc" id="toc">
            <div className="group-label">Foundations</div>
            <a href="#philosophy" className="active">
              Philosophy <span className="n">01</span>
            </a>
            <a href="#color">
              Color <span className="n">02</span>
            </a>
            <a href="#type">
              Typography <span className="n">03</span>
            </a>
            <a href="#space">
              Spacing &amp; Radius <span className="n">04</span>
            </a>

            <div className="group-label">Components</div>
            <a href="#buttons">
              Buttons <span className="n">05</span>
            </a>
            <a href="#inputs">
              Inputs &amp; Controls <span className="n">06</span>
            </a>
            <a href="#chips">
              Chips &amp; Pills <span className="n">07</span>
            </a>
            <a href="#task">
              Task row <span className="n">08</span>
            </a>
            <a href="#tree">
              Sidebar tree <span className="n">09</span>
            </a>
            <a href="#sug">
              Suggestion diff <span className="n">10</span>
            </a>
            <a href="#icons">
              Icons <span className="n">11</span>
            </a>

            <div className="group-label">Usage</div>
            <a href="#patterns">
              Patterns <span className="n">12</span>
            </a>
            <a href="#do">
              Do / Don&apos;t <span className="n">13</span>
            </a>
          </nav>
        </aside>

        <main className="main">
          <header className="pagehead">
            <p className="eyebrow">
              <span className="dot" /> Design system · Prod &amp; Pri
            </p>
            <h1 className="pagetitle">
              A quiet system<br />for noisy thinking.
            </h1>
            <p className="pagelead">
              Prod &amp; Pri is a decision-support workspace — inbox, today, tasks. The system&apos;s
              job is to stay out of the way while you make the messy decisions.{" "}
              <em>Editorial type, typographic rhythm, quiet chrome, visible state.</em>
            </p>
            <div className="meta-line">
              <div>
                <b>Version</b> · 0.1
              </div>
              <div>
                <b>Updated</b> · Apr 20, 2026
              </div>
              <div>
                <b>Surfaces</b> · Today, All Tasks, Inbox
              </div>
              <div>
                <b>Status</b> · Early, expect change
              </div>
            </div>
          </header>

          {/* 01 Philosophy */}
          <section className="sec" id="philosophy">
            <div className="sec-head">
              <div className="no">01 &nbsp; Philosophy</div>
              <div>
                <h2>Three principles</h2>
                <p>
                  Before tokens or components, there are a few rules the system follows. When in
                  doubt on a design choice, come back here.
                </p>
              </div>
            </div>

            <div className="principles">
              <div className="principle">
                <div className="n">01</div>
                <h3>Editorial, not dashboarded.</h3>
                <p>
                  Lists read like a column of text: hierarchical type, generous measure, horizontal
                  rules. Never wall-to-wall cards or borders. The page should feel like something
                  you&apos;d open on purpose.
                </p>
              </div>
              <div className="principle">
                <div className="n">02</div>
                <h3>Chrome on hover, content always.</h3>
                <p>
                  Buttons, drag handles, and secondary actions are hidden until the row is engaged.
                  The resting state is just the information. Interactivity reveals itself.
                </p>
              </div>
              <div className="principle">
                <div className="n">03</div>
                <h3>State is visible, tone is quiet.</h3>
                <p>
                  Accepted, waiting, done — the system must show what it thinks is going on, but
                  using weight, tint, and a single accent instead of color-coded clutter.
                </p>
              </div>
            </div>
          </section>

          {/* 02 Color */}
          <section className="sec" id="color">
            <div className="sec-head">
              <div className="no">02 &nbsp; Color</div>
              <div>
                <h2>Warm paper, teal accent</h2>
                <p>
                  A cream/ink base with a single teal accent does almost all the work. Semantic
                  colors only appear where the meaning is essential — accepted, waiting, removed.
                </p>
              </div>
            </div>

            <div className="subhead">Surface &amp; ink</div>
            <div className="swatch-grid">
              {[
                { name: "Canvas", v: "--bg", hex: "#f5efe4" },
                { name: "Canvas alt", v: "--bg-2", hex: "#efe7d8" },
                { name: "Paper", v: "--paper", hex: "#fcf8f0" },
                { name: "Paper alt", v: "--paper-2", hex: "#f7f1e3" },
                { name: "Ink", v: "--ink", hex: "#17201f" },
                { name: "Ink 2", v: "--ink-2", hex: "#2d3734" },
                { name: "Muted", v: "--muted", hex: "#6c6a60" },
                { name: "Muted 2", v: "--muted-2", hex: "#8a8678" }
              ].map((s) => (
                <div className="sw" key={s.v}>
                  <div className="sw-chip" style={{ background: `var(${s.v})` }} />
                  <div className="sw-name">{s.name}</div>
                  <div className="sw-var">{s.v}</div>
                  <div className="sw-hex">{s.hex}</div>
                </div>
              ))}
            </div>

            <div className="subhead">Accent (default: teal) — and the three approved swaps</div>
            <div className="accents">
              {[
                { name: "Teal · default", hex: "#0f766e", meta: "#0f766e · L 44 · C 0.08" },
                { name: "Plum", hex: "#6b3b7a", meta: "#6b3b7a · L 42 · C 0.09" },
                { name: "Rust", hex: "#a44a22", meta: "#a44a22 · L 50 · C 0.13" },
                { name: "Ink", hex: "#1f2a33", meta: "#1f2a33 · L 22 · C 0.02" }
              ].map((a) => (
                <div className="accent-card" key={a.name}>
                  <div className="dotlg" style={{ background: a.hex }} />
                  <div>
                    <h4>{a.name}</h4>
                    <p>{a.meta}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="subhead">Semantic — used sparingly</div>
            <div className="swatch-grid">
              {[
                {
                  name: "Accent",
                  v: "--accent",
                  hex: "Primary action, active state"
                },
                { name: "Done / accepted", v: "--done", hex: "#1f7a46" },
                { name: "Waiting", v: "--warn", hex: "#8a5a15" },
                { name: "Danger / dismiss", v: "--danger", hex: "#9c3b28" }
              ].map((s) => (
                <div className="sw" key={s.v}>
                  <div className="sw-chip" style={{ background: `var(${s.v})` }} />
                  <div className="sw-name">{s.name}</div>
                  <div className="sw-var">{s.v}</div>
                  <div className="sw-hex">{s.hex}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 03 Typography */}
          <section className="sec" id="type">
            <div className="sec-head">
              <div className="no">03 &nbsp; Typography</div>
              <div>
                <h2>Fraunces, Inter, JetBrains Mono</h2>
                <p>
                  Serif for headings and filed-preview titles — it gives pages a centered,
                  editorial weight. Inter for all UI. Mono only for numerals, timestamps, labels,
                  and the diff marker.
                </p>
              </div>
            </div>

            <div className="specimens">
              <div className="specimen serif">
                <div className="eye t-eyebrow">Heading · Fraunces 500</div>
                <div className="big">Aa Bg Mq</div>
                <div className="role">Page titles, filed-preview, principle names</div>
                <div className="glyphs serif">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                  <br />
                  abcdefghijklmnopqrstuvwxyz
                  <br />
                  0123456789 — &quot;&apos;&amp; · →
                </div>
              </div>
              <div className="specimen sans">
                <div className="eye t-eyebrow">UI · Inter 400–700</div>
                <div className="big">Aa Bg Mq</div>
                <div className="role">All interface text — body, buttons, menus</div>
                <div className="glyphs sans">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                  <br />
                  abcdefghijklmnopqrstuvwxyz
                  <br />
                  0123456789 — &amp; · → ⌘ ↵
                </div>
              </div>
              <div className="specimen mono">
                <div className="eye t-eyebrow">Mono · JetBrains Mono 400–500</div>
                <div className="big">01 23</div>
                <div className="role">Eyebrows, counts, timestamps, Next → marker</div>
                <div className="glyphs mono">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                  <br />
                  abcdefghijklmnopqrstuvwxyz
                  <br />
                  0123456789 → · →
                </div>
              </div>
            </div>

            <div className="subhead">Scale</div>
            <div className="type-grid">
              <div className="type-meta">
                <b>Display</b>56 / 1.02 · −3%
                <br />
                Fraunces 500
              </div>
              <div className="type-sample t-display">Capture first.</div>

              <div className="type-meta">
                <b>H1</b>44 / 1.05 · −2.5%
                <br />
                Fraunces 500
              </div>
              <div className="type-sample t-h1">System of record</div>

              <div className="type-meta">
                <b>H2</b>30 / 1.10 · −2%
                <br />
                Fraunces 600
              </div>
              <div className="type-sample t-h2">Place this task</div>

              <div className="type-meta">
                <b>H3</b>22 / 1.20 · −1%
                <br />
                Fraunces 600
              </div>
              <div className="type-sample t-h3">Editorial, not dashboarded.</div>

              <div className="type-meta">
                <b>Body Lg</b>17 / 1.55
                <br />
                Inter 400
              </div>
              <div className="type-sample t-body-lg">
                Inbox is a temporary holding state for rough work. Suggestions should help without
                taking control.
              </div>

              <div className="type-meta">
                <b>Body</b>14 / 1.50
                <br />
                Inter 400/500
              </div>
              <div className="type-sample t-body">
                A task row tells you what to do, reads in one glance, and hides its actions until
                you ask. The checkbox is the hero on the left; the title is the hero in the middle.
              </div>

              <div className="type-meta">
                <b>Small</b>12.5 / 1.50
                <br />
                Inter 400, muted
              </div>
              <div className="type-sample t-small">
                Meta text, help copy, secondary captions under primary rows.
              </div>

              <div className="type-meta">
                <b>Eyebrow</b>11 / 1.45 · +14%
                <br />
                Mono 400, uppercase
              </div>
              <div className="type-sample t-eyebrow">Current state · Captured 3 min ago</div>

              <div className="type-meta">
                <b>Numerals</b>24 / 1<br />
                Mono 500, tabular
              </div>
              <div className="type-sample t-mono-number">14 · 07 · 21</div>
            </div>
          </section>

          {/* 04 Spacing */}
          <section className="sec" id="space">
            <div className="sec-head">
              <div className="no">04 &nbsp; Spacing &amp; Radius</div>
              <div>
                <h2>A 4-point scale, a short list of radii</h2>
                <p>
                  All space is a multiple of 4 with one half-step (2). Row padding lives at the
                  high end of the scale; chips and icons at the low end.
                </p>
              </div>
            </div>

            <div className="two">
              <div>
                <div className="subhead">Spacing scale</div>
                <div>
                  {[
                    ["--s-2", 2],
                    ["--s-4", 4],
                    ["--s-6", 6],
                    ["--s-8", 8],
                    ["--s-12", 12],
                    ["--s-16", 16],
                    ["--s-20", 20],
                    ["--s-24", 24],
                    ["--s-32", 32],
                    ["--s-48", 48],
                    ["--s-64", 64]
                  ].map(([tok, v]) => (
                    <div className="scale-row" key={tok as string}>
                      <div className="tok">{tok}</div>
                      <div className="val">{`${v}px`}</div>
                      <div className="bar" style={{ width: `${v}px` }} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="subhead">Radii</div>
                <div className="radius-row">
                  {[
                    { r: 3, label: "3 · chip" },
                    { r: 5, label: "5 · seg" },
                    { r: 7, label: "7 · btn/input" },
                    { r: 10, label: "10 · card" },
                    { r: "50%", label: "50% · dot" }
                  ].map((x) => (
                    <div className="r" key={String(x.r)}>
                      <div
                        className="box"
                        style={{
                          borderRadius: typeof x.r === "number" ? `${x.r}px` : x.r
                        }}
                      />
                      <div className="lbl">{x.label}</div>
                    </div>
                  ))}
                </div>

                <div className="subhead">Row heights &amp; density</div>
                <table className="ratios">
                  <thead>
                    <tr>
                      <th>Context</th>
                      <th>Comfy</th>
                      <th>Compact</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Task row padding (y)</td>
                      <td className="val">18px</td>
                      <td className="val">12px</td>
                    </tr>
                    <tr>
                      <td>Suggestion row padding (y)</td>
                      <td className="val">14px</td>
                      <td className="val">10px</td>
                    </tr>
                    <tr>
                      <td>Sidebar row padding (y)</td>
                      <td className="val">6–8px</td>
                      <td className="val">4–6px</td>
                    </tr>
                    <tr>
                      <td>Between groups</td>
                      <td className="val">28–32px</td>
                      <td className="val">20px</td>
                    </tr>
                  </tbody>
                </table>

                <div className="subhead">Rules &amp; borders</div>
                <table className="ratios">
                  <tbody>
                    <tr>
                      <td className="tok">--line</td>
                      <td className="val">rgba(29,36,38,0.10)</td>
                      <td>default row divider</td>
                    </tr>
                    <tr>
                      <td className="tok">--line-soft</td>
                      <td className="val">rgba(29,36,38,0.06)</td>
                      <td>hover background</td>
                    </tr>
                    <tr>
                      <td className="tok">--rule</td>
                      <td className="val">#1d2426</td>
                      <td>strong rule, focus borders</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 05 Buttons */}
          <section className="sec" id="buttons">
            <div className="sec-head">
              <div className="no">05 &nbsp; Buttons</div>
              <div>
                <h2>Four flavors, three sizes</h2>
                <p>
                  Use <b>accent</b> for the primary verb on a surface (Capture, File task).{" "}
                  <b>Primary</b> (ink) is for global actions in chrome. <b>Default</b> is the
                  resting style. <b>Ghost</b> is anything that can fade away on hover.
                </p>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>Variants</h3>
                <span className="code">
                  .btn · .btn.accent · .btn.primary · .btn.ghost · .btn.danger
                </span>
              </div>
              <div className="comp-row">
                <div className="lbl">Default</div>
                <button className="btn">Mark done</button>
                <button className="btn">Edit next</button>
                <button className="btn" disabled>
                  Disabled
                </button>
              </div>
              <div className="comp-row">
                <div className="lbl">Accent</div>
                <button className="btn accent">File task →</button>
                <button className="btn accent">Capture</button>
              </div>
              <div className="comp-row">
                <div className="lbl">Primary</div>
                <button className="btn primary">Capture</button>
              </div>
              <div className="comp-row">
                <div className="lbl">Ghost</div>
                <button className="btn ghost">Dismiss</button>
                <button className="btn ghost">Send to Today</button>
              </div>
              <div className="comp-row">
                <div className="lbl">Danger</div>
                <button className="btn danger">Delete</button>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>Sizes</h3>
                <span className="code">.btn · .btn.sm · .btn.xs</span>
              </div>
              <div className="comp-row">
                <div className="lbl">Default 32h</div>
                <button className="btn accent">File task →</button>
                <button className="btn">Mark done</button>
              </div>
              <div className="comp-row">
                <div className="lbl">Small 28h</div>
                <button className="btn sm accent">Accept all</button>
                <button className="btn sm">Waiting</button>
                <button className="btn sm ghost">Ignore</button>
              </div>
              <div className="comp-row">
                <div className="lbl">Extra 22h</div>
                <button className="btn xs accent">Accept</button>
                <button className="btn xs">Ignore</button>
                <button className="btn xs ghost">Undo</button>
              </div>
            </div>
          </section>

          {/* 06 Inputs */}
          <section className="sec" id="inputs">
            <div className="sec-head">
              <div className="no">06 &nbsp; Inputs &amp; Controls</div>
              <div>
                <h2>Quiet fields, boxed focus</h2>
                <p>
                  Inputs wear a 1px line and a 7px radius; focus adds a soft 3px halo. Segmented
                  controls replace most dropdowns for small option sets.
                </p>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>Text &amp; select</h3>
                <span className="code">.input · select.input</span>
              </div>
              <div className="comp-row">
                <div className="lbl">Text</div>
                <input className="input" placeholder="Search titles and notes…" />
              </div>
              <div className="comp-row">
                <div className="lbl">Ghost text</div>
                <input className="input ghost" placeholder="Add a list…" />
              </div>
              <div className="comp-row">
                <div className="lbl">Select</div>
                <select className="input" defaultValue="Choose an area…">
                  <option>Choose an area…</option>
                  <option>HeadsUp</option>
                  <option>Personal</option>
                </select>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>Segmented &amp; toggles</h3>
                <span className="code">.seg</span>
              </div>
              <div className="comp-row">
                <div className="lbl">Status</div>
                <div className="seg">
                  <button className="active">All</button>
                  <button>Open</button>
                  <button>Waiting</button>
                  <button>Done</button>
                </div>
              </div>
              <div className="comp-row">
                <div className="lbl">Lens</div>
                <div className="seg">
                  <button className="active">Today</button>
                  <button>This week</button>
                  <button>Stalled</button>
                </div>
              </div>
              <div className="comp-row">
                <div className="lbl">Checkbox</div>
                <div className="check" />
                <div className="check done" />
              </div>
            </div>
          </section>

          {/* 07 Chips */}
          <section className="sec" id="chips">
            <div className="sec-head">
              <div className="no">07 &nbsp; Chips &amp; Pills</div>
              <div>
                <h2>Metadata, not decoration</h2>
                <p>
                  Chips are for <em>real</em> attributes — tags, path, status. Avoid decorative
                  pills. Keep the same height so rows don&apos;t jump.
                </p>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>Chips</h3>
                <span className="code">
                  .chip · .chip.tag · .chip.path · .chip.accent · .chip.warn · .chip.done ·
                  .chip.danger
                </span>
              </div>
              <div className="comp-row">
                <div className="lbl">Neutral</div>
                <span className="chip">Open</span>
                <span className="chip">14</span>
                <span className="chip">1 waiting</span>
              </div>
              <div className="comp-row">
                <div className="lbl">Tag</div>
                <span className="chip tag">LowPri</span>
                <span className="chip tag">Staff</span>
                <span className="chip tag">Q2</span>
              </div>
              <div className="comp-row">
                <div className="lbl">Path</div>
                <span className="chip path">
                  <span className="area">Lazy Tiger</span>
                  <span className="sep">/</span>Next Ups
                </span>
              </div>
              <div className="comp-row">
                <div className="lbl">Semantic</div>
                <span className="chip accent">In plan</span>
                <span className="chip done">Done</span>
                <span className="chip warn">Waiting</span>
                <span className="chip danger">Dismissed</span>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>State pills</h3>
                <span className="code">.pill-mono.accepted · .ignored · .pending</span>
              </div>
              <div className="comp-row">
                <div className="lbl">Mono</div>
                <span className="pill-mono accepted">Accepted</span>
                <span className="pill-mono ignored">Ignored</span>
                <span className="pill-mono pending">3 to review</span>
              </div>
            </div>
          </section>

          {/* 08 Task row */}
          <section className="sec" id="task">
            <div className="sec-head">
              <div className="no">08 &nbsp; Task row</div>
              <div>
                <h2>One row, one decision</h2>
                <p>
                  Checkbox, title, optional next action, meta line. Actions live on the right and
                  appear on hover. Don&apos;t add new columns; add a new meta chip.
                </p>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>Anatomy</h3>
                <span className="code">.row</span>
              </div>
              <div>
                <div className="row">
                  <div className="check" />
                  <div>
                    <div className="title">Create new signs for hostel</div>
                    <div className="next">
                      <span className="marker">Next →</span>
                      <span>
                        Audit what&apos;s currently posted and draft a short message list
                      </span>
                    </div>
                    <div className="meta">
                      <span className="chip path">
                        <span className="area">Lazy Tiger</span>
                        <span className="sep">/</span>Next Ups
                      </span>
                      <span className="chip">Open</span>
                      <span className="chip tag">Staff</span>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button className="btn sm">Edit next</button>
                    <button className="btn sm ghost">Mark done</button>
                  </div>
                </div>
                <div className="row">
                  <div className="check done" />
                  <div>
                    <div className="title done">Automate posting to guest chat</div>
                    <div className="meta">
                      <span className="chip path">
                        <span className="area">Lazy Tiger</span>
                        <span className="sep">/</span>Next Ups
                      </span>
                      <span className="chip done">Done</span>
                    </div>
                  </div>
                  <div />
                </div>
                <div className="row">
                  <div className="check" />
                  <div>
                    <div className="title">Update manual with lists of common guest questions</div>
                    <div className="next">
                      <span className="marker">Next →</span>
                      <span className="next-empty">No next action yet</span>
                    </div>
                    <div className="meta">
                      <span className="chip path">
                        <span className="area">Lazy Tiger</span>
                        <span className="sep">/</span>Next Ups
                      </span>
                      <span className="chip warn">Waiting</span>
                    </div>
                  </div>
                  <div />
                </div>
              </div>
            </div>
          </section>

          {/* 09 Sidebar tree */}
          <section className="sec" id="tree">
            <div className="sec-head">
              <div className="no">09 &nbsp; Sidebar tree</div>
              <div>
                <h2>A real hierarchy</h2>
                <p>
                  Areas are bold; lists are indented and regular weight. One active row, one caret
                  per area. Counts are right-aligned in mono.
                </p>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>Tree</h3>
                <span className="code">.tree</span>
              </div>
              <div className="tree">
                <div className="tree-row area">
                  <span className="caret">▾</span>
                  <span>Lazy Tiger</span>
                  <span className="n">24</span>
                </div>
                <div className="tree-row list active">
                  <span />
                  <span>Next Ups</span>
                  <span className="n">8</span>
                </div>
                <div className="tree-row list">
                  <span />
                  <span>To Buy</span>
                  <span className="n">3</span>
                </div>
                <div className="tree-row list">
                  <span />
                  <span>Content / Social Media</span>
                  <span className="n">5</span>
                </div>
                <div className="tree-row list">
                  <span />
                  <span>Staff To-Dos</span>
                  <span className="n">4</span>
                </div>

                <div className="tree-row area tree-area-gap">
                  <span className="caret">▾</span>
                  <span>Patchwork</span>
                  <span className="n">11</span>
                </div>
                <div className="tree-row list">
                  <span />
                  <span>Next Ups</span>
                  <span className="n">4</span>
                </div>
                <div className="tree-row list">
                  <span />
                  <span>Engineering</span>
                  <span className="n">7</span>
                </div>

                <div className="tree-row area tree-area-gap">
                  <span className="caret">▸</span>
                  <span>HeadsUp</span>
                  <span className="n">9</span>
                </div>
              </div>
            </div>
          </section>

          {/* 10 Suggestion row */}
          <section className="sec" id="sug">
            <div className="sec-head">
              <div className="no">10 &nbsp; Suggestion diff</div>
              <div>
                <h2>Before → after, in one line</h2>
                <p>
                  AI suggestions inside Inbox read as diffs, not cards. Accept/Ignore appear on
                  hover. Accepted rows tint faintly; ignored rows fade and strike through.
                </p>
              </div>
            </div>

            <div className="comp">
              <div className="comp-title">
                <h3>States</h3>
                <span className="code">.sug · .sug.accepted · .sug.ignored</span>
              </div>
              <div>
                <div className="sug">
                  <span className="ic">+</span>
                  <div>
                    <div className="lbl">Clarify title</div>
                    <div className="diff">
                      <span className="from">
                        make full schedule for montreal hostel conference
                      </span>
                      <span className="arr">→</span>
                      <span className="to">
                        Create full schedule for Montreal hostel conference (sessions, speakers,
                        locations)
                      </span>
                    </div>
                  </div>
                  <div className="sug-actions">
                    <button className="btn xs accent-soft-btn">Accept</button>
                    <button className="btn xs ghost">Ignore</button>
                  </div>
                </div>
                <div className="sug accepted">
                  <span className="ic ic-done">✓</span>
                  <div>
                    <div className="lbl">Assign to area</div>
                    <div className="diff">
                      <span className="from">Inbox</span>
                      <span className="arr">→</span>
                      <span className="to">HeadsUp</span>
                    </div>
                  </div>
                  <div className="sug-actions">
                    <span className="pill-mono accepted">Accepted</span>
                    <button className="btn xs ghost">Undo</button>
                  </div>
                </div>
                <div className="sug ignored">
                  <span className="ic ic-muted">–</span>
                  <div>
                    <div className="lbl">Tag as low priority</div>
                    <div className="diff">
                      <span className="to struck">LowPri — Exclude from Today</span>
                    </div>
                  </div>
                  <div className="sug-actions">
                    <span className="pill-mono ignored">Ignored</span>
                    <button className="btn xs">Restore</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 11 Icons */}
          <section className="sec" id="icons">
            <div className="sec-head">
              <div className="no">11 &nbsp; Icons</div>
              <div>
                <h2>1.6px stroke, 20px grid</h2>
                <p>
                  A small, consistent set. Prefer type or a chip before reaching for an icon. Line
                  weight stays the same across sizes.
                </p>
              </div>
            </div>

            <div className="icons">
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="6" />
                  <path d="m17 17-3.5-3.5" />
                </svg>
                search
              </div>
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="14" height="13" rx="2" />
                  <path d="M3 8h14" />
                </svg>
                inbox
              </div>
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h12M4 10h12M4 14h8" />
                </svg>
                list
              </div>
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="14" height="14" rx="2" />
                  <path d="m7 11 2.5 2.5L14 8.5" />
                </svg>
                check
              </div>
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3v14M3 10h14" />
                </svg>
                add
              </div>
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 6h10M7 6V4h6v2M8 10v5M12 10v5M6 6l1 11h6l1-11" />
                </svg>
                delete
              </div>
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10h14M11 5l6 5-6 5" />
                </svg>
                file
              </div>
              <div className="ico">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="10" r="7" />
                  <path d="M10 6v4l2.5 2" />
                </svg>
                waiting
              </div>
            </div>
          </section>

          {/* 12 Patterns */}
          <section className="sec" id="patterns">
            <div className="sec-head">
              <div className="no">12 &nbsp; Patterns</div>
              <div>
                <h2>Page archetypes</h2>
                <p>
                  Three page shells cover the whole product. Each is a recipe of tokens +
                  components above.
                </p>
              </div>
            </div>

            <div className="two">
              <div>
                <div className="subhead">Editorial header</div>
                <div className="screen-frame">
                  <p className="eyebrow">
                    <span className="dot" />
                    Monday, April 20
                  </p>
                  <div className="pattern-h1">What to do today</div>
                  <div className="pattern-lead">
                    A plan pulled from everything open across your areas.
                  </div>
                  <div className="pattern-stats">
                    <span>
                      <b>14</b> · open
                    </span>
                    <span>
                      <b>3</b> · waiting
                    </span>
                    <span>
                      <b>7</b> · in plan
                    </span>
                  </div>
                </div>
                <p className="t-small pattern-caption">
                  Used on Today, All Tasks, Inbox, Design System. Eyebrow → H1 → one lead →
                  optional numerals baseline.
                </p>
              </div>
              <div>
                <div className="subhead">Two-pane triage</div>
                <div className="screen-frame triage">
                  <div className="triage-left">
                    <div className="triage-heading">Inbox</div>
                    <div className="t-eyebrow triage-eye">3 waiting</div>
                    <div className="tree-row list active triage-tree">
                      <span />
                      <span>make schedule…</span>
                      <span className="n">7</span>
                    </div>
                    <div className="tree-row list triage-tree">
                      <span />
                      <span>dryer belt…</span>
                      <span className="n">3</span>
                    </div>
                  </div>
                  <div>
                    <div className="t-eyebrow triage-eye-s">Captured · 3 min ago</div>
                    <div className="triage-title">make schedule for Montreal conference</div>
                    <div className="triage-ai">
                      <span className="triage-ai-label">AI</span> · 7 proposed · review inline
                    </div>
                  </div>
                </div>
                <p className="t-small pattern-caption">
                  Used on Inbox. List on the left, focused detail on the right, sticky action bar
                  at the bottom.
                </p>
              </div>
            </div>
          </section>

          {/* 13 Do/Don't */}
          <section className="sec" id="do">
            <div className="sec-head">
              <div className="no">13 &nbsp; Do / Don&apos;t</div>
              <div>
                <h2>Tripwires</h2>
                <p>Most mistakes so far have been the same ones — so here they are, plain.</p>
              </div>
            </div>

            <div className="dodont">
              <div className="dd do">
                <span className="tag">Do</span>
                <h3>Let the title be the hero.</h3>
                <div className="row row-flush">
                  <div className="check" />
                  <div>
                    <div className="title">Create new signs for hostel</div>
                    <div className="next">
                      <span className="marker">Next →</span>
                      <span>Audit what&apos;s posted</span>
                    </div>
                  </div>
                  <div />
                </div>
                <p className="why">
                  Checkbox, bold title, quiet one-line Next. Chrome lives in meta chips. Readable
                  in one pass.
                </p>
              </div>

              <div className="dd dont">
                <span className="tag">Don&apos;t</span>
                <h3>Stack buttons beside every label.</h3>
                <div className="dont-example">
                  <div className="t-eyebrow">Clarify title</div>
                  <div className="dont-title">Create full schedule for Montreal…</div>
                  <div className="dont-actions">
                    <button className="btn accent sm">Accept</button>
                    <button className="btn sm">Ignore</button>
                  </div>
                </div>
                <p className="why">
                  Every suggestion wrapped in its own card with dedicated buttons turns a page into
                  a parking lot. Use the diff row instead — one line, hover actions.
                </p>
              </div>

              <div className="dd do">
                <span className="tag">Do</span>
                <h3>Separate hierarchy with weight + indent.</h3>
                <div className="tree tree-flush">
                  <div className="tree-row area">
                    <span className="caret">▾</span>
                    <span>Lazy Tiger</span>
                    <span className="n">24</span>
                  </div>
                  <div className="tree-row list active">
                    <span />
                    <span>Next Ups</span>
                    <span className="n">8</span>
                  </div>
                  <div className="tree-row list">
                    <span />
                    <span>To Buy</span>
                    <span className="n">3</span>
                  </div>
                </div>
                <p className="why">
                  Areas bold, lists regular + indented, one visible active state. One caret per
                  area.
                </p>
              </div>

              <div className="dd dont">
                <span className="tag">Don&apos;t</span>
                <h3>Make every label look like a button.</h3>
                <div className="dont-buttons">
                  <button className="fake-nav active">
                    Lazy Tiger
                    <span className="fake-trash">🗑</span>
                  </button>
                  <button className="fake-nav">
                    Next Ups
                    <span className="fake-trash">🗑</span>
                  </button>
                  <button className="fake-nav">
                    To Buy
                    <span className="fake-trash">🗑</span>
                  </button>
                </div>
                <p className="why">
                  When every row has a chip&apos;d border and a visible delete, the eye can&apos;t
                  find the one thing it&apos;s supposed to click.
                </p>
              </div>
            </div>
          </section>

          <footer className="footer">
            <div>Prod &amp; Pri · Design System · v0.1</div>
            <div>Maintained alongside Today / All Tasks / Inbox</div>
          </footer>
        </main>
      </div>
    </div>
  );
}

const DS_CSS = `
.ds-page {
  --bg: #f5efe4;
  --bg-2: #efe7d8;
  --paper: #fcf8f0;
  --paper-2: #f7f1e3;
  --ink: #17201f;
  --ink-2: #2d3734;
  --muted: #6c6a60;
  --muted-2: #8a8678;
  --rule: #1d2426;
  --line: rgba(29, 36, 38, 0.10);
  --line-soft: rgba(29, 36, 38, 0.06);

  --accent: #0f766e;
  --accent-ink: #0b5a54;
  --accent-soft: rgba(15, 118, 110, 0.10);
  --accent-softer: rgba(15, 118, 110, 0.05);

  --warn: #8a5a15;
  --warn-soft: rgba(183, 121, 31, 0.14);
  --done: #1f7a46;
  --done-soft: rgba(31, 122, 70, 0.12);
  --danger: #9c3b28;
  --danger-soft: rgba(156, 59, 40, 0.08);

  --font-sans: "Inter", system-ui, sans-serif;
  --font-serif: "Fraunces", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, Menlo, monospace;

  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  width: 100%;
}
.ds-page, .ds-page * { box-sizing: border-box; }
.ds-page button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
.ds-page :where(input, select, textarea) { font: inherit; color: inherit; }

.ds-page .layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.ds-page .side {
  position: sticky; top: 0;
  height: 100vh;
  padding: 36px 20px 40px 32px;
  border-right: 1px solid var(--line);
  overflow-y: auto;
}
.ds-page .mast {
  display: flex; gap: 10px; align-items: center;
  margin-bottom: 28px;
}
.ds-page .mast .mark {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--ink); color: var(--paper);
  display: grid; place-items: center;
  font-weight: 700; font-size: 12px;
}
.ds-page .mast .name {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.ds-page .mast .sub {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 2px;
}
.ds-page .toc {
  display: flex; flex-direction: column; gap: 1px;
}
.ds-page .toc .group-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-2);
  padding: 14px 10px 6px;
}
.ds-page .toc a {
  font-size: 13px;
  color: var(--muted);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 5px;
  display: flex; justify-content: space-between;
  font-variant-numeric: tabular-nums;
}
.ds-page .toc a:hover { color: var(--ink); background: var(--line-soft); }
.ds-page .toc a.active { color: var(--ink); background: var(--accent-softer); font-weight: 500; }
.ds-page .toc a .n { font-family: var(--font-mono); font-size: 10px; color: var(--muted-2); padding-top: 3px; }

.ds-page .main {
  padding: 56px 64px 160px;
  max-width: 1180px;
  min-width: 0;
}

.ds-page .pagehead {
  padding-bottom: 40px;
  margin-bottom: 56px;
  border-bottom: 1px solid var(--line);
}
.ds-page .eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 14px;
  display: inline-flex; align-items: center; gap: 8px;
}
.ds-page .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px var(--accent-softer); }

.ds-page .pagetitle {
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: 56px;
  letter-spacing: -0.03em;
  line-height: 1.02;
  margin: 0 0 20px;
}
.ds-page .pagelead {
  max-width: 64ch;
  font-size: 17px;
  color: var(--ink-2);
  line-height: 1.55;
  margin: 0 0 28px;
}
.ds-page .pagelead em { font-family: var(--font-serif); font-style: italic; color: var(--ink); }

.ds-page .meta-line {
  display: flex; gap: 28px; flex-wrap: wrap;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ds-page .meta-line b { color: var(--ink-2); font-weight: 600; }

.ds-page .sec {
  padding-top: 72px;
  margin-top: -16px;
}
.ds-page .sec:first-of-type { padding-top: 0; }
.ds-page .sec-head {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 28px;
  align-items: baseline;
  padding-bottom: 20px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--line);
}
.ds-page .sec-head .no {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.ds-page .sec-head h2 {
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin: 0 0 10px;
}
.ds-page .sec-head p {
  max-width: 58ch;
  color: var(--muted);
  margin: 0;
  font-size: 14px;
}

.ds-page .subhead {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 28px 0 14px;
  display: flex; align-items: center; gap: 10px;
}
.ds-page .subhead::before { content:""; width: 12px; height: 1px; background: var(--rule); display: inline-block; }

.ds-page .principles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.ds-page .principle {
  padding: 28px 28px 32px;
  border-right: 1px solid var(--line);
}
.ds-page .principle:last-child { border-right: 0; }
.ds-page .principle .n {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--accent);
  font-weight: 700;
  margin-bottom: 14px;
}
.ds-page .principle h3 {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 10px;
  line-height: 1.15;
}
.ds-page .principle p {
  margin: 0;
  color: var(--muted);
  font-size: 13.5px;
  line-height: 1.5;
}

.ds-page .swatch-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}
.ds-page .sw {
  background: var(--paper);
  padding: 16px 16px 18px;
  min-height: 148px;
  display: flex; flex-direction: column; justify-content: space-between;
  position: relative;
}
.ds-page .sw .sw-chip {
  width: 100%; height: 64px; border-radius: 4px;
  border: 1px solid var(--line-soft);
  margin-bottom: 14px;
}
.ds-page .sw .sw-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 2px;
}
.ds-page .sw .sw-var {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
}
.ds-page .sw .sw-hex {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--muted-2);
  margin-top: 4px;
}

.ds-page .accents {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
}
.ds-page .accent-card {
  padding: 16px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
  display: flex; gap: 12px; align-items: flex-start;
}
.ds-page .accent-card .dotlg { width: 38px; height: 38px; border-radius: 50%; flex: 0 0 auto; }
.ds-page .accent-card h4 { margin: 0 0 2px; font-size: 14px; font-weight: 600; }
.ds-page .accent-card p { margin: 0; font-size: 11px; color: var(--muted); font-family: var(--font-mono); letter-spacing: 0.04em; }

.ds-page .type-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  row-gap: 28px;
  column-gap: 32px;
  align-items: baseline;
}
.ds-page .type-meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  padding-top: 10px;
}
.ds-page .type-meta b { display: block; color: var(--ink-2); font-weight: 600; margin-bottom: 4px; letter-spacing: 0.05em; }
.ds-page .type-sample { color: var(--ink); }

.ds-page .t-display { font-family: var(--font-serif); font-size: 68px; font-weight: 500; letter-spacing: -0.03em; line-height: 1; }
.ds-page .t-h1 { font-family: var(--font-serif); font-size: 44px; font-weight: 500; letter-spacing: -0.025em; line-height: 1.05; }
.ds-page .t-h2 { font-family: var(--font-serif); font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
.ds-page .t-h3 { font-family: var(--font-serif); font-size: 22px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; }
.ds-page .t-body-lg { font-size: 17px; line-height: 1.55; color: var(--ink-2); max-width: 58ch; }
.ds-page .t-body { font-size: 14px; line-height: 1.5; color: var(--ink); max-width: 62ch; }
.ds-page .t-small { font-size: 12.5px; color: var(--muted); }
.ds-page .t-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.ds-page .t-mono-number { font-family: var(--font-mono); font-size: 24px; font-variant-numeric: tabular-nums; color: var(--ink); }

.ds-page .specimens {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
  margin-bottom: 20px;
}
.ds-page .specimen {
  padding: 22px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.ds-page .specimen .eye { margin-bottom: 12px; }
.ds-page .specimen .big {
  font-size: 56px;
  line-height: 1;
  margin-bottom: 14px;
  color: var(--ink);
  letter-spacing: -0.02em;
}
.ds-page .specimen .glyphs {
  font-size: 13px;
  color: var(--muted-2);
  letter-spacing: 0.05em;
  border-top: 1px solid var(--line);
  padding-top: 12px;
  line-height: 1.6;
}
.ds-page .specimen.serif .big { font-family: var(--font-serif); font-weight: 500; }
.ds-page .specimen.sans .big { font-family: var(--font-sans); font-weight: 600; }
.ds-page .specimen.mono .big { font-family: var(--font-mono); font-weight: 500; font-size: 44px; }
.ds-page .specimen .glyphs.serif { font-family: var(--font-serif); }
.ds-page .specimen .glyphs.sans { font-family: var(--font-sans); }
.ds-page .specimen .glyphs.mono { font-family: var(--font-mono); font-size: 12px; }
.ds-page .specimen .role {
  font-size: 13px; color: var(--ink-2);
  margin-bottom: 2px;
}

.ds-page .scale-row {
  display: grid;
  grid-template-columns: 60px 110px 1fr;
  gap: 24px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 13px;
}
.ds-page .scale-row:last-child { border-bottom: 0; }
.ds-page .scale-row .tok { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.ds-page .scale-row .val { font-family: var(--font-mono); font-size: 12px; color: var(--ink-2); }
.ds-page .scale-row .bar { height: 12px; background: var(--accent); border-radius: 2px; }

.ds-page .radius-row {
  display: flex; gap: 24px; align-items: flex-end;
}
.ds-page .radius-row .r {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.ds-page .radius-row .r .box { width: 72px; height: 72px; background: var(--ink); }
.ds-page .radius-row .r .lbl { font-family: var(--font-mono); font-size: 11px; color: var(--muted); letter-spacing: 0.04em; }

.ds-page .comp {
  padding: 28px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 10px;
  margin-bottom: 16px;
}
.ds-page .comp-title {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 20px;
}
.ds-page .comp-title h3 {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
}
.ds-page .comp-title .code {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.ds-page .comp-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.ds-page .comp-row:last-child { margin-bottom: 0; }
.ds-page .comp-row .lbl {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  min-width: 96px;
}

.ds-page .btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--paper);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.ds-page .btn:hover { border-color: var(--rule); }
.ds-page .btn.primary { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.ds-page .btn.primary:hover { background: #000; }
.ds-page .btn.accent { background: var(--accent); color: var(--paper); border-color: var(--accent); }
.ds-page .btn.accent:hover { background: var(--accent-ink); }
.ds-page .btn.ghost { border-color: transparent; background: transparent; color: var(--muted); }
.ds-page .btn.ghost:hover { color: var(--ink); background: var(--line-soft); }
.ds-page .btn.danger { color: var(--danger); border-color: var(--line); }
.ds-page .btn.danger:hover { background: var(--danger-soft); border-color: var(--danger); }
.ds-page .btn.sm { padding: 6px 10px; font-size: 12px; }
.ds-page .btn.xs { padding: 3px 8px; font-size: 11px; line-height: 1; }
.ds-page .btn.accent-soft-btn { background: var(--accent-softer); color: var(--accent-ink); border-color: var(--accent-soft); }
.ds-page .btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ds-page .input, .ds-page select.input, .ds-page textarea.input {
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--paper);
  font-size: 13px;
  outline: 0;
  width: 240px;
}
.ds-page .input:focus, .ds-page select.input:focus { border-color: var(--rule); box-shadow: 0 0 0 3px var(--line-soft); }
.ds-page .input.ghost { background: transparent; }

.ds-page .seg {
  display: inline-flex;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 3px;
}
.ds-page .seg button {
  padding: 5px 12px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
  border-radius: 4px;
}
.ds-page .seg button.active { background: var(--paper); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,0.04); }

.ds-page .chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--line-soft);
  color: var(--ink-2);
  font-weight: 500;
}
.ds-page .chip.tag { background: transparent; border: 1px solid var(--line); color: var(--muted); }
.ds-page .chip.accent { background: var(--accent-soft); color: var(--accent-ink); }
.ds-page .chip.warn { background: var(--warn-soft); color: var(--warn); }
.ds-page .chip.done { background: var(--done-soft); color: var(--done); }
.ds-page .chip.danger { background: var(--danger-soft); color: var(--danger); }
.ds-page .chip.path { background: transparent; padding: 0; color: var(--muted); font-family: var(--font-mono); font-size: 11px; }
.ds-page .chip.path .area { color: var(--ink-2); font-weight: 600; }
.ds-page .chip.path .sep { opacity: .5; margin: 0 4px; }

.ds-page .pill-mono {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 700;
}
.ds-page .pill-mono.accepted { background: var(--done-soft); color: var(--done); }
.ds-page .pill-mono.ignored { background: var(--line-soft); color: var(--muted); }
.ds-page .pill-mono.pending { background: var(--accent-softer); color: var(--accent-ink); }

.ds-page .row {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 14px;
  padding: 16px 4px;
  border-bottom: 1px solid var(--line);
  align-items: start;
  position: relative;
}
.ds-page .row:hover { background: rgba(29,36,38,0.014); }
.ds-page .row:last-child { border-bottom: 0; }
.ds-page .check {
  width: 18px; height: 18px;
  border: 1.5px solid var(--muted-2);
  border-radius: 4px;
  margin-top: 2px;
  cursor: pointer;
}
.ds-page .check.done { background: var(--ink); border-color: var(--ink); position: relative; }
.ds-page .check.done::after { content: ""; position: absolute; left: 4px; top: 0px; width: 5px; height: 10px; border-right: 2px solid var(--paper); border-bottom: 2px solid var(--paper); transform: rotate(45deg); }
.ds-page .row .title { font-size: 14.5px; font-weight: 500; color: var(--ink); }
.ds-page .row .title.done { color: var(--muted); text-decoration: line-through; text-decoration-color: rgba(0,0,0,0.25); }
.ds-page .row .next {
  margin-top: 3px;
  display: flex; gap: 10px; align-items: flex-start;
  font-size: 13px; color: var(--ink-2);
}
.ds-page .row .next .marker {
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--accent); font-weight: 600; min-width: 36px; padding-top: 2px;
}
.ds-page .row .next-empty { color: var(--muted-2); font-style: italic; }
.ds-page .row .meta {
  margin-top: 8px;
  display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
  font-size: 11px; color: var(--muted);
}
.ds-page .row-actions { display: flex; gap: 6px; opacity: 0.35; }
.ds-page .row:hover .row-actions { opacity: 1; }
.ds-page .row-flush { padding: 10px 0; border-bottom: 0; }

.ds-page .tree {
  padding: 14px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
  max-width: 360px;
}
.ds-page .tree-flush { max-width: none; }
.ds-page .tree-row {
  display: grid; grid-template-columns: 16px 1fr auto; gap: 6px;
  align-items: center;
  padding: 6px 4px;
  border-radius: 5px;
  font-size: 13.5px;
  cursor: pointer;
}
.ds-page .tree-row:hover { background: var(--line-soft); }
.ds-page .tree-row.area { font-weight: 600; }
.ds-page .tree-row.list { padding-left: 22px; color: var(--ink-2); font-weight: 400; }
.ds-page .tree-row.list.active { background: var(--accent-softer); color: var(--accent-ink); font-weight: 500; }
.ds-page .tree-row .caret { color: var(--muted-2); font-size: 10px; }
.ds-page .tree-row .n { font-family: var(--font-mono); font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.ds-page .tree-row.tree-area-gap { margin-top: 8px; }

.ds-page .sug {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  gap: 12px;
  align-items: start;
  padding: 14px 2px;
  border-bottom: 1px solid var(--line);
}
.ds-page .sug:last-child { border-bottom: 0; }
.ds-page .sug .ic { color: var(--accent); font-family: var(--font-mono); font-size: 14px; font-weight: 700; margin-top: 2px; }
.ds-page .sug .ic-done { color: var(--done); }
.ds-page .sug .ic-muted { color: var(--muted-2); }
.ds-page .sug .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
.ds-page .sug .diff { font-size: 13.5px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.ds-page .sug .diff .from { color: var(--muted); text-decoration: line-through; text-decoration-color: rgba(0,0,0,0.3); }
.ds-page .sug .diff .arr { font-family: var(--font-mono); font-size: 11px; color: var(--muted-2); }
.ds-page .sug .diff .to { font-weight: 500; }
.ds-page .sug .diff .struck { text-decoration: line-through; text-decoration-color: rgba(0,0,0,0.3); }
.ds-page .sug-actions { display: flex; gap: 6px; align-items: center; }
.ds-page .sug.accepted { background: linear-gradient(90deg, rgba(31,122,70,0.04), transparent 65%); }
.ds-page .sug.ignored { opacity: 0.55; }

.ds-page .icons {
  display: grid; grid-template-columns: repeat(8, 1fr); gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}
.ds-page .ico {
  background: var(--paper);
  padding: 18px 8px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.03em;
  color: var(--muted);
}
.ds-page .ico svg { color: var(--ink-2); }

.ds-page .dodont {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
.ds-page .dd {
  padding: 20px 20px 24px;
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: 8px;
}
.ds-page .dd h3 {
  font-family: var(--font-serif);
  font-weight: 600;
  margin: 0 0 8px;
}
.ds-page .dd .tag {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 3px;
  margin-bottom: 14px;
  display: inline-block;
}
.ds-page .dd.do .tag { background: var(--done-soft); color: var(--done); }
.ds-page .dd.dont .tag { background: var(--danger-soft); color: var(--danger); }
.ds-page .dd .why { margin-top: 14px; font-size: 12.5px; color: var(--muted); line-height: 1.5; }

.ds-page .dont-example { padding: 10px 12px; background: var(--bg-2); border-radius: 6px; margin-bottom: 8px; }
.ds-page .dont-title { font-weight: 600; font-size: 14px; margin: 4px 0 8px; }
.ds-page .dont-actions { display: flex; gap: 6px; }
.ds-page .dont-buttons { display: flex; flex-direction: column; gap: 6px; padding: 4px 0; }
.ds-page .fake-nav {
  display: inline-flex; align-items: center; justify-content: space-between;
  width: 240px;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--paper);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.ds-page .fake-nav.active { background: var(--accent); color: var(--paper); border-color: var(--accent); }
.ds-page .fake-trash {
  background: var(--danger-soft);
  color: var(--danger);
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 4px;
  font-weight: 500;
}

.ds-page .screen-frame {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
  overflow: hidden;
}
.ds-page .two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  align-items: start;
}
.ds-page .pattern-h1 { font-family: var(--font-serif); font-size: 32px; letter-spacing: -0.02em; line-height: 1.05; font-weight: 500; }
.ds-page .pattern-lead { color: var(--muted); font-size: 13px; margin-top: 6px; }
.ds-page .pattern-stats {
  display: flex; gap: 28px; margin-top: 20px;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.04em; color: var(--muted);
}
.ds-page .pattern-stats b { color: var(--ink); font-variant-numeric: tabular-nums; }
.ds-page .pattern-caption { margin-top: 12px; }

.ds-page .screen-frame.triage { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; padding: 12px; }
.ds-page .triage-left { border-right: 1px solid var(--line); padding-right: 10px; }
.ds-page .triage-heading { font-family: var(--font-serif); font-size: 18px; font-weight: 600; }
.ds-page .triage-eye { margin-top: 6px; margin-bottom: 10px; }
.ds-page .triage-eye-s { margin-bottom: 4px; }
.ds-page .triage-tree { padding-left: 4px; margin-bottom: 4px; }
.ds-page .triage-title { font-family: var(--font-serif); font-size: 18px; font-weight: 600; line-height: 1.15; }
.ds-page .triage-ai {
  margin-top: 10px;
  padding: 10px;
  background: var(--accent-softer);
  border-left: 2px solid var(--accent);
  font-size: 12px;
  color: var(--ink-2);
}
.ds-page .triage-ai-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}

.ds-page table.ratios { width: 100%; border-collapse: collapse; }
.ds-page table.ratios th, .ds-page table.ratios td {
  padding: 10px 0;
  text-align: left;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.ds-page table.ratios th {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); font-weight: 600;
}
.ds-page table.ratios td.tok { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
.ds-page table.ratios td.val { font-family: var(--font-mono); font-size: 12px; color: var(--ink-2); }

.ds-page .footer {
  margin-top: 100px;
  padding-top: 28px;
  border-top: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: baseline;
  color: var(--muted); font-size: 12px;
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
}
`;
