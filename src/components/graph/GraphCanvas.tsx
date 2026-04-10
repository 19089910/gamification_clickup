"use client";

import React, { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useGraphStore } from "@/store/graphStore";
import { AppNode } from "@/types/graph";
import { useQueryClient } from "@tanstack/react-query";
import SpaceNode from "./nodes/SpaceNode";
import FolderNode from "./nodes/FolderNode";
import ListNode from "./nodes/ListNode";
import TaskNode from "./nodes/TaskNode";

const nodeTypes: NodeTypes = {
  space: SpaceNode,
  folder: FolderNode,
  list: ListNode,
  task: TaskNode,
};

const proOptions = { hideAttribution: false };

export default function GraphCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, setSelectedNode, createTask, selectedQuarter } =
    useGraphStore();
  const queryClient = useQueryClient();

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: AppNode) => {
      setSelectedNode(node);
    },
    [setSelectedNode],
  );

  const onNodeDoubleClick = useCallback(
    async (_: React.MouseEvent, node: AppNode) => {
      if (node.type !== 'list') return;
      
      const listId = node.data.listId as string;
      const name = prompt('Nome da nova task:');
      if (!name) return;

      try {
        await createTask(listId, name, selectedQuarter);
        queryClient.invalidateQueries({ queryKey: ["clickup-graph"] });
      } catch (err) {
        console.error("Error creating task:", err);
        alert("Erro ao criar task no ClickUp");
      }
    },
    [createTask, selectedQuarter, queryClient]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
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

        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1a1a1a"
        />
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
              case "space":
                return "#7c3aed";
              case "folder":
                return "#0ea5e9";
              case "list":
                return "#10b981";
              case "task":
                return "#f59e0b";
              default:
                return "#333";
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
        </Panel>
      </ReactFlow>
    </div>
  );
}
