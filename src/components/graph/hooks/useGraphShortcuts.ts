// Gerencia atalho de teclado (Tab)
import { useCallback } from "react";
import { useGraphStore } from "@/store/graphStore";

export function useGraphShortcuts() {
    const { selectedNode, setSelectedNode, addTempNode, expandPathToNode } = useGraphStore();

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Tab" && selectedNode) {
                e.preventDefault();

                const type = selectedNode.type;
                if (type !== "folder" && type !== "list" && type !== "task") return;

                setSelectedNode(null);

                if (selectedNode.data.collapsed) {
                    expandPathToNode(selectedNode.id);
                    setTimeout(() => addTempNode(selectedNode.id, type as "folder" | "list" | "task"), 50);
                } else {
                    addTempNode(selectedNode.id, type as "folder" | "list" | "task");
                }
            }
        },
        [selectedNode, setSelectedNode, addTempNode, expandPathToNode]
    );

    return { handleKeyDown };
}