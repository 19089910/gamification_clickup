# Relatório Técnico — Refatoração da Arquitetura de Estado e Sincronização do Canvas

**Projeto:** Gerenciador de Projetos / Canvas React Flow

**Objetivo:** Eliminação de acoplamento, glitches de posicionamento, arquivos/serviços órfãos e inconsistências de estado

**Arquitetura principal:** React + React Flow + Zustand + React Query + ClickUp API

---

## 1. Objetivo da Refatoração

Este relatório documenta a revisão do plano de arquitetura para a simplificação do fluxo de dados e mutação do grafo no canvas.

A principal decisão arquitetural é a **adoção estrita do Fluxo A**: o **Zustand (`GraphStore`) assume a responsabilidade como fonte única da verdade para a interface e para o estado visual do grafo (`fullNodes` e `fullEdges`)**, enquanto o React Query permanece estritamente como mecanismo de fetch inicial, invalidação e revalidação de dados em plano de fundo.

Com essa definição:

* **Elimina-se o serviço `graphCacheSync**`: Não haverá manipulador atômico paralelo no cache do React Query, evitando race conditions, divergência entre o grafo transformado e o JSON bruto da API, e código redundante.
* **Remove-se o `EditTaskModal` e o estado `editTaskModal**`: A edição de tarefas passa a ser realizada 100% inline via `TaskDetail` (painel lateral) utilizando as ações da `ApiSlice` no Zustand.
* **Preserva-se o layout visual**: Operações locais e mutações otimistas acontecem diretamente na Store do Zustand, evitando reconstruções desnecessárias via `buildGraph()` e descartando o refetch a menos que ocorram erros HTTP.

---

## 2. Problemas da Arquitetura Anterior e Aprendizados

A tentativa anterior de implementar o `graphCacheSync` gerava duas fontes de verdade competindo entre si:

```text
               ┌──────────────────────────────┐
               │    Operação do Usuário       │
               └──────────────┬───────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
  ┌──────────────────────────┐  ┌──────────────────────────┐
  │      Zustand Store       │  │      graphCacheSync      │
  │  (fullNodes / fullEdges) │  │   (React Query Cache)    │
  └────────────┬─────────────┘  └────────────┬─────────────┘
               │                             │
               └──────────────┬──────────────┘
                              ▼
                     [ Race Conditions & ]
                     [ Layout Redundant  ]

```

### Gargalos Identificados:

* **Sincronização Dupla Inútil:** O React Query armazenava a resposta bruta do ClickUp (`GraphApiResponse`), que precisava ser re-transformada para nós do React Flow, enquanto o Zustand já mantinha os nós no estado (`fullNodes`). Sincronizar o cache do React Query em paralelo gerava re-renders duplicados e inconsistências temporárias.
* **Eventos Globais Legados:** O uso de `window.dispatchEvent("tempnode:commit")` criava dependências ocultas e dificultava o rastreamento do ciclo de vida dos nós temporários.
* **Modais Órfãos:** Telas como o `EditTaskModal` acumulavam estados no Zustand sem que existisse ponto de entrada real na interface, gerando código morto.

---

## 3. Arquitetura Proposta: Fluxo A (Zustand-Centric)

A nova arquitetura estabelece um fluxo unidirecional rígido e direto.

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

---

## 4. Estrutura e Ciclo de Vida das Operações

### 4.1. Ciclo de Vida do `TempNode` (`commitTempNode`)

O ciclo de criação passa a ser gerenciado nativamente dentro da `tempNodeSlice.ts` no Zustand:

```text
Draft (TempNode no Canvas)
  │
  ▼
commitTempNode() (Zustand)
  │
  ▼
Conversão Otimista em Node Real (isOptimistic: true em fullNodes)
  │
  ├──────────────────────────────────────────┐
  ▼                                          ▼
Chamada de API em Background (ApiSlice)    UI / Canvas atualizado sem glitch
  │
  ├──────── Sucesso ──────► Finaliza estado otimista (isOptimistic: false)
  │
  └──────── Falha ────────► Rollback (Remove de fullNodes + invalidateQueries)

```

### 4.2. Edição de Tarefas e Nós Inline

As edições (status, nome, quadrimestre) no `TaskDetail.tsx` chamam diretamente a `ApiSlice` do Zustand:

```typescript
// Exemplo no TaskDetail.tsx:
const updateTask = useGraphStore((state) => state.updateTask);

const handleStatusChange = async (newStatus: string) => {
  // Update otimista síncrono em fullNodes e envio HTTP
  await updateTask(taskId, { status: newStatus });
};

```

---

## 5. Remoção de Código Morto e Limpeza do Projeto

A refatoração contempla a remoção explícita das seguintes estruturas:

1. **`src/lib/cache/graphCacheSync.ts`**: Arquivo completamente removido. O React Query não faz mais mutações manuais de cache via `setQueryData`.
2. **`src/components/ui/EditTaskModal.tsx`**: Componente removido por redundância com a edição inline em `TaskDetail.tsx`.
3. **`UiSlice` no Zustand**: Removidos os estados `editTaskModal` e `setEditTaskModal`.

### Interface Limpa do `UiSlice` (`src/types/graph.ts`):

```typescript
export interface UiSlice {
  isLoading: boolean;
  error: string | null;
  isSidebarOpen: boolean;
  selectedQuarter: Quarter | null;
  layoutSettings: LayoutSettings;
  quarterPickerModal: {
    isOpen: boolean;
    listName: string;
    folderId: string;
    tempNodeId: string;
  };
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setQuarter: (q: Quarter | null) => void;
  updateLayoutSettings: (settings: Partial<LayoutSettings>) => void;
  setQuarterPickerModal: (data: Partial<UiSlice['quarterPickerModal']>) => void;
}

```

---

## 6. Matriz de Responsabilidades Atualizada

| Camada | Responsabilidade | O que NÃO deve fazer |
| --- | --- | --- |
| **`TempNode.tsx`** | Capturar o input e disparar `commitTempNode()`. | Usar `window.dispatchEvent`, chamar HTTP ou React Query. |
| **`tempNodeSlice.ts`** | Gerenciar estado temporário e conversão síncrona em nó real. | Tratar da renderização direta ou fazer chamadas HTTP. |
| **Zustand (`GraphStore`)** | Manter `fullNodes`, `fullEdges`, selecionar nós e acionar a `ApiSlice`. | Atuar como cache cru de API JSON. |
| **React Flow** | Renderizar os nós e edges fornecidos pelo Zustand. | Controlar persistência, chamadas HTTP ou regra de negócio. |
| **`mutations.ts`** | Executar as chamadas I/O HTTP puras para a API do ClickUp. | Tentar manipular o estado do React Flow ou alterar o Zustand. |
| **React Query** | Fetch inicial dos dados do grafo e `invalidateQueries` para recuperação de erros. | Ser a fonte principal de renderização do grafo em cada mutação local. |

---

## 7. Critérios de Validação da Refatoração

* [ ] Arquivo `graphCacheSync.ts` e referências completamente removidos.
* [ ] Componente e referências ao `EditTaskModal` eliminados.
* [ ] `window.dispatchEvent("tempnode:commit")` e `window.addEventListener` substituídos pelo método `commitTempNode()` no Zustand.
* [ ] Ações na UI atualizam a árvore `fullNodes` instantaneamente de forma otimista.
* [ ] Mutações sem erro na API **não** provocam reconstrução total do grafo via `buildGraph()`, preservando a posição e ordenação no canvas.
* [ ] Falhas nas requisições disparam `invalidateQueries`, garantindo o rollback confiável dos dados direto do ClickUp.