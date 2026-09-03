"use client";

import React, { useMemo, useRef } from "react";
import { ClickUpTask } from "@/types/clickup";

interface RoadmapTimelineProps {
  epics: ClickUpTask[];
  milestones: ClickUpTask[];
  onBack: () => void;
  onAddIssue: (milestoneId: string) => void;
}

// ── Palette: one color ramp per epic slot ──────────────────────────────────
const EPIC_PALETTE = [
  { color: "#534AB7", fill: "#EEEDFE", text: "#3C3489", bar: "#AFA9EC" },
  { color: "#0F6E56", fill: "#E1F5EE", text: "#085041", bar: "#5DCAA5" },
  { color: "#854F0B", fill: "#FAEEDA", text: "#633806", bar: "#EF9F27" },
  { color: "#185FA5", fill: "#E6F1FB", text: "#0C447C", bar: "#85B7EB" },
  { color: "#993556", fill: "#FBEAF0", text: "#72243E", bar: "#ED93B1" },
];

const WEEK_W = 86;   // px per week column
const ROW_H = 100;  // px per swimlane row
const RULER_H = 44;  // px for the week ruler
const LABEL_W = 164; // px for left label column

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// ── Date helpers ────────────────────────────────────────────────────────────
function startOfWeek(d: Date): Date {
  const t = new Date(d);
  const day = t.getDay();
  t.setDate(t.getDate() - (day === 0 ? 6 : day - 1));
  t.setHours(0, 0, 0, 0);
  return t;
}
function addDays(d: Date, n: number): Date {
  const t = new Date(d);
  t.setDate(t.getDate() + n);
  return t;
}
function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
function parseMs(raw: string | number | undefined): Date | null {
  if (!raw) return null;
  const n = typeof raw === "string" ? parseInt(raw, 10) : raw;
  return isNaN(n) ? null : new Date(n);
}

