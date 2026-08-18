// Mapeamento estático dos nós
import { NodeTypes } from "@xyflow/react";
import SpaceNode from "./nodes/SpaceNode";
import FolderNode from "./nodes/FolderNode";
import ListNode from "./nodes/ListNode";
import TaskNode from "./nodes/TaskNode";
import TempNode from "./nodes/TempNode";
import SubtaskNode from "./nodes/SubtaskNode";

export const nodeTypes: NodeTypes = {
    space: SpaceNode,
    folder: FolderNode,
    list: ListNode,
    task: TaskNode,
    temp: TempNode as any,
    subtask: SubtaskNode,
};