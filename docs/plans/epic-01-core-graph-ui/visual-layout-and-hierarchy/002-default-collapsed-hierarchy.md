# [Epic-01] Plan: Lógica de Colapso Hierárquico Padrão e Visibilidade Dinâmica

**O que é:** Implementação do comportamento de colapso/expansão dos ramos do mapa mental. Define estados padrão de exibição baseados no tipo do nó (com Pastas colapsadas por padrão) e aplica uma travessia em árvore para ocultar automaticamente descendentes e arestas filhas de nós colapsados.

**Identificador:** `002-default-collapsed-hierarchy`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média-Alta  

---

## 1. O que a Funcionalidade Faz (Comportamento & UX)

### 1.1. Regras de Estado Padrão por Tipo (`getDefaultCollapsed`)
Para manter o mapa mental limpo ao carregar e evitar sobrecarga cognitiva, cada tipo de entidade possui um estado padrão de colapso na inicialização:

| Tipo do Nó | Estado Padrão (`collapsed`) | Comportamento na Carga Inicial |
| :--- | :--- | :--- |
| **Space** | `false` (Expandido) | Exibe sempre o nó raiz do espaço. |
| **Folder** | `true` (**Colapsado**) | Pastas nascem colapsadas, ocultando suas Listas e Tarefas. |
| **List** | `false` (Expandido) | Ao expandir uma pasta, as listas vêm abertas por padrão. |
| **Task** | `false` (Expandido) | Ao expandir uma lista, as tarefas vêm abertas por padrão. |

### 1.2. Regra de Visibilidade e Ocultação de Descendentes (`getVisibleGraph`)
* **Propagação em Cascata:** Se um nó pai é marcado como `collapsed: true`, **todos os seus descendentes diretos e indiretos** (Listas, Tarefas, Subtarefas) e suas respectivas arestas (`edges`) são removidos do array visível retornado ao React Flow.
* **Trava de Interação:** O botão de alternância (`+` / `-`) só é exibido nos cards que possuem arestas de saída (*outgoing edges*), isto é, nós que possuem efetivamente filhos cadastrados.

---

## 2. Fluxo de Execução e Algoritmo de Travessia

```text
[Ação do Usuário: Clique + / -] ──► [Zustand: toggleNodeCollapsed(nodeId)]
                                                  │
                                                  ▼
                                      [Lib: getVisibleGraph]
                                (Navega em BFS/DFS a partir do Space)
                                                  │
                                    ┌─────────────┴─────────────┐
                           (Nó Expandido?)             (Nó Colapsado?)
                                  │                           │
                                  ▼                           ▼
                        (Inclui e continua)          (Inclui o nó Pai, mas
                                                     INTERROMPE travessia
                                                     nos filhos/descendentes)
                                                  │
                                                  ▼
                                     [Recálculo do Dagre Layout]
                                (Re-posiciona os nós visíveis na tela)

```

---

## 3. Arquivos Envolvidos e Especificação Técnica

### [Types] Definições do Grafo

* **`src/types/graph.ts` [MODIFY]:** Adição da propriedade obrigatória `collapsed: boolean` às interfaces `SpaceNodeData`, `FolderNodeData`, `ListNodeData` e `TaskNodeData`.

### [Logic] Transformador e Utilitários de Visibilidade

* **`src/lib/graph-transformer.ts` [MODIFY]:**
* Implementação da função `getDefaultCollapsed(type: NodeType)` para atribuir o estado correto durante a conversão dos dados do ClickUp.


* **`src/lib/graph-utils.ts` [NEW]:**
* Implementação da função `getVisibleGraph(nodes, edges)`:
* Inicia a travessia a partir dos nós raízes (`Space`).
* Ao encontrar um nó com `collapsed: true`, interrompe a descida por aquele ramo.
* Retorna apenas o subconjunto de nós e arestas que devem ser renderizados no canvas.





### [Store] Gerenciamento de Estado Global

* **`src/store/graphStore.ts` [MODIFY]:**
* Action `toggleNodeCollapsed(nodeId: string)` que inverte a propriedade `collapsed` do nó no array original `fullNodes` e dispara o recálculo do layout visual.



### [UI] Componentes visuais

* **`src/components/graph/nodes/SpaceNode.tsx` [MODIFY]**
* **`src/components/graph/nodes/FolderNode.tsx` [MODIFY]**
* **`src/components/graph/nodes/ListNode.tsx` [MODIFY]**
* Adição do botão visual de alternância (`+` para expandir / `-` para colapsar) condicionado à existência de filhos.



---

## ✅ Plano de Verificação e Testes Manuais

* [x] **Carga Inicial:** Carregar o mapa e verificar se apenas o *Space* e as *Folders* estão visíveis (Pastas fechadas).
* [x] **Expansão de Pasta:** Clicar no botão `+` de uma *Folder* e confirmar o surgimento das *Lists* pertencentes a ela.
* [x] **Expansão de Lista:** Clicar no botão `+` de uma *List* e confirmar que as *Tasks* filhas aparecem.
* [x] **Colapso em Cascata:** Clicar no botão `-` de uma *Folder* anteriormente aberta e confirmar que tanto as *Lists* quanto as *Tasks* daquele ramo desaparecem simultaneamente do canvas.
* [x] **Recálculo do Dagre:** Garantir que o mapa reajuste o posicionamento e o espaçamento dos nós restantes de forma limpa ao expandir ou colapsar ramos.
