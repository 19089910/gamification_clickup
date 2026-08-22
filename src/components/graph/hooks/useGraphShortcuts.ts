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
    const fullNodes = useGraphStore((state) => state.fullNodes);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key !== "Tab" || !selectedNode) return;

            const parentType = selectedNode.type;

            if (!parentType || !isTempNodeParent(parentType)) {
                return;
            }

            e.preventDefault();

            // Busca o nó real com a posição atualizada no canvas
            const actualParent = fullNodes.find((n) => n.id === selectedNode.id) || selectedNode;

            if (actualParent.data.collapsed) {
                toggleNodeCollapsed(actualParent.id);
            }

            // Remove a seleção e adiciona o nó temporário no pai correto
            setSelectedNode(null);
            addTempNode(actualParent.id, parentType);
        },
        [selectedNode, setSelectedNode, addTempNode, toggleNodeCollapsed, fullNodes]
    );

    return { handleKeyDown };
}