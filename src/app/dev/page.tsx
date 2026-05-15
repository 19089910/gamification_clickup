"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import DevHeader from "@/components/dev/DevHeader";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { ClickUpList, ClickUpTask } from "@/types/clickup";
import { isDevList, hasDevTag } from "@/lib/dev-mode";

interface GraphData {
  folders: { id: string; name: string }[];
  folderlessLists: ClickUpList[];
  folderListsMap: Record<string, ClickUpList[]>;
  listTasksMap: Record<string, ClickUpTask[]>;
}

interface MilestoneInfo {
  list: ClickUpList;
  tasks: ClickUpTask[];
  openCount: number;
  closedCount: number;
  progress: number;
}

function useSpaceId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("spaceId");
}

export default function MilestonesDashboard() {
  // Try to get spaceId from URL. Fall back to localStorage key used by /map.
  const spaceId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("spaceId") ??
        localStorage.getItem("lastSpaceId")
      : null;

  const { data, isLoading } = useQuery<GraphData>({
    queryKey: ["clickup-graph", spaceId],
    queryFn: async () => {
      if (!spaceId) throw new Error("No spaceId");
      const res = await fetch(`/api/clickup/graph?spaceId=${spaceId}`);
      if (!res.ok) throw new Error("Graph fetch failed");
      return res.json();
    },
    enabled: !!spaceId,
    staleTime: 60_000,
  });

  const milestones: MilestoneInfo[] = useMemo(() => {
    if (!data) return [];

    const allLists: ClickUpList[] = [
      ...Object.values(data.folderListsMap).flat(),
      ...data.folderlessLists,
    ];

    return allLists
      .map((list) => {
        const tasks = data.listTasksMap[list.id] ?? [];
        return { list, tasks };
      })
      .filter(({ tasks }) => isDevList(tasks))
      .map(({ list, tasks }) => {
        const issues = tasks.filter((t) => !t.parent && hasDevTag(t));
        const closed = issues.filter((i) => i.status.type === "closed").length;
        const open = issues.length - closed;
        const progress = issues.length > 0 ? (closed / issues.length) * 100 : 0;
        return { list, tasks, openCount: open, closedCount: closed, progress };
      });
  }, [data]);

  if (!spaceId) {
    return (
      <div className="no-space">
        <DevHeader list={null} isDashboard />
        <div className="no-space-body">
          <h2>No Space selected</h2>
          <p>
            Go to the <Link href="/map">Mind Map</Link> first and open a space,
            then return here.
          </p>
        </div>
        <style jsx>{`
          .no-space { min-height: 100vh; background: #f4f4f6; }
          .no-space-body { padding: 80px; text-align: center; color: #666; }
          .no-space-body a { color: #1f75cb; }
        `}</style>
      </div>
    );
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="milestones-dash">
      <DevHeader list={null} isDashboard />

      <div className="dash-wrapper">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Milestones</h1>
            <p className="dash-sub">
              {milestones.length} active sprint
              {milestones.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <nav className="dash-tabs">
          <button className="dash-tab active">
            Open&nbsp;<span className="tab-badge">{milestones.length}</span>
          </button>
        </nav>

        {milestones.length === 0 ? (
          <div className="empty-dash">
            <h3>No milestones yet</h3>
            <p>
              Mark a list as Dev Mode (⚡) in the{" "}
              <Link href="/map">Mind Map</Link> to create a sprint milestone.
            </p>
          </div>
        ) : (
          <div className="milestone-list">
            {milestones.map(({ list, openCount, closedCount, progress }) => (
              <MilestoneCard
                key={list.id}
                list={list}
                openCount={openCount}
                closedCount={closedCount}
                progress={progress}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .milestones-dash {
          background: #f4f4f6;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .dash-wrapper {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 24px;
          width: 100%;
        }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
        }
        .dash-title {
          font-size: 26px;
          font-weight: 700;
          color: #1f1e24;
          margin: 0;
        }
        .dash-sub {
          font-size: 13px;
          color: #888;
          margin: 4px 0 0 0;
        }
        .dash-tabs {
          display: flex;
          border-bottom: 1px solid #dcdcde;
          margin-bottom: 20px;
        }
        .dash-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 10px 4px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .dash-tab.active {
          color: #1f75cb;
          border-bottom-color: #1f75cb;
          font-weight: 600;
        }
        .tab-badge {
          background: #e1e1e6;
          color: #555;
          font-size: 11px;
          font-weight: 600;
          padding: 0 6px;
          border-radius: 8px;
        }
        .milestone-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          background: #fff;
          border: 1px solid #dcdcde;
          border-radius: 6px;
          overflow: hidden;
        }
        .empty-dash {
          background: #fff;
          border: 1px solid #dcdcde;
          border-radius: 6px;
          padding: 64px 32px;
          text-align: center;
          color: #888;
        }
        .empty-dash h3 { color: #1f1e24; margin-bottom: 8px; }
        .empty-dash a { color: #1f75cb; }
      `}</style>
    </div>
  );
}

// ── Milestone Card ──────────────────────────────────────────────────────────

interface MilestoneCardProps {
  list: ClickUpList;
  openCount: number;
  closedCount: number;
  progress: number;
}

function MilestoneCard({
  list,
  openCount,
  closedCount,
  progress,
}: MilestoneCardProps) {
  const rounded = Math.round(progress);

  return (
    <div className="m-card">
      <div className="m-left">
        <Link href={`/dev/${list.id}`} className="m-name">
          {list.name}
        </Link>
        <div className="m-meta">
          <span className="m-id">{list.id}</span>
          <span className="m-dot">·</span>
          <span className="m-issues">
            {openCount} open&nbsp;·&nbsp;{closedCount} closed
          </span>
        </div>
      </div>

      <div className="m-right">
        <div className="m-progress-row">
          <div className="m-track">
            <div
              className="m-fill"
              style={{ width: `${rounded}%` }}
            />
          </div>
          <span className="m-pct">{rounded}%</span>
        </div>
      </div>

      <style jsx>{`
        .m-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-bottom: 1px solid #eaeaea;
          transition: background 0.15s;
        }
        .m-card:last-child { border-bottom: none; }
        .m-card:hover { background: #f9f9fb; }
        .m-left { display: flex; flex-direction: column; gap: 4px; }
        .m-name {
          font-size: 15px;
          font-weight: 600;
          color: #1f1e24;
          text-decoration: none;
        }
        .m-name:hover { color: #1f75cb; text-decoration: underline; }
        .m-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #888;
        }
        .m-dot { color: #ccc; }
        .m-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; width: 220px; }
        .m-progress-row { display: flex; align-items: center; gap: 12px; width: 100%; }
        .m-track { flex: 1; height: 8px; background: #eaeaea; border-radius: 4px; overflow: hidden; }
        .m-fill { height: 100%; background: #52a31f; border-radius: 4px; transition: width 0.4s; }
        .m-pct { font-size: 12px; font-weight: 600; color: #666; min-width: 32px; text-align: right; }
      `}</style>
    </div>
  );
}
