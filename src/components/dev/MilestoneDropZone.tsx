"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";

interface MilestoneDropZoneProps {
  milestoneId: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export default function MilestoneDropZone({
  milestoneId,
  children,
  isActive,
}: MilestoneDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: milestoneId,
    data: {
      type: "Milestone",
      milestoneId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`drop-zone ${isOver ? "over" : ""} ${isActive ? "active" : ""}`}
    >
      {children}
      <style jsx>{`
        .drop-zone {
          min-height: 40px;
          border-radius: 6px;
          transition: background-color 0.2s, box-shadow 0.2s;
          padding: 4px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .drop-zone.over {
          background-color: rgba(110, 73, 203, 0.1);
          box-shadow: inset 0 0 0 2px rgba(110, 73, 203, 0.5);
        }
      `}</style>
    </div>
  );
}
