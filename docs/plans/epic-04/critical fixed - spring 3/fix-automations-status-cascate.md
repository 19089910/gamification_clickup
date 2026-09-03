# [Epic-04] Melhorias Contínuas (Enhancements)

## Fix: Correção automação de status em cascata (tarefas e subtarefas)

**O que é:** Consertar o gatilho de progresso em cascata (Pai ➔ Filhos) e o fechamento automático da tarefa pai ao atingir 100% de conclusão das subtasks (Filho ➔ Pai), garantindo atualização imediata na UI do React Flow via estado otimista e sincronização com o backend.

**Identificador:** `fix_enhancement_cascade_automation`

**Status:** Concluído / Em Validação

**Complexidade:** Média-Alta (Refatoração de Domínio, Hooks e Zustand Store)

---

### 🛠️ Solução Implementada

1. **Centralização das Regras de Domínio (`src/domain/status/statusRules.ts`):**
* Isolamento de funções puras desacopladas de frameworks (`shouldUpdateSubtasksOnParentStatusChange`, `checkComplete`, `getActiveSubtaskStatus`, `getDoneSubtaskStatus`).
* **Top-Down (Pai ➔ Filhos):** Quando o Pai entra em `active`, move subtasks em `not-started` para o status ativo. Quando o Pai vai para `done`, move todas as subtasks pendentes para `done`.
* **Bottom-Up (Filho ➔ Pai):** Ao alterar uma subtask, o sistema avalia as irmãs via `checkComplete`. Se 100% das subtasks estiverem concluídas, o Pai é marcado automaticamente como `complete`.


2. **Atualização Otimista no Zustand (`src/store/slices/coreSlice.ts`):**
* Execução do método `updateNodesStatus(updates)` centralizado na store.
* **Garantia de Re-render no React Flow:** Atualização imutável do array `fullNodes` e quebra explícita de referência no objeto `data` dos nós afetados.
* **Correção de ID Matching:** Garantia de que o `parentId` recebido não duplique prefixos (ex: utilizando `'task-86e2hvrwc'` diretamente sem concatenação `task-task-`).


3. **Sincronização de Cache & Persistência Backend (`useTaskStatus` & `useSubtaskStatus`):**
* Aplicação síncrona no cache do React Query via `queryClient.setQueryData` usando a `GraphSyncService`.
* Disparo assíncrono das mutações da API do ClickUp (`updateTask` / `syncChildrenOnParentUpdate`).
* Lógica de **Rollback**: Em caso de falha na API, o estado do React Query e da store é restaurado para o snapshot `previousData` com invalidação para ressincronizar.



---

### 🎯 Onde foi alterado (Contexto Técnico)

* **Camada de Domínio:** `src/domain/status/statusRules.ts`
* **Camada de Sincronização Backend:** `src/lib/status-sync.ts`
* **Hooks de UI:** `src/hooks/useTaskStatus.ts` e `src/hooks/useSubtaskStatus.ts`
* **Store Zustand:** `src/store/slices/coreSlice.ts` (`updateNodesStatus`)

---

### ✅ Critérios de Aceitação

* [x] **Automação Top-Down:** A alteração de status do nó Pai propaga instantaneamente os novos status para as subtasks elegíveis no React Flow.
* [x] **Automação Bottom-Up:** Quando a última subtask pendente é concluída (100%), o nó Pai transiciona automaticamente para `complete`.
* [x] **Re-render Imediato no Canvas:** O mapa visual reage no mesmo frame sem necessidade de *refetch* ou recarregamento de página.
* [x] **Tratamento de Erros e Rollback:** Falhas na API revertem o estado do grafo para os valores anteriores ao clique.
* [x] **Integridade de IDs:** Resolução do bug de referências nulas por inconsistência nos identificadores de nós.