import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGraphStore } from '@/store/graphStore';
import { AppNode, SubtaskNodeData } from '@/types/graph';
import { toggleTimerMutation } from '@/lib/clickup/mutations';

export function useSubtaskTimer(node: AppNode) {
    const subtask = node.data as SubtaskNodeData;
    const activeTimerTaskId = useGraphStore((s) => s.activeTimerTaskId);
    const additionalMs = useGraphStore((s) => s.additionalMs);
    const timerBaseMs = useGraphStore((s) => s.timerBaseMs);
    const startTimer = useGraphStore((s) => s.startTimer);
    const stopTimer = useGraphStore((s) => s.stopTimer);

    const queryClient = useQueryClient();
    const [isSavingTimer, setIsSavingTimer] = useState(false);
    const isTimerActive = activeTimerTaskId === subtask.taskId;

    const handleToggleTimer = async () => {
        if (isSavingTimer) return;
        setIsSavingTimer(true);
        try {
            if (!isTimerActive) {
                startTimer(subtask.taskId as string, (subtask.time_spent as number) ?? 0);
                await toggleTimerMutation(subtask.taskId, 'start');
            } else {
                await toggleTimerMutation(subtask.taskId, 'stop');
                stopTimer();
                await queryClient.invalidateQueries({
                    queryKey: ['clickup-graph', useGraphStore.getState().spaceId],
                });
            }
        } catch (err) {
            if (!isTimerActive) stopTimer();
            else startTimer(subtask.taskId as string);
            console.error('Erro ao sincronizar cronômetro:', err);
        } finally {
            setIsSavingTimer(false);
        }
    };

    return {
        isTimerActive,
        isSavingTimer,
        handleToggleTimer,
        additionalMs,
        timerBaseMs,
    };
}