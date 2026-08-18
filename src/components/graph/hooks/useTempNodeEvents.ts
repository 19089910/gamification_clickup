// Gerencia os CustomEvents (commit/cancel)
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGraphStore } from "@/store/graphStore";
import { type Season, SEASON_MAP } from "@/config/quarters";
import { GraphApiResponse } from "@/hooks/useClickUpData";

export function useTempNodeEvents() {
    const queryClient = useQueryClient();
    const { createTask, createSubtask, selectedQuarter, removeTempNode, setQuarterPickerModal } =
        useGraphStore();

    useEffect(() => {
        const handleCommit = async (e: Event) => {
            const { nodeId, name } = (e as CustomEvent).detail;
            const state = useGraphStore.getState();
            const tempNode = state.nodes.find((n) => n.id === nodeId);
            if (!tempNode || tempNode.type !== "temp") return;

            const nodeParentId = tempNode.data.parentId as string;
            const parentType = tempNode.data.parentType as string;
            const parentNode = state.fullNodes.find((n) => n.id === nodeParentId);

            const clickUpId =
                parentType === "folder"
                    ? ((parentNode?.data as any)?.folderId as string)
                    : parentType === "task"
                        ? ((parentNode?.data as any)?.taskId as string) || parentNode?.id.replace("task-", "")
                        : ((parentNode?.data as any)?.listId as string);

            if (!clickUpId) {
                console.error("Could not resolve ClickUp ID for parent node", nodeParentId);
                removeTempNode(nodeId);
                return;
            }

            removeTempNode(nodeId);

            if (parentType === "list") {
                try {
                    const parentListNode = state.fullNodes.find((n) => n.id === nodeParentId);
                    const listPrimaryQuarter = (parentListNode?.data as any)?.primaryQuarter as Season | null;

                    const quarterToUse =
                        listPrimaryQuarter ??
                        (selectedQuarter && selectedQuarter in SEASON_MAP ? (selectedQuarter as Season) : null);

                    const newTask = await createTask(clickUpId, name, quarterToUse);

                    queryClient.setQueryData(
                        ["clickup-graph", state.spaceId],
                        (oldData: GraphApiResponse | undefined) => {
                            if (!oldData) return oldData;
                            const newListTasksMap = { ...oldData.listTasksMap };
                            const listTasks = newListTasksMap[clickUpId] || [];
                            newListTasksMap[clickUpId] = [...listTasks, newTask];
                            return { ...oldData, listTasksMap: newListTasksMap };
                        }
                    );
                } catch (err) {
                    console.error("Error creating task:", err);
                    queryClient.invalidateQueries({ queryKey: ["clickup-graph"] });
                    alert("Erro ao criar tarefa. Sincronizando com ClickUp...");
                }
            } else if (parentType === "folder") {
                setQuarterPickerModal({
                    isOpen: true,
                    listName: name,
                    folderId: clickUpId,
                    tempNodeId: nodeId,
                });
            } else if (parentType === "task") {
                try {
                    const cleanTaskId = clickUpId.replace("task-", "");
                    await createSubtask(cleanTaskId, name);
                    queryClient.invalidateQueries({ queryKey: ["clickup-graph"] });
                } catch (err) {
                    console.error("Error creating subtask:", err);
                    queryClient.invalidateQueries({ queryKey: ["clickup-graph"] });
                    alert("Erro ao criar subtask. Sincronizando com ClickUp...");
                }
            }
        };

        const handleCancel = (e: Event) => {
            const { nodeId } = (e as CustomEvent).detail;
            removeTempNode(nodeId);
        };

        window.addEventListener("tempnode:commit", handleCommit);
        window.addEventListener("tempnode:cancel", handleCancel);
        return () => {
            window.removeEventListener("tempnode:commit", handleCommit);
            window.removeEventListener("tempnode:cancel", handleCancel);
        };
    }, [createTask, createSubtask, selectedQuarter, removeTempNode, setQuarterPickerModal, queryClient]);
}