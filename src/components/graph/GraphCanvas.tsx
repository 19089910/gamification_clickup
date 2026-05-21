"use client";

import React, { useCallback, useEffect, useRef } from "react";
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
import { GraphApiResponse } from "@/hooks/useClickUpData";
import SpaceNode from "./nodes/SpaceNode";
import FolderNode from "./nodes/FolderNode";
import ListNode from "./nodes/ListNode";
import TaskNode from "./nodes/TaskNode";
import TempNode from "./nodes/TempNode";
import SubtaskNode from "./nodes/SubtaskNode";

const nodeTypes: NodeTypes = {
  space: SpaceNode,
  folder: FolderNode,
  list: ListNode,
  task: TaskNode,
  temp: TempNode as any,
  subtask: SubtaskNode,
};

const proOptions = { hideAttribution: false };

export default function GraphCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange,
    setSelectedNode, selectedNode,
    createTask, createList, createSubtask,
    selectedQuarter,
    addTempNode, removeTempNode,
    setQuarterPickerModal,
    expandPathToNode,
  } = useGraphStore();

  const queryClient = useQueryClient();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Listen for temp node commit/cancel events (fired from TempNode component) ──
  useEffect(() => {
    const handleCommit = async (e: Event) => {
      const { nodeId, name } = (e as CustomEvent).detail;
      const tempNode = useGraphStore.getState().nodes.find(n => n.id === nodeId);
      if (!tempNode || tempNode.type !== 'temp') return;

      const nodeParentId = tempNode.data.parentId as string;
      const parentType = tempNode.data.parentType as string;

      // Look up the actual ClickUp ID from the parent node's data
      const parentNode = useGraphStore.getState().fullNodes.find(n => n.id === nodeParentId);

      const clickUpId = parentType === 'folder'
        ? (parentNode?.data as any)?.folderId as string
        : parentType === 'task'
          ? (parentNode?.data as any)?.taskId as string || parentNode?.id.replace('task-', '') // Fallback para o ID do nó
          : (parentNode?.data as any)?.listId as string;

      // ── RESOLUÇÃO DO LIST ID DA TASK PAI ──
      let parentListId: string | null = null;
      if (parentType === 'task' && parentNode) {
        // 1. Tenta pegar de propriedades comuns de herança de nós
        parentListId = (parentNode.data as any).listId ||
          (parentNode.data as any).list?.id ||
          (parentNode as any).parentId?.replace('list-', '') || null;

        // 2. CORREÇÃO: Busca o listTasksMap dentro dos dados reais do React Query cache
        if (!parentListId && clickUpId) {
          const cleanTaskId = clickUpId.replace('task-', '');

          // Pegamos o estado do cache atual do React Query baseado na sua chave
          const queryData = queryClient.getQueryData<GraphApiResponse>([
            'clickup-graph',
            useGraphStore.getState().spaceId
          ]);

          const listTasksMap = queryData?.listTasksMap || {};

          for (const listId in listTasksMap) {
            if (listTasksMap[listId]?.some((t: any) => t.id === cleanTaskId)) {
              parentListId = listId;
              break;
            }
          }
        }
      }

      // Se for vazio ou nulo, barra aqui com segurança
      if (!clickUpId) {
        console.error('Could not resolve ClickUp ID for parent node', nodeParentId);
        removeTempNode(nodeId);
        return;
      }

      removeTempNode(nodeId);

      if (parentType === 'list') {
        // Create task immediately with active quarter
        try {
          const newTask = await createTask(clickUpId, name, selectedQuarter);

          // Local Sync: Update cache after success
          queryClient.setQueryData(['clickup-graph', useGraphStore.getState().spaceId], (oldData: GraphApiResponse | undefined) => {
            if (!oldData) return oldData;
            const newListTasksMap = { ...oldData.listTasksMap };
            const listTasks = newListTasksMap[clickUpId] || [];
            newListTasksMap[clickUpId] = [...listTasks, newTask];
            return { ...oldData, listTasksMap: newListTasksMap };
          });
        } catch (err) {
          console.error('Error creating task:', err);
          // Recovery: Force full refetch if creation fails to avoid ghost nodes or state mismatch
          queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
          alert("Erro ao criar tarefa. Sincronizando com ClickUp...");
        }
      } else if (parentType === 'folder') {
        // Open quarter picker modal to finish list creation
        setQuarterPickerModal({
          isOpen: true,
          listName: name,
          folderId: clickUpId,
          tempNodeId: nodeId,
        });
      } else if (parentType === 'task') {
        try {
          const cleanTaskId = clickUpId.replace('task-', '');

          // Dispara para a rota correta que agora está mapeada perfeitamente
          await createSubtask(cleanTaskId, name);

          // Força a atualização do cache e reconstrói o grafo com a nova subtask
          queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
        } catch (err) {
          console.error('Error creating subtask:', err);
          queryClient.invalidateQueries({ queryKey: ['clickup-graph'] });
          alert("Erro ao criar subtask. Sincronizando com ClickUp...");
        }
      }
    };

    const handleCancel = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail;
      removeTempNode(nodeId);
    };

    window.addEventListener('tempnode:commit', handleCommit);
    window.addEventListener('tempnode:cancel', handleCancel);
    return () => {
      window.removeEventListener('tempnode:commit', handleCommit);
      window.removeEventListener('tempnode:cancel', handleCancel);
    };
  }, [nodes, createTask, createList, selectedQuarter, removeTempNode, setQuarterPickerModal, queryClient]);

  // ── TAB key: insert inline creation node ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && selectedNode) {
      e.preventDefault();

      const type = selectedNode.type;
      if (type !== 'folder' && type !== 'list' && type !== 'task') return;

      // Close the detail panel so it doesn't steal focus from the temp node input
      setSelectedNode(null);

      // Ensure parent folder is expanded so the temp node is visible
      if (selectedNode.data.collapsed) {
        expandPathToNode(selectedNode.id);
        setTimeout(() => addTempNode(selectedNode.id, type as 'folder' | 'list' | 'task'), 50);
      } else {
        addTempNode(selectedNode.id, type as 'folder' | 'list' | 'task');
      }
    }
  }, [selectedNode, setSelectedNode, addTempNode, expandPathToNode]);


  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: AppNode) => {
      if (node.type === 'temp') return; // Don't select temp nodes
      setSelectedNode(node);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    // Remove any lingering temp nodes when clicking away
    const { nodes: currentNodes, removeTempNode: remove } = useGraphStore.getState();
    currentNodes.filter(n => n.type === 'temp').forEach(n => remove(n.id));
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
