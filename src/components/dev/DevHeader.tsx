"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClickUpList } from "@/types/clickup";
interface DevHeaderProps {
  list: ClickUpList | null;
  /** If true, renders the Milestones dashboard header (no breadcrumb) */
  isDashboard?: boolean;
}

export default function DevHeader({ list, isDashboard = false }: DevHeaderProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      // scrolling down → esconde; scrolling up ou no topo → mostra
      if (currentY > lastY && currentY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
      lastY = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`dev-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-left">
        <button className="back-btn" onClick={() => router.push('/map')} aria-label="Go back to mind map">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" />
          </svg>
        </button>

        <div className="header-divider" />

        <nav className="breadcrumbs" aria-label="breadcrumb">
          {isDashboard ? (
            <span className="breadcrumb-current">Milestones</span>
          ) : (
            <>
              <Link href="/dev" className="breadcrumb-link">Milestones</Link>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{list?.name ?? "Loading…"}</span>
            </>
          )}
        </nav>
      </div>

      <div className="header-right">
        {isDashboard ? (
          <span className="header-badge">Sprint Manager</span>
        ) : (
          <span className="header-badge milestone">MILESTONE</span>
        )}
      </div>

      <style jsx>{`
        .dev-header {
        transition: transform 0.25s ease, box-shadow 0.25s ease;
          height: 56px;
          background: #191661ff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          flex-shrink: 0;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .back-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: background 0.15s, color 0.15s;
        }
        .back-btn:hover {
          background: #f0f0f2;
          color: #1f1e24;
        }
        .header-divider {
          width: 1px;
          height: 20px;
          background: #e1e1e6;
        }
        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }
        .breadcrumb-link {
          color: #1f75cb;
          text-decoration: none;
          font-weight: 500;
        }
        .breadcrumb-link:hover {
          text-decoration: underline;
        }
        .breadcrumb-sep {
          color: #aaa;
          font-size: 16px;
        }
        .breadcrumb-current {
          color: #ffffffff;
          font-weight: 600;
        }
        .header-right {
          display: flex;
          align-items: center;
        }
        .header-badge {
          font-size: 11px;
          font-weight: 700;
          color: #666;
          background: #f0f0f2;
          padding: 3px 10px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .header-badge.milestone {
          color: #6e49cb;
          background: #f0edfb;
          }
          .dev-header.scrolled {
            transform: translateY(-100%);
            opacity: 0;
            pointer-events: none;
          }
        
      `}</style>
    </header>
  );
}
