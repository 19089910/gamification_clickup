# Relatório Técnico — Arquitetura de Estado, Fluxo de Dados e Grafo Canvas

**Projeto:** Gerenciador de Projetos / Canvas React Flow

**Objetivo:** Guia arquitetural da aplicação, especificação da estrutura de tipos (`AppNode`) e ciclo de vida de mutações

**Stack Principal:** React + React Flow (@xyflow/react) + Zustand + React Query + ClickUp API

---

## 1. Visão Geral e Princípios Arquiteturais

A aplicação gerencia um grafo hierárquico complexo que reflete os dados do ClickUp (Space $\rightarrow$ Folder $\rightarrow$ List $\rightarrow$ Task $\rightarrow$ Subtask). A arquitetura foi desenhada com base em **cinco pilares fundamentais**:

1. **Fonte Única da Verdade para Renderização:** A store Zustand (`GraphStore`) é a proprietária absoluta do estado visual e posicional do grafo (`fullNodes` e `fullEdges`).
2. **Separação Rígida de Responsabilidades (Slices):** A store é modularizada em fatias bem delimitadas (`CoreSlice`, `UiSlice`, `ApiSlice`, `HierarchySlice`, `DevSlice`, `TempNodeSlice`).
3. **Fluxo Unidirecional de Dados:** A interface interage com as ações do Zustand, que atualizam otimisticamente os nós visíveis e lidam com as chamadas de I/O em background.
4. **Isolamento do React Query:** O React Query cuida exclusivamente do carregamento inicial de dados brutos e do controle de refetches/invalidação.
5. **Layout Previsível Sem Glitches:** Alterações de estado locais não reconstroem a árvore completa, preservando posições espaciais e a ordenação dos trimestres.

---

## 2. Modelo de Tipos do Grafo (`AppNode` & Subtipos)

O grafo utiliza **Discriminated Unions** para tipar os nós do React Flow com base no atributo `type`. Cada tipo de nó possui uma estrutura de dados (`data`) estritamente definida:

### 2.1. Hierarquia de Tipos (`src/types/graph.ts`)

```text
               ┌───────────────────────────────────────────────────┐
               │                      AppNode                      │
               └─────────────────────────┬─────────────────────────┘
                                         │
    ┌──────────────┬──────────────┬──────┴───────┬──────────────┬──────────────┐
    ▼              ▼              ▼              ▼              ▼              ▼
SpaceNode     FolderNode     ListNode       TaskNode       SubtaskNode    TempNode
('space')     ('folder')     ('list')       ('task')       ('subtask')    ('temp')

```

### 2.2. Mapeamento dos Dados dos Nós (`NodeData`)

* **`SpaceNodeData`**: Representa o topo da hierarquia. Armazena `spaceId`, cor e estado de colapso.
* **`FolderNodeData`**: Nó agrupador. Contém `folderId`, contadores de listas/tarefas, vínculo com o `parentId` (Space) e estado de expansão.
* **`ListNodeData`**: Nó de lista. Mapeia `listId`, vínculo com `parentId` (Folder), cor atribuída a partir de `LIST_COLORS`, e informações de trimestres (`quarters`, `primaryQuarter`).
* **`TaskNodeData`**: Entidade principal de tarefa. Contém `taskId`, vínculo com `parentId` (List), `status`, `statusColor`, `priority`, `assignees`, `tags`, e o trimestre resolvido (`quarter`).
* **`SubtaskNodeData`**: Entidade de subtarefa vinculada a uma `TaskNode` (`parentId`). Armazena `time_spent` e `checklists`.
* **`TempNodeData`**: Nó rascunho temporário no canvas. Armazena o tipo de pai que o gerou (`parentType: 'folder' | 'list' | 'task'`) e o `parentId`.

---

## 3. Arquitetura da Store Global (`GraphStore`)

A `GraphStore` unifica múltiplos domínios funcionais em uma única interface usando o padrão de fatiamento (*Slices*):

```typescript
export type GraphStore = CoreSlice &
  UiSlice &
  ApiSlice &
  HierarchySlice &
  DevSlice &
  TempNodeSlice;

```

### Divisão de Responsabilidade das Slices

* **`CoreSlice`**: Controla o estado bruto e filtrado do grafo (`fullNodes`, `fullEdges`, `nodes`, `edges`), o nó selecionado (`selectedNode`) e eventos do React Flow (`onNodesChange`, `onEdgesChange`).
* **`ApiSlice`**: Concentra a camada de mutação de dados do ClickUp (`createTask`, `createList`, `createSubtask`, `updateTask`, `updateList`, `updateNodeTags`). Realiza o dispatch HTTP e a atualização do estado visual.
* **`HierarchySlice`**: Controla o colapso e expansão visual de ramificações da árvore (`toggleNodeCollapsed`, `viewAllProjects`, `setFocusedNode`).
* **`TempNodeSlice`**: Gerencia a criação, confirmação e ciclo de vida dos nós rascunho no canvas.
* **`UiSlice`**: Gerencia a abertura da barra lateral, modais de apoio (como `quarterPickerModal`), configurações de layout e erros globais.
* **`DevSlice`**: Modos de desenvolvedor e timers integrados.

