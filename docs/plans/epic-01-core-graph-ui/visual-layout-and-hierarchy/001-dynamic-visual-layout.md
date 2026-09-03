# [Epic-01] Plan: Layout Visual Dinâmico, Destaque Temporal (Quarters) e Ajustes de Tipagem

**O que é:** Atualização que transforma o mapa mental em uma ferramenta de gestão visual interativa e adaptativa. Introduz o conceito de "Foco Temporal" por Trimestres (Q1-Q4) com opacidade/grayscale para itens inativos, transição de cores no fundo do canvas, botão de criação rápida no `ListNode` e tipagem estrita no transformador do grafo.

**Identificador:** `001-dynamic-visual-layout`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média-Alta  

---

## 1. O que a Funcionalidade Faz (Comportamento & UX)

### 1.1. Sistema de Foco Temporal por Trimestres (Quarterly Highlights)
* **Detecção Automática de Trimestre:** Ao carregar a aplicação, o sistema identifica a data atual e define automaticamente o trimestre ativo (`Q1`, `Q2`, `Q3` ou `Q4`).
* **Efeito Visual "Focus & Dim":**
  * **Nós do Trimestre Ativo (`active`):** Exibidos com cores vibrantes e destaque visual.
  * **Nós de Outros Trimestres (`inactive`):** Ficam esmaecidos com efeito escala de cinza e opacidade reduzida (`opacity: 0.4`), reduzindo a carga cognitiva ao focar no ciclo de negócios atual.
* **Sincronização Global:** O filtro selecionado no Topbar atualiza o estado global `selectedQuarter` no Zustand e re-computa o estado de todos os nós do mapa em tempo real.

### 1.2. Ambiente Visual Dinâmico (Mood Colors)
* O fundo da página do mapa (`map-page`) altera suavemente a sua cor de fundo via transições CSS conforme o trimestre selecionado, refletindo o "clima" do ciclo:
  * **Q1 (Deep Sea):** `#0f172a`
  * **Q2 (Growth Green):** `#052e16`
  * **Q3 (Expansion Orange):** `#3f1d0b`
  * **Q4 (Royal Closure):** `#2e1065`

### 1.3. Segurança de Tipos no Transformador (`graph-transformer.ts`)
* Eliminação de erros de TypeScript e garantia de conformidade com a discriminated union `AppNode`.
* Garantia de inclusão das propriedades obrigatórias (`spaceId`, `folderId`, `listId`) e cálculo automático de `taskCount` em listas e pastas.

### 1.4. Criação Direta de Tarefas no `ListNode`
* Inclusão de um botão visual `+` diretamente nos cards de listas para criação de tarefas sem necessidade de navegar para modais externos, seguido de invalidação de cache via React Query para atualização do mapa.

---

## 2. Fluxo de Dados e Estado Global

```text
[Data Atual / Topbar Selector] ──► [Zustand: selectedQuarter]
                                          │
                                          ▼
                         [transformClickUpToGraph]
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
           [Calcula NodeState]                      [Aplica Fundo do Canvas]
       ('active' vs 'inactive')                       (QUARTER_BG Mapping)
                     │
                     ▼
         [Render nos Card Nodes]
   (Applies opacity: 0.4 / grayscale)

```

## 3. Arquivos Envolvidos e Modificações Tecnológicas

### Lógica & Estado

* **`src/store/graphStore.ts` [MODIFY]:** Adição do estado `selectedQuarter` e da lógica para `createTask`.
* **`src/lib/graph-transformer.ts` [MODIFY]:**
* Implementação de `getNodeState`, `getTaskQuarter` e `cleanListName`.
* Ajuste de tipagem para atender a discriminated union `AppNode` com `taskCount` e IDs de hierarquia.



### Componentes de UI

* **`src/components/graph/nodes/ListNode.tsx` [MODIFY]:** Inclusão do botão `+` de adição rápida e aplicação dos estilos do estado do nó (`getNodeStyle`).
* **`src/components/graph/nodes/TaskNode.tsx` [MODIFY]:** Aplicação dos estilos de filtragem e esmaecimento por trimestre.
* **`src/app/map/page.tsx` [MODIFY]:** Integração do seletor de trimestres na barra superior e container com fundo dinâmico.

## ✅ Checklist de Implementação e Aceite

* [x] Correção de erros de TypeScript em `graph-transformer.ts` (propriedades `spaceId`, `folderId`, `listId`, `taskCount`).
* [x] Lógica de estado do nó baseada no trimestre (`NodeState` = `'active'` | `'inactive'`).
* [x] Auto-seleção do trimestre corrente (`getCurrentQuarter()`) ao inicializar o Zustand.
* [x] Mapeamento de cores de fundo `QUARTER_BG` e transições CSS suaves na página do mapa.
* [x] Aplicação de filtros visuais (grayscale/opacidade) no `ListNode` e `TaskNode`.
* [x] Botão `+` funcional no `ListNode` integrado com a API `/api/clickup/tasks` e invalidação via `useQueryClient`.

