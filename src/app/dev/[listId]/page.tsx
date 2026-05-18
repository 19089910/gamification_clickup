"use client";

import React, { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import DevHeader from "@/components/dev/DevHeader";
import IssueRow from "@/components/dev/IssueRow";
import ProgressOverview from "@/components/dev/ProgressOverview";
import LoadingScreen from "@/components/ui/LoadingScreen";
import CreateMilestoneModal from "@/components/dev/CreateMilestoneModal";
import CreateIssueModal from "@/components/dev/CreateIssueModal";
import { ClickUpList, ClickUpTask } from "@/types/clickup";

interface DevPanelData {
  list: ClickUpList;
  tasks: ClickUpTask[]; // top-level tasks only (Epics + Milestones)
}

/** Milestone = ClickUp task with custom_item_id: 1 OR fallback: task named like "sprint*" / "milestone*" */
function isMilestone(task: ClickUpTask): boolean {
  if (task.custom_item_id === 1) return true;
  // Fallback heuristic: task name starts with sprint/milestone/ms (case-insensitive)
  return /^(sprint|milestone|ms|phase)\s/i.test(task.name);
}

/** Epic = regular top-level task that is NOT a milestone */
function isEpic(task: ClickUpTask): boolean {
  return !isMilestone(task);
}

/** Get all Issues (subtasks) that depend on a given Milestone */
function getIssuesForMilestone(
  epics: ClickUpTask[],
  milestoneId: string
): ClickUpTask[] {
  const issues: ClickUpTask[] = [];
  for (const epic of epics) {
    const subtasks = epic.subtasks ?? [];
    for (const sub of subtasks) {
      const deps = sub.dependencies ?? [];
      if (deps.some((d) => d.task_id === milestoneId || d.depends_on === milestoneId)) {
        issues.push(sub);
      }
    }
  }
  return issues;
}

/** Get all Issues (subtasks across all Epics) that are NOT linked to any Milestone */
function getBacklogIssues(
  epics: ClickUpTask[],
  milestoneIds: Set<string>
): ClickUpTask[] {
  const all: ClickUpTask[] = [];
  for (const epic of epics) {
    const subtasks = epic.subtasks ?? [];
    for (const sub of subtasks) {
      const deps = sub.dependencies ?? [];
      const linked = deps.some(
        (d) => milestoneIds.has(d.task_id) || milestoneIds.has(d.depends_on)
      );
      if (!linked) all.push(sub);
    }
  }
  return all;
}

type View = "milestones" | "backlog";

export default function MilestoneManagerPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  const [view, setView] = useState<View>("milestones");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState<{ open: boolean; milestoneId?: string }>({ open: false });

  const { data, isLoading, isError } = useQuery<DevPanelData>({
    queryKey: ["dev-panel", listId],
    queryFn: async () => {
      const res = await fetch(`/api/clickup/dev-panel/${listId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { epics, milestones, milestoneIds, backlog } = useMemo(() => {
    if (!data?.tasks) {
      return { epics: [], milestones: [], milestoneIds: new Set<string>(), backlog: [] };
    }

    const epics = data.tasks.filter(isEpic);
    const milestones = data.tasks.filter(isMilestone);
    const milestoneIds = new Set(milestones.map((m) => m.id));
    const backlog = getBacklogIssues(epics, milestoneIds);

    return { epics, milestones, milestoneIds, backlog };
  }, [data]);

  const totalIssues = epics.reduce(
    (acc, e) => acc + (e.subtasks?.length ?? 0),
    0
  );
  const closedIssues = epics.reduce(
    (acc, e) =>
      acc + (e.subtasks?.filter((s) => s.status.type === "closed").length ?? 0),
    0
  );
  const progress = totalIssues > 0 ? (closedIssues / totalIssues) * 100 : 0;

  if (isLoading) return <LoadingScreen />;
  if (isError)
    return (
      <div className="error-page">
        <DevHeader list={null} />
        <p>Failed to load project data.</p>
      </div>
    );

  return (
    <div className="manager-page">
      <DevHeader list={data?.list ?? null} />

      {showCreateModal && (
        <CreateMilestoneModal
          listId={listId}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showIssueModal.open && (
        <CreateIssueModal
          listId={listId}
          epics={epics}
          milestoneId={showIssueModal.milestoneId}
          onClose={() => setShowIssueModal({ open: false })}
        />
      )}

      <div className="page-body">
        {/* ── Project header ── */}
        <div className="project-header">
          <div className="project-meta">
            <span className="project-label">Project</span>
            <h1 className="project-name">{data?.list.name}</h1>
            <div className="project-stats">
              <span>{epics.length} Epics</span>
              <span className="dot">·</span>
              <span>{milestones.length} Milestones</span>
              <span className="dot">·</span>
              <span>{totalIssues} Issues</span>
            </div>
          </div>
          <div className="project-progress">
            <div className="prog-label-row">
              <span>Overall Progress</span>
              <span className="prog-pct">{Math.round(progress)}%</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* ── Nav tabs ── */}
        <nav className="view-tabs">
          <div className="tabs-left">
            <button
              className={`vtab ${view === "milestones" ? "active" : ""}`}
              onClick={() => setView("milestones")}
            >
              Milestones
              <span className="vtab-badge">{milestones.length}</span>
            </button>
            <button
              className={`vtab ${view === "backlog" ? "active" : ""}`}
              onClick={() => setView("backlog")}
            >
              Backlog
              <span className="vtab-badge">{backlog.length}</span>
            </button>
          </div>
          <button
            className="new-ms-btn"
            onClick={() => setShowCreateModal(true)}
          >
            ⊗ New Milestone
          </button>
        </nav>

        {/* ── Main content + sidebar ── */}
        <div className="main-layout">
          <section className="main-content">
            {view === "milestones" && (
              <div className="milestone-list">
                {milestones.length === 0 ? (
                  <div className="empty-state">
                    <h3>No Milestones found</h3>
                    <p>
                      Create a Milestone here, or enable the Milestone flag (⊗) in ClickUp.
                    </p>
                    <button
                      className="empty-create-btn"
                      onClick={() => setShowCreateModal(true)}
                    >
                      ⊗ Create first Milestone
                    </button>
                  </div>
                ) : (
                  milestones.map((ms) => {
                    const issues = getIssuesForMilestone(epics, ms.id);
                    return (
                      <MilestoneSection
                        key={ms.id}
                        milestone={ms}
                        issues={issues}
                        listId={listId}
                        onAddIssue={() => setShowIssueModal({ open: true, milestoneId: ms.id })}
                      />
                    );
                  })
                )}

                {/* Epics overview at the bottom */}
                <div className="epics-section">
                  <h3 className="section-title">Epics ({epics.length})</h3>
                  <div className="epics-grid">
                    {epics.map((epic) => (
                      <EpicCard key={epic.id} epic={epic} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {view === "backlog" && (
              <div className="backlog-section">
                <div className="backlog-header">
                  <p className="backlog-hint">
                    Issues not yet assigned to any Milestone.
                  </p>
                  <button className="new-issue-btn" onClick={() => setShowIssueModal({ open: true })}>
                    + New Issue
                  </button>
                </div>
                {backlog.length === 0 ? (
                  <div className="empty-state">
                    <h3>All issues assigned</h3>
                    <p>Every issue belongs to a Milestone. 🎉</p>
                  </div>
                ) : (
                  <div className="issue-list-box">
                    {backlog.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="right-sidebar">
            <ProgressOverview
              openCount={totalIssues - closedIssues}
              closedCount={closedIssues}
              totalCount={totalIssues}
              progress={progress}
            />
          </aside>
        </div>
      </div>

      <style jsx>{`
        .manager-page {
          background: #f4f4f6;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .error-page {
          background: #f4f4f6;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 80px;
          color: #888;
        }
        .page-body {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        /* Project header */
        .project-header {
          background: #fff;
          border: 1px solid #dcdcde;
          border-radius: 8px 8px 0 0;
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 32px;
        }
        .project-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #888;
          display: block;
          margin-bottom: 4px;
        }
        .project-name {
          font-size: 24px;
          font-weight: 700;
          color: #1f1e24;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }
        .project-stats {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #666;
        }
        .dot { color: #ccc; }
        .project-progress { width: 240px; flex-shrink: 0; }
        .prog-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .prog-pct { color: #1f75cb; font-weight: 700; }
        .prog-track { height: 8px; background: #eaeaea; border-radius: 4px; overflow: hidden; }
        .prog-fill { height: 100%; background: linear-gradient(90deg, #1f75cb, #5b9bd5); transition: width 0.4s; }
        /* Tabs */
        .view-tabs {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
          border-left: 1px solid #dcdcde;
          border-right: 1px solid #dcdcde;
          border-bottom: 1px solid #dcdcde;
          padding: 0 16px 0 20px;
        }
        .tabs-left { display: flex; align-items: center; }
        .vtab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 11px 4px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          margin-right: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.15s, border-color 0.15s;
        }
        .vtab:hover { color: #1f1e24; }
        .vtab.active { color: #1f75cb; border-bottom-color: #1f75cb; font-weight: 600; }
        .vtab-badge {
          background: #eaeaea;
          color: #555;
          font-size: 11px;
          font-weight: 600;
          padding: 0 6px;
          border-radius: 8px;
        }
        /* Layout */
        .main-layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          margin-top: 20px;
        }
        .main-content { flex: 1; min-width: 0; }
        .right-sidebar { width: 260px; flex-shrink: 0; }
        /* Content areas */
        .milestone-list { display: flex; flex-direction: column; gap: 16px; }
        .epics-section { margin-top: 8px; }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1f1e24;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #eaeaea;
        }
        .epics-grid { display: flex; flex-direction: column; gap: 8px; }
        .backlog-section { display: flex; flex-direction: column; gap: 16px; }
        .backlog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .backlog-hint { font-size: 14px; color: #666; margin: 0; }
        .new-issue-btn {
          background: #fff;
          border: 1px solid #dcdcde;
          color: #6e49cb;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .new-issue-btn:hover {
          border-color: #6e49cb;
          background: #f8f7ff;
        }
        .issue-list-box {
          background: #fff;
          border: 1px solid #dcdcde;
          border-radius: 6px;
          overflow: hidden;
        }
        .empty-state {
          background: #fff;
          border: 1px solid #dcdcde;
          border-radius: 6px;
          padding: 52px 32px;
          text-align: center;
          color: #888;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .empty-state h3 { color: #1f1e24; margin-bottom: 0; }
        .empty-state p { font-size: 13px; margin: 0; }
        .empty-create-btn {
          margin-top: 12px;
          background: #6e49cb;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 9px 18px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .empty-create-btn:hover {
          background: #5a3aab;
          box-shadow: 0 2px 8px rgba(110, 73, 203, 0.3);
        }
        .new-ms-btn {
          background: #6e49cb;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .new-ms-btn:hover {
          background: #5a3aab;
          box-shadow: 0 2px 8px rgba(110, 73, 203, 0.25);
        }
      `}</style>
    </div>
  );
}

/* ── Milestone Section ──────────────────────────────────────────────── */

function MilestoneSection({
  milestone,
  issues,
  listId,
  onAddIssue,
}: {
  milestone: ClickUpTask;
  issues: ClickUpTask[];
  listId: string;
  onAddIssue: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const closed = issues.filter((i) => i.status.type === "closed").length;
  const progress = issues.length > 0 ? (closed / issues.length) * 100 : 0;

  return (
    <div className="ms-section">
      <header className="ms-header" onClick={() => setExpanded(!expanded)}>
        <div className="ms-left">
          <span className="ms-chevron">{expanded ? "▼" : "▶"}</span>
          <span className="ms-icon">⊗</span>
          <span className="ms-name">{milestone.name}</span>
          {milestone.due_date && (
            <span className="ms-due">
              Due {new Date(parseInt(milestone.due_date)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        <div className="ms-right">
          <button 
            className="ms-add-btn" 
            onClick={(e) => { e.stopPropagation(); onAddIssue(); }}
            title="Add issue to this milestone"
          >
            +
          </button>
          <span className="ms-count">{closed}/{issues.length} issues</span>
          <div className="ms-track">
            <div className="ms-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ms-pct">{Math.round(progress)}%</span>
        </div>
      </header>

      {expanded && (
        <div className="ms-body">
          {issues.length === 0 ? (
            <p className="ms-empty">
              No Issues linked to this Milestone yet. Link Issues via
              ClickUp&apos;s dependency feature (waiting on this milestone).
            </p>
          ) : (
            <div className="ms-issues">
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .ms-section {
          background: #fff;
          border: 1px solid #dcdcde;
          border-radius: 6px;
          overflow: hidden;
        }
        .ms-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          cursor: pointer;
          background: #fafafa;
          border-bottom: 1px solid transparent;
          transition: background 0.15s;
          gap: 16px;
        }
        .ms-header:hover { background: #f4f4f6; }
        .ms-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .ms-chevron { font-size: 9px; color: #aaa; }
        .ms-icon { font-size: 15px; color: #6e49cb; }
        .ms-name { font-size: 15px; font-weight: 600; color: #1f1e24; }
        .ms-due {
          font-size: 11px;
          color: #888;
          background: #f0f0f2;
          padding: 1px 7px;
          border-radius: 10px;
        }
        .ms-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .ms-count { font-size: 12px; color: #888; white-space: nowrap; }
        .ms-add-btn {
          background: #fff;
          border: 1px solid #dcdcde;
          color: #6e49cb;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 0;
          transition: all 0.15s;
        }
        .ms-add-btn:hover {
          border-color: #6e49cb;
          background: #f8f7ff;
          transform: scale(1.05);
        }
        .ms-track {
          width: 80px;
          height: 6px;
          background: #e5e5e5;
          border-radius: 3px;
          overflow: hidden;
        }
        .ms-fill { height: 100%; background: #6e49cb; transition: width 0.3s; }
        .ms-pct { font-size: 12px; font-weight: 600; color: #6e49cb; min-width: 30px; text-align: right; }
        .ms-body { border-top: 1px solid #eaeaea; }
        .ms-empty {
          padding: 20px 24px;
          font-size: 13px;
          color: #999;
          font-style: italic;
          margin: 0;
        }
        .ms-issues { display: flex; flex-direction: column; }
      `}</style>
    </div>
  );
}

/* ── Epic Card ──────────────────────────────────────────────────────── */

function EpicCard({ epic }: { epic: ClickUpTask }) {
  const subtasks = epic.subtasks ?? [];
  const closed = subtasks.filter((s) => s.status.type === "closed").length;
  const progress = subtasks.length > 0 ? (closed / subtasks.length) * 100 : 0;

  return (
    <div className="epic-card">
      <div className="epic-left">
        <span
          className="epic-status-dot"
          style={{ background: epic.status.color }}
        />
        <div className="epic-info">
          <span className="epic-name">{epic.name}</span>
          <span className="epic-meta">{subtasks.length} issues · {epic.status.status}</span>
        </div>
      </div>
      <div className="epic-right">
        <div className="e-track">
          <div className="e-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="e-pct">{Math.round(progress)}%</span>
      </div>

      <style jsx>{`
        .epic-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
          border: 1px solid #dcdcde;
          border-radius: 6px;
          padding: 12px 16px;
          gap: 16px;
          transition: background 0.15s;
        }
        .epic-card:hover { background: #f9f9fb; }
        .epic-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .epic-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .epic-info { display: flex; flex-direction: column; gap: 2px; }
        .epic-name { font-size: 14px; font-weight: 600; color: #1f1e24; }
        .epic-meta { font-size: 11px; color: #888; text-transform: capitalize; }
        .epic-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .e-track { width: 60px; height: 5px; background: #eaeaea; border-radius: 3px; overflow: hidden; }
        .e-fill { height: 100%; background: #1f75cb; transition: width 0.3s; }
        .e-pct { font-size: 11px; font-weight: 600; color: #666; min-width: 28px; text-align: right; }
      `}</style>
    </div>
  );
}