---

## 4. Fluxo Unidirecional e Ciclo de Vida de Mutações

O fluxo de dados garante que a interface responda de forma reativa e instantânea, mantendo a consistência com o ClickUp sem recarregar o grafo inteiro.

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Zustand Store (GraphStore)                   │
│         Fonte Única da Verdade para Renderização da UI          │
│                   (fullNodes, fullEdges, nodes)                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
   ┌───────────────────────────┐     ┌───────────────────────────┐
   │     React Flow Canvas     │     │      ApiSlice / I/O      │
   │    Renderização Visual    │     │      Mutações ClickUp    │
   └───────────────────────────┘     └─────────────┬─────────────┘
                                                   │
                                                   ▼
                                     ┌───────────────────────────┐
                                     │      ClickUp API          │
                                     └─────────────┬─────────────┘
                                                   │
                                      (Apenas em caso de erro)
                                                   ▼
                                     ┌───────────────────────────┐
                                     │    React Query Cache      │
                                     │    invalidateQueries()    │
                                     └───────────────────────────┘

```

### 4.1. Passo a Passo do Ciclo de Vida do `TempNode` (`commitTempNode`)

1. **Criação do Rascunho (Draft):** O usuário clica no botão "+" de um nó pai (`Folder`, `List` ou `Task`). Um nó com `type: 'temp'` é inserido em `fullNodes` apontando para o `parentId`.
2. **Confirmação na UI (`commitTempNode`):** O usuário digita o nome e confirma. O método da `TempNodeSlice` remove o `TempNode` e insere síncronamente o nó real correspondente (`TaskNode`, `ListNode` ou `SubtaskNode`) em `fullNodes` com a flag `isOptimistic: true`.
3. **Persistência HTTP (Background):** A `ApiSlice` executa a requisição assíncrona para a API do ClickUp (`createTask` / `createList`).
4. **Resolução:**
* **Sucesso:** O nó real em `fullNodes` tem seus dados atualizados com o ID definitivo retornado pelo ClickUp e `isOptimistic` passa para `false`.
* **Falha:** O nó otimista é removido de `fullNodes` (Rollback) e o React Query executa `invalidateQueries({ queryKey: ['clickup-graph'] })` para sincronizar o estado real.



### 4.2. Passo a Passo da Edição Inline (`TaskDetail`)

1. **Interação:** O usuário altera um atributo de uma tarefa (ex: status, nome ou trimestre) no painel lateral.
2. **Execução Direct Store:** O componente chama a ação da store `updateTask(taskId, updates)`.
3. **Atualização Otimista:** A `ApiSlice` atualiza diretamente os atributos do nó correspondente em `fullNodes`. A alteração reflete imediatamente na tela.
4. **Envio I/O:** A requisição HTTP é enviada ao ClickUp. Em caso de falha, o valor original é restaurado em `fullNodes`.

---

## 5. Matriz de Responsabilidades

| Camada / Módulo | Responsabilidade Principal | O que NÃO deve fazer |
| --- | --- | --- |
| **`TempNode.tsx`** | Capturar entrada do usuário e invocar as ações do Zustand (`commitTempNode`). | Emitir eventos globais no DOM, invocar HTTP diretamente ou manipular o React Query. |
| **`TempNodeSlice`** | Gerenciar a transição de estados dos rascunhos e conversão em nós definitivos. | Executar requisições assíncronas HTTP ou tratar layout do DOM. |
| **`ApiSlice`** | Centralizar e executar chamadas HTTP à API do ClickUp e aplicar atualizações em `fullNodes`. | Gerenciar a abertura de modais ou renderizar JSX. |
| **`CoreSlice`** | Manter a estrutura de dados `fullNodes` e `fullEdges` do grafo e o nó ativo. | Lidar diretamente com lógica específica da API do ClickUp. |
| **React Flow Canvas** | Renderizar os nós `AppNode` e arestas na tela e gerenciar zoom/pan. | Controlar regras de negócio, persistência de dados ou mutações de estado. |
| **React Query** | Fetch do Grafo inicial e invalidação de emergência em cenários de erro. | Ser manipulado manualmente em tempo de execução para atuar como fonte visual. |

---

## 6. Guia de Implementação e Boas Práticas

* **Não force refetches desnecessários:** Utilize as atualizações locais do Zustand. Dispare `queryClient.invalidateQueries` apenas se a API retornar erro ou no recarregamento completo da página.
* **Preserve a estrutura de tipos:** Toda adição de novos dados aos nós deve ser refletida nas interfaces em `src/types/graph.ts` (ex: `TaskNodeData`, `ListNodeData`).
* **Mutação de array imutável:** Ao alterar `fullNodes` dentro das slices do Zustand, utilize métodos imutáveis (`map`, `filter` ou cópias de array) para garantir a reatividade do React Flow.