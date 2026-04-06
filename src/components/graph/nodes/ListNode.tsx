"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ListNode as ListNodeType } from "@/types/graph";

const ListNode = memo<NodeProps<ListNodeType>>(({ data, selected }) => {
  const accent = data.color as string;

  return (
    <div
      className={`list-node ${selected ? "selected" : ""}`}
      style={{
        border: `2px solid ${selected ? accent : accent + "55"}`,
        boxShadow: selected ? `0 0 20px ${accent}44` : `0 0 10px ${accent}22`,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="list-color-stripe" style={{ background: accent }} />
      <div className="node-content">
        <span className="node-label">{data.label}</span>
        <span className="node-meta" style={{ color: accent }}>
          {data.taskCount} tasks
        </span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

ListNode.displayName = "ListNode";
export default ListNode;
