"use client";

import React, { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DevHeader from "@/components/dev/DevHeader";
import MilestoneHeader from "@/components/dev/MilestoneHeader";
import IssueItem from "@/components/dev/IssueItem";
import ProgressOverview from "@/components/dev/ProgressOverview";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { ClickUpTask } from "@/types/clickup";

export default function MilestoneDetailPage({ params }: { params: Promise<{ listId: string; taskId: string }> }) {
  const { listId, taskId } = use(params);

  const { data: milestone, isLoading } = useQuery<ClickUpTask>({
    queryKey: ["milestone-detail", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/clickup/tasks/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch milestone detail");
      return res.json();
    },
  });

  const { progress, openCount, closedCount } = useMemo(() => {
    if (!milestone?.subtasks) return { progress: 0, openCount: 0, closedCount: 0 };
    const issues = milestone.subtasks;
    const closed = issues.filter(i => i.status.type === 'closed').length;
    const open = issues.length - closed;
    const prog = issues.length > 0 ? (closed / issues.length) * 100 : 0;
    return { progress: prog, openCount: open, closedCount: closed };
  }, [milestone]);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="gitlab-milestone-page">
      <DevHeader list={null} /> {/* We can fetch the list info if needed, but the milestone task has its own context */}
      
      <div className="milestone-content-wrapper">
        <header className="milestone-page-header">
          <div className="header-main">
            <div className="status-badge active">Active Milestone</div>
            <h1 className="milestone-title">{milestone?.name}</h1>
            <p className="milestone-description">{milestone?.description || "No description provided for this milestone."}</p>
          </div>
          
          <div className="header-stats">
            <div className="stat-item">
              <div className="stat-label">Total Completion</div>
              <div className="stat-bar-container">
                <div className="stat-bar-fill" style={{ width: `${progress}%` }} />
                <span className="stat-percentage">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </header>

        <nav className="milestone-tabs">
          <button className="tab-btn active">
            Issues <span className="badge">{milestone?.subtasks?.length || 0}</span>
          </button>
        </nav>

        <main className="milestone-main">
          <div className="content-area">
            <div className="issue-list-view">
              <div className="list-filters">
                <button className="filter-btn active">Open <span className="count">{openCount}</span></button>
                <button className="filter-btn">Closed <span className="count">{closedCount}</span></button>
              </div>
              <div className="issue-rows">
                {milestone?.subtasks?.map(issue => (
                  <IssueItem key={issue.id} issue={issue} variant="gitlab" />
                ))}
              </div>
            </div>
          </div>

          <aside className="milestone-sidebar">
            <ProgressOverview epics={[]} issues={milestone?.subtasks || []} totalProgress={progress} />
          </aside>
        </main>
      </div>

      <style jsx>{`
        .gitlab-milestone-page { background: #f0f0f2; min-height: 100vh; color: #333; }
        .milestone-content-wrapper { max-width: 1280px; margin: 0 auto; padding: 24px; }
        .milestone-page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 8px; background: #e1f3d8; color: #52a31f; }
        .milestone-title { font-size: 28px; font-weight: 600; margin: 0 0 8px 0; color: #1f1e24; }
        .milestone-description { font-size: 14px; color: #666; max-width: 800px; line-height: 1.5; }
        .header-stats { width: 300px; }
        .stat-label { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px; }
        .stat-bar-container { height: 12px; background: #e5e5e5; border-radius: 6px; position: relative; overflow: hidden; }
        .stat-bar-fill { height: 100%; background: #1f75cb; }
        .stat-percentage { position: absolute; right: 8px; top: -20px; font-size: 12px; font-weight: 600; color: #1f75cb; }
        .milestone-tabs { display: flex; border-bottom: 1px solid #dcdcde; margin-bottom: 24px; }
        .tab-btn { background: none; border: none; padding: 12px 4px; font-size: 15px; color: #1f75cb; cursor: pointer; position: relative; font-weight: 600; }
        .tab-btn::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #1f75cb; }
        .badge { background: #ebebed; color: #666; padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 4px; }
        .milestone-main { display: flex; gap: 32px; }
        .content-area { flex: 1; }
        .list-filters { display: flex; gap: 16px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #dcdcde; }
        .filter-btn { background: none; border: none; font-size: 14px; color: #666; cursor: pointer; }
        .filter-btn.active { color: #1f1e24; font-weight: 600; }
        .count { color: #999; margin-left: 4px; }
        .milestone-sidebar { width: 300px; }
      `}</style>
    </div>
  );
}
