// Componente principal (UI limpa)
"use client";

import React, { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useGraphStore } from "@/store/graphStore";
import { AppNode } from "@/types/graph";
import { nodeTypes } from "./nodeTypes";

import { useTimerSync } from "./hooks/useTimerSync";
import { useGraphShortcuts } from "./hooks/useGraphShortcuts";
import { useTempNodeEvents } from "./hooks/useTempNodeEvents";

const proOptions = { hideAttribution: false };

export default function GraphCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, setSelectedNode } = useGraphStore();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Hook isolado para timer
  useTimerSync();

  // Hook isolado para eventos de nós temporários
  useTempNodeEvents();

  // Hook isolado para atalhos de teclado
  const { handleKeyDown } = useGraphShortcuts();

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: AppNode) => {
      if (node.type === "temp") return;
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    const { nodes: currentNodes, removeTempNode: remove } = useGraphStore.getState();
    currentNodes.filter((n) => n.type === "temp").forEach((n) => remove(n.id));
  }, [setSelectedNode]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "100%" }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
        minZoom={0.05}
        maxZoom={2}
        proOptions={proOptions}
        defaultEdgeOptions={{
          style: { strokeWidth: 1.5, stroke: "#333" },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1a1a1a" />
        <Controls
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case "space": return "#7c3aed";
              case "folder": return "#0ea5e9";
              case "list": return "#10b981";
              case "task": return "#f59e0b";
              case "subtask": return "#ec4899";
              case "temp": return "#555";
              default: return "#333";
            }
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
        <Panel position="top-left">
          <div className="graph-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#7c3aed" }} />
              <span>Space</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#0ea5e9" }} />
              <span>Folder</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#10b981" }} />
              <span>List</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#f59e0b" }} />
              <span>Task</span>
            </div>
          </div>
          <div className="graph-shortcuts">
            <span><kbd>Tab</kbd> criar filho</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}