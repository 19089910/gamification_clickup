import { useCallback } from "react";
import { useGraphStore } from "@/store/graphStore";

const TEMP_NODE_PARENT_TYPES = ["folder", "list", "task"] as const;
type TempNodeParentType = typeof TEMP_NODE_PARENT_TYPES[number];

function isTempNodeParent(type: string): type is TempNodeParentType {
    return (TEMP_NODE_PARENT_TYPES as readonly string[]).includes(type);
}

export function useGraphShortcuts() {
    const selectedNode = useGraphStore((state) => state.selectedNode);
    const setSelectedNode = useGraphStore((state) => state.setSelectedNode);
    const addTempNode = useGraphStore((state) => state.addTempNode);
    const toggleNodeCollapsed = useGraphStore((state) => state.toggleNodeCollapsed);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key !== "Tab" || !selectedNode) return;

            const parentType = selectedNode.type;

            // Valida se o nó selecionado aceita nós filhos temporários
            if (!parentType || !isTempNodeParent(parentType)) {
                return;
            }

            e.preventDefault();

            // 1. Se o pai está colapsado, expande ele primeiro para o tempNode ficar visível
            if (selectedNode.data.collapsed) {
                toggleNodeCollapsed(selectedNode.id, parentType);
            }

            // 2. Remove a seleção atual
            setSelectedNode(null);

            // 3. Adiciona o nó temporário apontando para o pai
            addTempNode(selectedNode.id, parentType);
        },
        [selectedNode, setSelectedNode, addTempNode, toggleNodeCollapsed]
    );

    return { handleKeyDown };
}