import { getCategoryByStatus } from '@/config/status';
import { AppNode, SubtaskNodeData } from '@/types/graph';

export interface StatusEvaluationResult {
    allSiblingsFeito: boolean;
    newSubtaskCategory: ReturnType<typeof getCategoryByStatus>;
}

/**
 * Evaluates the effect of a subtask's status change on its sibling tasks.
 */
export function evaluateSubtaskStatusChange(
    subtaskId: string,
    parentId: string,
    newStatus: string,
    fullNodes: AppNode[]
): StatusEvaluationResult {
    const newSubtaskCategory = getCategoryByStatus(newStatus);

    const siblingNodes = fullNodes.filter(
        (n) => n.type === 'subtask' && (n.data as SubtaskNodeData).parentId === parentId
    );

    const allSiblingsFeito = siblingNodes.every((n) => {
        const currentStatus =
            n.id === `subtask-${subtaskId}`
                ? newStatus
                : (n.data as SubtaskNodeData).status;

        return getCategoryByStatus(currentStatus) === 'Feito';
    });

    return {
        allSiblingsFeito,
        newSubtaskCategory,
    };
}