# [Epic-01] Plan & Walkthrough: Fluxo de Criação Visual de Tarefas

**O que é:** Transformação do mapa mental em um editor visual interativo, permitindo a criação de tarefas diretamente a partir dos nós do React Flow (`ListNode`) sincronizados em tempo real com o ClickUp.

**Identificador:** `001-create-task-flow`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média  

---

## 1. Modificações na Arquitetura & API

### ⚡ Backend & Endpoints
* **Serviço ClickUp (`src/lib/clickup.ts`):**
  * Implementação da função `createTask` com suporte a mapeamento de Custom Fields.
  * Mapeamento do campo customizado **"Trimestres"** (ID: `8290f74e-4241-4eac-af4a-08018ecbbffa`) convertendo opções de `Q1` a `Q4` para seus respectivos `option_id`s no ClickUp.
* **Rota API REST (`src/app/api/clickup/tasks/route.ts`):**
  * Criação do endpoint `POST` para tratar com segurança as requisições enviadas pelo frontend.

---

## 2. Interface & Experiência do Usuário (UX)

### 🎨 Frontend & Canvas React Flow
* **Estado Global (Zustand Store):**
  * Centralização da action `createTask` no slice de API com gerenciamento de estados de carregamento (`isLoading`).
* **Melhorias no `ListNode` (`src/components/graph/nodes/ListNode.tsx`):**
  * Adição de um botão `+` discreto exibido via `:hover` no canto superior direito do nó.
  * Integração do fluxo de criação via digitação direta/prompt.
* **Interação no Canvas (`src/components/graph/GraphCanvas.tsx`):**
  * Suporte ao evento de **Duplo Clique** (`onNodeDoubleClick`) em qualquer nó do tipo `list` para iniciar a criação.
  * Sincronização automática via Invalidação do React Query (`invalidateQueries`) para re-renderizar o mapa imediatamente após a confirmação da API.

---

## 3. Guia de Testes e Validação Manual

1. **Atalho via Duplo Clique:** Abra o mapa e dê um duplo clique sobre qualquer nó do tipo **List** (faixa verde).
2. **Botão de Adição (`+`):** Passe o ponteiro do mouse sobre o nó da lista e clique no botão `+` no canto superior.
3. **Atribuição e Nome:** Insira o nome da tarefa na caixa de entrada/prompt.
4. **Sincronização:** Verifique se a tarefa foi criada no workspace do ClickUp contendo a tag do trimestre atual (`Quarter`) e se o novo nó surge automaticamente no canvas.

---

## ✅ Checklist de Implementação

- [x] Implementar `createTask` em `src/lib/clickup.ts` com suporte a custom fields (`Trimestres`).
- [x] Criar o endpoint REST em `src/app/api/clickup/tasks/route.ts`.
- [x] Adicionar action e estado `createTask` em `src/store/graphStore.ts`.
- [x] Integrar botão de ação `+` e UI de criação no `ListNode.tsx`.
- [x] Adicionar o handler `onNodeDoubleClick` no `GraphCanvas.tsx`.
- [x] Validar persistência no ClickUp e invalidação de cache no React Query.

---

> [!TIP]
> Este fluxo estabeleceu a base do "Modo Editor Visual". A arquitetura implementada aqui permite a expansão para a criação de Listas, Folders e remoção direta de nós pelo mapa mental.