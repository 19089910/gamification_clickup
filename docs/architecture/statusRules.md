
# Domain Spec: Automação de Status em Cascata (Task & Subtask)

Este documento especifica a regra de negócio central do módulo de status e automação do grafo. Ele serve como a **única fonte da verdade** para a propagação de estados no frontend (UI Otimista/Hooks), na store (Zustand) e na sincronização com o backend (API do ClickUp).

## 1. Visão Geral da Arquitetura

A automação de status opera de forma bidirecional e é regida por funções puras isoladas na camada de domínio (`domain/status/statusRules.ts`).

┌─────────────────────────────────────────────────────────┐
│              domain/status/statusRules.ts               │
│               (Regras Puras do Domínio)                 │
└────────────┬───────────────────────────────┬────────────┘
             │                               │
             ▼                               ▼
[Frontend / UI Otimista]         [Backend Sync Service]

* useTaskStatus.ts               - lib/status-sync.ts
* useSubtaskStatus.ts            - ClickUp Webhooks / API
* useGraphStore (Zustand)


## 2. Categorias de Status

Todos os status individuais do ClickUp são mapeados internamente em **3 categorias fundamentais**:

| Categoria | Exemplo de Status | Mapeamento no Domínio |
| :--- | :--- | :--- |
| **`not-started`** | `planning`, `open`, `to do` | `getInitialSubtaskStatus()` |
| **`active`** | `in progress`, `in-progress` | `getActiveSubtaskStatus()` |
| **`done`** | `complete`, `closed` | `getDoneSubtaskStatus()` |

## 3. Regras de Propagação (Gatilhos)

### 3.1. Top-Down: Task Pai ➔ Subtasks (`syncChildrenOnParentUpdate`)

Quando o status da **Task Pai** é alterado, a função `shouldUpdateSubtasksOnParentStatusChange(newStatus)` avalia se a alteração exige propagação para as filhas:

1. **Pai entra em `active` (ex: `in progress`):**
   * **Ação:** Todas as subtasks filhas que estão na categoria **`not-started`** são movidas automaticamente para o status **`active`** (`in progress`).
   * **Exceção:** Subtasks que já estão em progresso ou concluídas **não** têm seus status alterados.

2. **Pai entra em `done` (ex: `complete`):**
   * **Ação:** **Todas** as subtasks filhas que ainda não estão concluídas são movidas automaticamente para o status **`done`** (`complete`).

3. **Pai entra em `not-started` (ex: `planning`):**
   * **Ação:** Não dispara automação em cascata (as subtasks mantêm seus estados atuais).


### 3.2. Bottom-Up: Subtask ➔ Task Pai (`syncParentOnChildUpdate`)

Quando o status de uma **Subtask** é alterado:

1. **Todas as Subtasks Irmãs Concluídas (`checkComplete`):**
   * A função `checkComplete(siblingStatuses)` é avaliada com o novo status da subtask atual inserido no conjunto de irmãs.
   * **Ação:** Se **100% das subtasks filhas** estiverem na categoria `done`, a **Task Pai** é movida automaticamente para o status **`complete`**.

## 4. Contrato das Funções Puras (`statusRules.ts`)

```typescript
/** Retorna o ID do status inicial da categoria 'not-started' */
export function getInitialSubtaskStatus(): string;

/** Retorna o ID do primeiro status da categoria 'active' */
export function getActiveSubtaskStatus(): string;

/** Retorna o ID do primeiro status da categoria 'done' */
export function getDoneSubtaskStatus(): string;

/** Verifica se 100% do array de status informados pertencem à categoria 'done' */
export function checkComplete(siblingStatuses: string[]): boolean;

/** Retorna true se a transição do pai exige atualização em cascata nas subtasks */
export function shouldUpdateSubtasksOnParentStatusChange(newParentStatus: string): boolean;

```

## 5. Padrão de Identificadores (IDs)

> [!CRITICAL]
> **Atenção ao Formato de IDs na Sincronização de Estado:**
> * No payload de atualização (`updates`), o `parentId` da subtask já vem com o prefixo do nó do React Flow (ex: `'task-86e2hvrwc'`).
> * **NUNCA** adicione o prefixo `task-` manualmente se a variável já possuir o prefixo, sob risco de quebrar a busca de referências no Zustand/React Flow (`'task-task-86e2hvrwc'`).
> 
> 