// ── Main component ──────────────────────────────────────────────────────────
export default function RoadmapTimeline({
  epics,
  milestones,
  onBack,
  onAddIssue,
}: RoadmapTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const TODAY = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  // Map issue id → milestone it depends on
  const issueToMilestone = useMemo(() => {
    const map = new Map<string, string>();
    const msIds = new Set(milestones.map(m => m.id));
    for (const epic of epics) {
      for (const sub of epic.subtasks ?? []) {
        for (const dep of sub.dependencies ?? []) {
          const msId = msIds.has(dep.task_id) ? dep.task_id
            : msIds.has(dep.depends_on) ? dep.depends_on
              : null;
          if (msId) { map.set(sub.id, msId); break; }
        }
      }
    }
    return map;
  }, [epics, milestones]);

  // Issues grouped by milestone
  const issuesByMs = useMemo(() => {
    const m = new Map<string, ClickUpTask[]>();
    milestones.forEach(ms => m.set(ms.id, []));
    for (const epic of epics) {
      for (const sub of epic.subtasks ?? []) {
        const msId = issueToMilestone.get(sub.id);
        if (msId && m.has(msId)) m.get(msId)!.push(sub);
      }
    }
    return m;
  }, [epics, milestones, issueToMilestone]);

  // Build time axis
  const { rangeStart, weeks, totalDays, totalW } = useMemo(() => {
    const dates: Date[] = [];
    milestones.forEach(ms => {
      const s = parseMs(ms.start_date as any);
      const e = parseMs(ms.due_date as any);
      if (s) dates.push(s);
      if (e) dates.push(e);
    });
    if (dates.length === 0) {
      // fallback: 8 weeks from today
      dates.push(TODAY, addDays(TODAY, 56));
    }
    const minD = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxD = new Date(Math.max(...dates.map(d => d.getTime())));
    const rangeStart = startOfWeek(addDays(minD, -7));
    const rangeEnd = addDays(maxD, 21);
    const totalDays = diffDays(rangeStart, rangeEnd);

    const weeks: Date[] = [];
    let cur = new Date(rangeStart);
    while (cur < rangeEnd) { weeks.push(new Date(cur)); cur = addDays(cur, 7); }

    return { rangeStart, weeks, totalDays, totalW: weeks.length * WEEK_W };
  }, [milestones, TODAY]);

  function px(date: Date): number {
    return Math.round(diffDays(rangeStart, date) / totalDays * totalW);
  }

  function isNowWeek(w: Date): boolean {
    const ws = startOfWeek(w);
    return TODAY >= ws && TODAY < addDays(ws, 7);
  }

  // Overall stats
  const { totalIssues, doneIssues } = useMemo(() => {
    let total = 0, done = 0;
    milestones.forEach(ms => {
      const issues = issuesByMs.get(ms.id) ?? [];
      total += issues.length;
      done += issues.filter(i => i.status?.type === "closed").length;
    });
    return { totalIssues: total, doneIssues: done };
  }, [milestones, issuesByMs]);

  const overallPct = totalIssues > 0 ? Math.round(doneIssues / totalIssues * 100) : 0;
  const todayX = px(TODAY);

  if (milestones.length === 0) {
    return (
      <div className="tl-empty">
        <i className="ti ti-map-2" style={{ fontSize: 40, color: "var(--purple-lg)" }} />
        <h3>Nenhuma Milestone com Issues vinculadas</h3>
        <p>Volte para "Vincular (Cart)" e adicione Issues às Milestones.</p>
        <button className="btn-back" onClick={onBack}>← Voltar</button>
        <style >{`.tl-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:64px;text-align:center;color:var(--text-2)}.tl-empty h3{color:var(--text-1);font-size:17px;margin:0}.tl-empty p{font-size:13px;margin:0}.btn-back{padding:8px 16px;border:1px solid var(--border-3);border-radius:6px;background:none;color:var(--text-1);cursor:pointer;font-size:13px;font-weight:500}`}</style>
      </div>
    );
  }

  return (
    <div className="tl-root">

      {/* ── Top bar ── */}
      <div className="tl-topbar">
        <i className="ti ti-map-2" style={{ fontSize: 14, color: "var(--text-2)" }} aria-hidden="true" />
        <span className="tl-title">Roadmap</span>
        <div className="tl-legend">
          {epics.slice(0, 5).map((e, i) => (
            <span key={e.id} className="leg-item">
              <span className="leg-dot" style={{ background: EPIC_PALETTE[i % 5].color }} />
              {e.name.replace(/^\[.*?\]\s*/, "")}
            </span>
          ))}
        </div>
        <div className="tl-stats">
          <span className="stat-pill">{totalIssues} issues</span>
          <span className="stat-pill accent">{overallPct}% concluído</span>
        </div>
      </div>

      {/* ── Body: label col + scrollable canvas ── */}
      <div className="tl-body">

        {/* Label column */}
        <div className="tl-labels" style={{ width: LABEL_W }}>
          <div className="label-ruler-spacer" style={{ height: RULER_H }} />
          {epics.map((epic, i) => {
            const pal = EPIC_PALETTE[i % 5];
            const epicMs = milestones.filter(ms =>
              (issuesByMs.get(ms.id) ?? []).some(iss =>
                epics.find(e => e.id === epic.id)?.subtasks?.some(s => s.id === iss.id)
              )
            );
            const issueCount = epicMs.reduce((a, ms) => a + (issuesByMs.get(ms.id)?.filter(iss =>
              epic.subtasks?.some(s => s.id === iss.id)
            ).length ?? 0), 0);
            return (
              <div key={epic.id} className="label-row" style={{ height: ROW_H, borderLeft: `3px solid ${pal.color}` }}>
                <div className="label-dot" style={{ background: pal.color }} />
                <div className="label-text">
                  <div className="label-name">{epic.name.replace(/^\[.*?\]\s*/, "")}</div>
                  <div className="label-sub">{issueCount} issues</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable canvas */}
        <div className="canvas-scroll" ref={scrollRef}>
          <div className="canvas" style={{ width: totalW }}>

            {/* Ruler */}
            <div className="ruler" style={{ height: RULER_H }}>
              {weeks.map((w, i) => {
                const now = isNowWeek(w);
                const showMonth = i === 0 || w.getMonth() !== weeks[i - 1].getMonth();
                return (
                  <div
                    key={i}
                    className={`ruler-wk${now ? " now" : ""}`}
                    style={{ width: WEEK_W, left: i * WEEK_W }}
                  >
                    <span className="ruler-month">{showMonth ? MONTHS[w.getMonth()] : ""}</span>
                    <span className="ruler-day">{now ? "hoje" : `${w.getDate()}/${w.getMonth() + 1}`}</span>
                  </div>
                );
              })}
            </div>

            {/* Swimlanes */}
            {epics.map((epic, ei) => {
              const pal = EPIC_PALETTE[ei % 5];

              // Milestones that have at least one issue belonging to this epic
              const epicMilestones = milestones.filter(ms =>
                (issuesByMs.get(ms.id) ?? []).some(iss =>
                  epic.subtasks?.some(s => s.id === iss.id)
                )
              );

              return (
                <div key={epic.id} className="swimlane" style={{ height: ROW_H }}>
                  {/* BG columns */}
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className={`bg-col${isNowWeek(w) ? " now" : ""}`}
                      style={{ left: i * WEEK_W, width: WEEK_W, height: ROW_H }}
                    />
                  ))}

                  {/* Today line */}
                  <div className="today-line" style={{ left: todayX, height: ROW_H }} />

                  {/* Milestone blocks */}
                  {epicMilestones.map(ms => {
                    const startD = parseMs(ms.start_date as any) ?? addDays(parseMs(ms.due_date as any) ?? TODAY, -7);
                    const endD = parseMs(ms.due_date as any) ?? addDays(startD, 7);
                    const x = px(startD);
                    const w = Math.max(px(endD) - x, WEEK_W - 6);
                    const msIssues = (issuesByMs.get(ms.id) ?? []).filter(iss =>
                      epic.subtasks?.some(s => s.id === iss.id)
                    );
                    const done = msIssues.filter(i => i.status?.type === "closed").length;
                    const pct = msIssues.length > 0 ? Math.round(done / msIssues.length * 100) : 0;
                    const blockH = ROW_H - 20;

                    return (
                      <div
                        key={ms.id}
                        className="ms-block"
                        style={{
                          left: x, width: w, top: 10, height: blockH,
                          background: pal.fill,
                          border: `0.5px solid ${pal.color}`,
                        }}
                        title={`${ms.name} — ${msIssues.length} issues`}
                      >
                        {/* Header row */}
                        <div className="ms-block-head">
                          <i className="ti ti-circle-dot" style={{ fontSize: 11, color: pal.color, flexShrink: 0 }} aria-hidden="true" />
                          <span className="ms-block-name" style={{ color: pal.text }}>{ms.name}</span>
                          <span className="ms-block-pct" style={{ color: pal.text }}>{pct}%</span>
                          <button
                            className="ms-plus-btn"
                            style={{ color: pal.color, borderColor: pal.bar }}
                            onClick={() => onAddIssue(ms.id)}
                            title="Adicionar Issue"
                            aria-label={`Adicionar issue à ${ms.name}`}
                          >+</button>
                        </div>

                        {/* Progress bar */}
                        <div className="ms-bar-bg" style={{ background: pal.bar, opacity: 0.35 }}>
                          <div className="ms-bar-fill" style={{ width: `${pct}%`, background: pal.color }} />
                        </div>

                        {/* Issue chips */}
                        <div className="ms-chips">
                          {msIssues.slice(0, 4).map(iss => (
                            <span
                              key={iss.id}
                              className="ms-chip"
                              style={{ background: pal.fill, color: pal.text, border: `0.5px solid ${pal.bar}` }}
                              title={iss.name}
                            >
                              <span
                                className="chip-dot"
                                style={{ background: iss.status?.color ?? pal.bar }}
                              />
                              {iss.name}
                            </span>
                          ))}
                          {msIssues.length > 4 && (
                            <span className="ms-chip ms-chip-more" style={{ color: pal.text, border: `0.5px solid ${pal.bar}` }}>
                              +{msIssues.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="tl-footer">
        <div className="footer-stats">
          <div className="fstat"><span className="fstat-n">{milestones.length}</span><span className="fstat-l">milestones</span></div>
          <div className="fstat"><span className="fstat-n">{totalIssues}</span><span className="fstat-l">issues</span></div>
          <div className="fstat"><span className="fstat-n">{doneIssues}</span><span className="fstat-l">concluídas</span></div>
          <div className="fstat"><span className="fstat-n">{overallPct}%</span><span className="fstat-l">progresso</span></div>
        </div>
        <button className="btn-back-footer" onClick={onBack}>
          ← Voltar para Vincular
        </button>
      </div>

      <style jsx>{`
        .tl-root {
          border: 1px solid var(--border-2);
          border-radius: var(--r-lg);
          overflow: hidden;
          background: var(--surface-1);
          display: flex;
          flex-direction: column;
        }

        /* Topbar */
        .tl-topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-2);
          background: var(--surface-2);
          flex-wrap: wrap;
        }
        .tl-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-1);
          flex: 1;
        }
        .tl-legend {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .leg-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text-2);
        }
        .leg-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .tl-stats {
          display: flex;
          gap: 6px;
        }
        .stat-pill {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 20px;
          background: var(--surface-3);
          color: var(--text-2);
          font-weight: 500;
        }
        .stat-pill.accent {
          background: rgba(83, 74, 183, 0.12);
          color: #3C3489;
        }

        /* Body layout */
        .tl-body {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* Labels */
        .tl-labels {
          flex-shrink: 0;
          border-right: 1px solid var(--border-2);
        }
        .label-ruler-spacer {
          border-bottom: 1px solid var(--border-2);
          background: var(--surface-2);
        }
        .label-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border-bottom: 1px solid var(--border-2);
          background: var(--surface-1);
        }
        .label-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .label-text { min-width: 0; }
        .label-name {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .label-sub {
          font-size: 10px;
          color: var(--text-3);
          margin-top: 1px;
        }

        /* Canvas scroll */
        .canvas-scroll {
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
        }
        .canvas {
          position: relative;
        }

        /* Ruler */
        .ruler {
          position: relative;
          border-bottom: 1px solid var(--border-2);
          background: var(--surface-2);
        }
        .ruler-wk {
          position: absolute;
          top: 0;
          bottom: 0;
          border-right: 0.5px solid var(--border-2);
          padding: 0 6px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .ruler-wk.now {
          background: rgba(83, 74, 183, 0.08);
        }
        .ruler-month {
          font-size: 10px;
          color: var(--text-3);
          line-height: 1.2;
        }
        .ruler-day {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-2);
        }
        .ruler-wk.now .ruler-day {
          color: #534AB7;
          font-weight: 600;
        }

        /* Swimlane */
        .swimlane {
          position: relative;
          border-bottom: 1px solid var(--border-2);
        }
        .bg-col {
          position: absolute;
          top: 0;
          border-right: 0.5px solid var(--border-2);
        }
        .bg-col.now {
          background: rgba(83, 74, 183, 0.03);
        }
        .today-line {
          position: absolute;
          top: 0;
          width: 1.5px;
          background: #534AB7;
          opacity: 0.6;
          pointer-events: none;
          z-index: 4;
        }

        /* Milestone block */
        .ms-block {
          position: absolute;
          border-radius: 6px;
          padding: 5px 7px;
          z-index: 3;
          overflow: hidden;
        }
        .ms-block-head {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 3px;
        }
        .ms-block-name {
          font-size: 11px;
          font-weight: 500;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ms-block-pct {
          font-size: 10px;
          opacity: 0.75;
          flex-shrink: 0;
        }
        .ms-plus-btn {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          border: 0.5px solid;
          background: none;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .ms-block:hover .ms-plus-btn {
          opacity: 1;
        }
        .ms-bar-bg {
          height: 3px;
          border-radius: 2px;
          margin-bottom: 5px;
          overflow: hidden;
        }
        .ms-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s;
        }
        .ms-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
        }
        .ms-chip {
          font-size: 10px;
          padding: 1px 6px 1px 4px;
          border-radius: 20px;
          white-space: nowrap;
          max-width: 110px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .chip-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ms-chip-more {
          background: transparent;
          font-weight: 500;
        }

        /* Footer */
        .tl-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-top: 1px solid var(--border-2);
          background: var(--surface-2);
        }
        .footer-stats {
          display: flex;
          gap: 20px;
        }
        .fstat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .fstat-n {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-1);
          line-height: 1.2;
        }
        .fstat-l {
          font-size: 10px;
          color: var(--text-3);
        }
        .btn-back-footer {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-2);
          background: none;
          border: 1px solid var(--border-3);
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-back-footer:hover {
          background: var(--surface-3);
          color: var(--text-1);
        }
      `}</style>
    </div>
  );
}
