"use client";

import React, { use, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import DevHeader from "@/components/dev/DevHeader";
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

/** Helper to find which Milestone an Issue is linked to */
function getLinkedMilestone(
  issue: ClickUpTask,
  milestones: ClickUpTask[]
): ClickUpTask | null {
  const deps = issue.dependencies ?? [];
  const milestoneIds = new Set(milestones.map((m) => m.id));
  const foundDep = deps.find(
    (d) => milestoneIds.has(d.task_id) || milestoneIds.has(d.depends_on)
  );
  if (!foundDep) return null;
  const msId = milestoneIds.has(foundDep.task_id) ? foundDep.task_id : foundDep.depends_on;
  return milestones.find((m) => m.id === msId) || null;
}

type View = "linker" | "timeline";

export default function MilestoneManagerPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("linker");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState<{ open: boolean; milestoneId?: string }>({ open: false });

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  // Fetch Panel Data
  const { data, isLoading, isError } = useQuery<DevPanelData>({
    queryKey: ["dev-panel", listId],
    queryFn: async () => {
      const res = await fetch(`/api/clickup/dev-panel/${listId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { epics, milestones } = useMemo(() => {
    if (!data?.tasks) {
      return { epics: [], milestones: [] };
    }
    const epics = data.tasks.filter(isEpic);
    const milestones = data.tasks.filter(isMilestone);
    return { epics, milestones };
  }, [data]);

  // Mutations
  const addDependencyMutation = useMutation({
    mutationFn: async ({ taskId, dependsOnId }: { taskId: string; dependsOnId: string }) => {
      const res = await fetch(`/api/clickup/tasks/${taskId}/dependency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depends_on: dependsOnId,
          dependency_type: "waiting_on",
        }),
      });
      if (!res.ok) throw new Error("Failed to add dependency");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dev-panel", listId] });
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async ({ taskId, dependsOnId }: { taskId: string; dependsOnId: string }) => {
      const res = await fetch(
        `/api/clickup/tasks/${taskId}/dependency?depends_on=${dependsOnId}&dependency_type=waiting_on`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Failed to remove dependency");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dev-panel", listId] });
    },
  });

  const activeMilestoneId = selectedMilestoneId || (milestones[0]?.id ?? null);
  const isMutating = addDependencyMutation.isPending || removeDependencyMutation.isPending;

  // Filtered Epics & Issues on the left
  const epicsWithFilteredIssues = useMemo(() => {
    return epics.map((epic) => {
      const issues = epic.subtasks ?? [];
      const filtered = searchQuery
        ? issues.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : issues;
      return { ...epic, filteredIssues: filtered };
    }).filter((epic) => {
      if (searchQuery) return epic.filteredIssues.length > 0;
      return true;
    });
  }, [epics, searchQuery]);

  // Stats
  const totalIssues = epics.reduce((acc, e) => acc + (e.subtasks?.length ?? 0), 0);
  const closedIssues = epics.reduce(
    (acc, e) => acc + (e.subtasks?.filter((s) => s.status.type === "closed").length ?? 0),
    0
  );
  const progress = totalIssues > 0 ? (closedIssues / totalIssues) * 100 : 0;

  // Calculate total linked issues in the carts
  const totalLinked = useMemo(() => {
    return milestones.reduce((acc, ms) => acc + getIssuesForMilestone(epics, ms.id).length, 0);
  }, [milestones, epics]);

  const toggleEpic = (epicId: string) => {
    setExpandedEpics((prev) => ({
      ...prev,
      [epicId]: prev[epicId] === false ? true : false,
    }));
  };

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
              className={`vtab ${view === "linker" ? "active" : ""}`}
              onClick={() => setView("linker")}
            >
              <i className="ti ti-shopping-cart" style={{ fontSize: "14px" }}></i>
              Vincular (Cart)
            </button>
            <button
              className={`vtab ${view === "timeline" ? "active" : ""}`}
              onClick={() => setView("timeline")}
            >
              <i className="ti ti-map-2" style={{ fontSize: "14px" }}></i>
              Roadmap (Timeline)
            </button>
          </div>
          {view === "linker" && (
            <button
              className="new-ms-btn"
              onClick={() => setShowCreateModal(true)}
            >
              ⊗ New Milestone
            </button>
          )}
        </nav>

        {/* ── View Content ── */}
        {view === "linker" ? (
          <div className="root-linker">
            
            {/* LEFT Pane: Issues por Epic */}
            <div className="left-col">
              <div className="left-header">
                <i className="ti ti-layout-list" style={{ fontSize: "15px", color: "var(--text-2)" }} aria-hidden="true"></i>
                <span className="left-title">Issues por Epic</span>
                
                <div className="search-wrap">
                  <i className="ti ti-search search-icon" aria-hidden="true"></i>
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Buscar issue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  className="quick-add-btn"
                  title="Create new issue"
                  onClick={() => setShowIssueModal({ open: true })}
                >
                  + Issue
                </button>
              </div>

              <div className="left-body">
                {epicsWithFilteredIssues.length === 0 ? (
                  <div className="no-epics">Nenhum Epic ou Issue encontrado.</div>
                ) : (
                  epicsWithFilteredIssues.map((epic) => {
                    const isExpanded = expandedEpics[epic.id] !== false;
                    return (
                      <div key={epic.id} className="epic-section">
                        <div className="epic-header" onClick={() => toggleEpic(epic.id)}>
                          <div className="epic-dot" style={{ background: epic.status.color }} />
                          <span className="epic-label">{epic.name}</span>
                          <span className="epic-count">{epic.filteredIssues.length} issues</span>
                          <i className={`ti ti-chevron-down epic-chevron ${isExpanded ? "open" : ""}`} aria-hidden="true"></i>
                        </div>

                        {isExpanded && (
                          <div className="issues-list">
                            {epic.filteredIssues.length === 0 ? (
                              <div className="empty-epic-issues">Nenhuma issue.</div>
                            ) : (
                              epic.filteredIssues.map((issue) => {
                                const linkedMs = getLinkedMilestone(issue, milestones);
                                const inCart = !!linkedMs;

                                return (
                                  <div
                                    key={issue.id}
                                    className={`issue-card ${inCart ? "in-cart" : ""}`}
                                    onClick={() => {
                                      if (!inCart && activeMilestoneId && !isMutating) {
                                        addDependencyMutation.mutate({
                                          taskId: issue.id,
                                          dependsOnId: activeMilestoneId,
                                        });
                                      }
                                    }}
                                  >
                                    <div
                                      className="issue-status"
                                      style={{ background: issue.status?.color || "var(--text-3)" }}
                                    />
                                    <span className="issue-name">{issue.name}</span>
                                    
                                    {inCart ? (
                                      <span className="in-cart-badge">
                                        <i className="ti ti-check" aria-hidden="true" style={{ fontSize: "11px" }}></i>
                                        {linkedMs.name}
                                      </span>
                                    ) : (
                                      <button
                                        className="add-btn"
                                        aria-label="Adicionar à Milestone ativa"
                                        disabled={isMutating}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (activeMilestoneId) {
                                            addDependencyMutation.mutate({
                                              taskId: issue.id,
                                              dependsOnId: activeMilestoneId,
                                            });
                                          }
                                        }}
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT Pane: Milestone Carts */}
            <div className="right-col">
              <div className="right-header">
                <i className="ti ti-shopping-cart" style={{ fontSize: "15px", color: "var(--text-2)" }} aria-hidden="true"></i>
                <span className="right-title">Milestones</span>
                <span className="cart-count-badge">{totalLinked} issues vinculadas</span>
              </div>

              <div className="right-body">
                {milestones.length === 0 ? (
                  <div className="empty-state-ms">
                    <h3>Nenhuma Milestone cadastrada</h3>
                    <p>Crie uma Milestone clicando no botão "+ New Milestone" no topo.</p>
                  </div>
                ) : (
                  milestones.map((ms) => {
                    const isActive = activeMilestoneId === ms.id;
                    const msIssues = getIssuesForMilestone(epics, ms.id);

                    return (
                      <div key={ms.id} className="milestone-cart">
                        <div
                          className={`ms-cart-header ${isActive ? "active" : ""}`}
                          onClick={() => setSelectedMilestoneId(ms.id)}
                        >
                          <i className="ti ti-circle-dot ms-icon" aria-hidden="true"></i>
                          <span className="ms-cart-name">{ms.name}</span>
                          
                          {ms.due_date && (
                            <span className="ms-due">
                              Due {new Date(parseInt(ms.due_date)).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          
                          <span className="ms-issue-count">{msIssues.length} issues</span>
                          
                          <button
                            className="ms-add-btn-quick"
                            title="Criar nova issue nesta Milestone"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowIssueModal({ open: true, milestoneId: ms.id });
                            }}
                          >
                            +
                          </button>
                        </div>

                        <div className="ms-cart-body">
                          {msIssues.length === 0 ? (
                            <div className="ms-empty">
                              {isActive
                                ? "Selecione uma Issue à esquerda para vincular a esta Milestone"
                                : "Nenhuma Issue vinculada"}
                            </div>
                          ) : (
                            msIssues.map((issue) => {
                              const parentEpic = epics.find((e) =>
                                e.subtasks?.some((s) => s.id === issue.id)
                              );
                              return (
                                <div key={issue.id} className="cart-issue">
                                  <div
                                    className="cart-issue-dot"
                                    style={{ background: issue.status?.color || "var(--text-3)" }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="cart-issue-name">{issue.name}</div>
                                    {parentEpic && (
                                      <div className="cart-issue-epic">{parentEpic.name}</div>
                                    )}
                                  </div>
                                  <button
                                    className="remove-btn"
                                    aria-label="Remover vínculo"
                                    disabled={isMutating}
                                    onClick={() => {
                                      removeDependencyMutation.mutate({
                                        taskId: issue.id,
                                        dependsOnId: ms.id,
                                      });
                                    }}
                                  >
                                    <i className="ti ti-x" aria-hidden="true" style={{ fontSize: "11px" }}></i>
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* FOOTER */}
              <div className="right-footer">
                <span className="footer-summary">
                  {totalLinked === 0
                    ? "Selecione issues e vincule às Milestones"
                    : `${totalLinked} issue${totalLinked !== 1 ? "s" : ""} pronta${totalLinked !== 1 ? "s" : ""} para o Roadmap`}
                </span>
                <button
                  className="btn-roadmap"
                  disabled={totalLinked === 0}
                  onClick={() => setView("timeline")}
                >
                  <i className="ti ti-map-2" aria-hidden="true"></i>
                  Ver Roadmap ↗
                </button>
              </div>

            </div>

          </div>
        ) : (
          /* TIMELINE VIEW PLACEHOLDER */
          <div className="timeline-placeholder-card">
            <i className="ti ti-map-2 placeholder-icon" aria-hidden="true"></i>
            <h2>Visual Roadmap Timeline</h2>
            <p>
              Esta tela renderizará o Gantt interativo baseado nos vínculos entre as
              milestones e as issues configuradas no painel.
            </p>
            <div className="timeline-sketch">
              <div className="sketch-ruler">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
              <div className="sketch-swimlane">
                <div className="sketch-epic">[Epic] Gerenciador Dev</div>
                <div className="sketch-block" style={{ width: "35%", marginLeft: "5%" }}>Sprint 1</div>
                <div className="sketch-block" style={{ width: "25%", marginLeft: "45%" }}>Sprint 2</div>
              </div>
              <div className="sketch-swimlane">
                <div className="sketch-epic">[Epic] Game Experience</div>
                <div className="sketch-block" style={{ width: "50%", marginLeft: "15%" }}>Sprint 2</div>
              </div>
            </div>
            <button className="back-to-linker-btn" onClick={() => setView("linker")}>
              ← Voltar para Vincular
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .manager-page {
          background: var(--bg);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .error-page {
          background: var(--bg);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 80px;
          color: var(--text-3);
        }
        .page-body {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Project header */
        .project-header {
          background: var(--surface-1);
          border: 1px solid var(--border-2);
          border-radius: var(--r-lg);
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 32px;
        }
        .project-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-3);
          display: block;
          margin-bottom: 4px;
        }
        .project-name {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-1);
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }
        .project-stats {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-2);
        }
        .dot {
          color: var(--border-3);
        }
        .project-progress {
          width: 240px;
          flex-shrink: 0;
        }
        .prog-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-2);
          margin-bottom: 6px;
        }
        .prog-pct {
          color: var(--purple-lg);
          font-weight: 700;
        }
        .prog-track {
          height: 6px;
          background: var(--border-2);
          border-radius: 3px;
          overflow: hidden;
        }
        .prog-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--purple), var(--purple-lg));
          transition: width 0.4s;
        }

        /* Tabs */
        .view-tabs {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-2);
          padding: 0 4px;
        }
        .tabs-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .vtab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.15s;
        }
        .vtab:hover {
          color: var(--text-1);
        }
        .vtab.active {
          color: var(--purple-lg);
          border-bottom-color: var(--purple-lg);
          font-weight: 600;
        }
        .new-ms-btn {
          background: rgba(124, 58, 237, 0.15);
          color: var(--purple-lg);
          border: 1px solid rgba(124, 58, 237, 0.3);
          border-radius: var(--r-sm);
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .new-ms-btn:hover {
          background: rgba(124, 58, 237, 0.25);
          border-color: var(--purple);
          box-shadow: 0 0 8px rgba(124, 58, 237, 0.2);
        }

        /* Root Linker */
        .root-linker {
          display: flex;
          height: 620px;
          border: 1px solid var(--border-2);
          border-radius: var(--r-lg);
          overflow: hidden;
          background: var(--surface-1);
        }

        /* LEFT — corredores */
        .left-col {
          width: 440px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-2);
          background: var(--surface-1);
        }
        .left-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-2);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .left-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-1);
          flex: 1;
        }
        .search-wrap {
          position: relative;
        }
        .search-input {
          font-size: 12px;
          padding: 5px 10px 5px 28px;
          border: 1px solid var(--border-2);
          border-radius: var(--r-sm);
          background: var(--surface-2);
          color: var(--text-1);
          outline: none;
          width: 140px;
          transition: all 0.15s;
        }
        .search-input:focus {
          border-color: var(--purple);
          width: 160px;
        }
        .search-icon {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13px;
          color: var(--text-3);
          pointer-events: none;
        }
        .quick-add-btn {
          font-size: 11px;
          background: var(--surface-3);
          color: var(--text-1);
          border: 1px solid var(--border-3);
          padding: 5px 10px;
          border-radius: var(--r-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .quick-add-btn:hover {
          background: rgba(124, 58, 237, 0.1);
          border-color: var(--purple);
          color: var(--purple-lg);
        }
        .left-body {
          flex: 1;
          overflow-y: auto;
        }
        .no-epics {
          padding: 32px;
          text-align: center;
          font-size: 13px;
          color: var(--text-3);
        }

        /* Epic section */
        .epic-section {
          border-bottom: 1px solid var(--border-2);
        }
        .epic-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          background: var(--surface-2);
          transition: background 0.15s;
        }
        .epic-header:hover {
          background: var(--surface-3);
        }
        .epic-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .epic-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-1);
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .epic-count {
          font-size: 11px;
          color: var(--text-3);
        }
        .epic-chevron {
          font-size: 11px;
          color: var(--text-3);
          transition: transform 0.15s;
        }
        .epic-chevron.open {
          transform: rotate(180deg);
        }
        .issues-list {
          display: flex;
          flex-direction: column;
        }
        .empty-epic-issues {
          padding: 12px 16px 12px 32px;
          font-size: 12px;
          color: var(--text-3);
          font-style: italic;
        }

        /* Issue card — corredor */
        .issue-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px 9px 32px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-2);
          transition: background 0.12s;
          position: relative;
        }
        .issue-card:last-child {
          border-bottom: none;
        }
        .issue-card:hover {
          background: var(--surface-2);
        }
        .issue-card.in-cart {
          background: rgba(124, 58, 237, 0.05);
          cursor: default;
        }
        .issue-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .issue-name {
          font-size: 12px;
          color: var(--text-1);
          flex: 1;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .issue-card.in-cart .issue-name {
          color: var(--text-3);
          text-decoration: line-through;
          opacity: 0.6;
        }
        .add-btn {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid var(--border-3);
          background: var(--surface-1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: var(--text-2);
          flex-shrink: 0;
          transition: all 0.12s;
          padding: 0;
          line-height: 1;
        }
        .issue-card:not(.in-cart):hover .add-btn {
          background: rgba(124, 58, 237, 0.15);
          border-color: var(--purple-lg);
          color: var(--purple-lg);
          transform: scale(1.1);
        }
        .in-cart-badge {
          font-size: 10px;
          color: var(--purple-lg);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          background: rgba(124, 58, 237, 0.15);
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 500;
        }

        /* RIGHT — carrinho (Milestones) */
        .right-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--surface-1);
        }
        .right-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-2);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .right-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-1);
          flex: 1;
        }
        .cart-count-badge {
          font-size: 11px;
          background: rgba(124, 58, 237, 0.15);
          color: var(--purple-lg);
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 500;
        }
        .right-body {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }
        .empty-state-ms {
          padding: 48px;
          text-align: center;
          color: var(--text-3);
        }
        .empty-state-ms h3 {
          color: var(--text-1);
          font-size: 15px;
          margin-bottom: 6px;
        }
        .empty-state-ms p {
          font-size: 12px;
        }
        .milestone-cart {
          border: 1px solid var(--border-2);
          border-radius: var(--r-md);
          margin-bottom: 10px;
          overflow: hidden;
          background: var(--surface-1);
        }
        .ms-cart-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--surface-2);
          cursor: pointer;
          transition: background 0.15s;
          border-left: 3px solid transparent;
        }
        .ms-cart-header:hover {
          background: var(--surface-3);
        }
        .ms-cart-header.active {
          border-left-color: var(--purple);
          background: rgba(124, 58, 237, 0.05);
        }
        .ms-icon {
          font-size: 14px;
          color: var(--purple-lg);
        }
        .ms-cart-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-1);
          flex: 1;
        }
        .ms-due {
          font-size: 11px;
          color: var(--text-3);
          background: var(--surface-3);
          padding: 2px 7px;
          border-radius: 20px;
        }
        .ms-issue-count {
          font-size: 11px;
          color: var(--text-3);
        }
        .ms-add-btn-quick {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1px solid var(--border-3);
          background: var(--surface-1);
          color: var(--text-2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
        }
        .ms-add-btn-quick:hover {
          border-color: var(--purple-lg);
          color: var(--purple-lg);
          background: rgba(124, 58, 237, 0.15);
        }
        .ms-cart-body {
          padding: 8px;
          background: var(--surface-1);
        }
        .ms-empty {
          padding: 12px;
          text-align: center;
          font-size: 12px;
          color: var(--text-3);
          border: 1px dashed var(--border-3);
          border-radius: var(--r-sm);
        }
        .cart-issue {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: var(--r-sm);
          background: var(--surface-2);
          border: 1px solid var(--border-2);
          margin-bottom: 6px;
          transition: border-color 0.15s;
        }
        .cart-issue:last-child {
          margin-bottom: 0;
        }
        .cart-issue:hover {
          border-color: var(--border-3);
        }
        .cart-issue-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cart-issue-name {
          font-size: 12px;
          color: var(--text-1);
          font-weight: 500;
        }
        .cart-issue-epic {
          font-size: 10px;
          color: var(--text-3);
          margin-top: 1px;
        }
        .remove-btn {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: none;
          background: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: var(--text-3);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.12s;
          padding: 0;
        }
        .remove-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        /* Footer */
        .right-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border-2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-1);
        }
        .footer-summary {
          font-size: 12px;
          color: var(--text-2);
        }
        .btn-roadmap {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--purple);
          color: #fff;
          border: none;
          border-radius: var(--r-sm);
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-roadmap:hover:not(:disabled) {
          background: var(--purple-lg);
        }
        .btn-roadmap:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* Timeline Placeholder styles */
        .timeline-placeholder-card {
          background: var(--surface-1);
          border: 1px solid var(--border-2);
          border-radius: var(--r-lg);
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .placeholder-icon {
          font-size: 48px;
          color: var(--purple-lg);
        }
        .timeline-placeholder-card h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-1);
          margin: 0;
        }
        .timeline-placeholder-card p {
          font-size: 14px;
          color: var(--text-2);
          max-width: 480px;
          line-height: 1.6;
          margin: 0;
        }
        .timeline-sketch {
          width: 100%;
          max-width: 600px;
          background: var(--surface-2);
          border: 1px solid var(--border-3);
          border-radius: var(--r-md);
          padding: 20px;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sketch-ruler {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-3);
          padding-bottom: 8px;
          font-size: 11px;
          color: var(--text-3);
          font-weight: 600;
          text-transform: uppercase;
        }
        .sketch-swimlane {
          display: flex;
          align-items: center;
          height: 36px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--r-sm);
          position: relative;
        }
        .sketch-epic {
          position: absolute;
          left: 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-2);
          z-index: 5;
        }
        .sketch-block {
          height: 24px;
          background: rgba(124, 58, 237, 0.15);
          border: 1px solid var(--purple-lg);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: var(--purple-lg);
        }
        .back-to-linker-btn {
          margin-top: 10px;
          background: var(--surface-3);
          color: var(--text-1);
          border: 1px solid var(--border-3);
          padding: 8px 16px;
          border-radius: var(--r-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .back-to-linker-btn:hover {
          background: var(--border-3);
          border-color: var(--text-3);
        }
      `}</style>
    </div>
  );
}
