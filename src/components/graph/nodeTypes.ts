// Mapeamento estático dos nós
import { NodeTypes } from "@xyflow/react";
import SpaceNode from "./nodes/SpaceNode";
import FolderNode from "./nodes/FolderNode";
import ListNode from "./nodes/ListNode";
import TaskNode from "./nodes/TaskNode";
import SubtaskNode from "./nodes/SubtaskNode";
import TempNode from "./nodes/TempNode";


export const nodeTypes: NodeTypes = {
    space: SpaceNode,
    folder: FolderNode,
    list: ListNode,
    task: TaskNode,
    subtask: SubtaskNode,
    temp: TempNode as any,
};