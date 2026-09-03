# [Epic-01] Plan: Redesign de UX — Edição Inline e Criação Sequencial via TAB

**O que é:** Reformulação completa da experiência de edição e criação de nós no mapa mental. Elimina modais bloqueantes e o fluxo antigo de duplo clique, introduzindo edição inline no painel lateral (`NodeDetailPanel`), formulário ghost no canvas (`TempNode`) disparado via tecla `TAB`, e o seletor contextual de trimestre (`QuarterPickerPopover`).

**Identificador:** `002-inline-edit-and-tab-creation`  
**Status:** Concluído / Em Produção  
**Complexidade:** Alta  

---

## 1. O que a Funcionalidade Faz (Comportamento & UX)

### Fase 1: Edição Inline no `NodeDetailPanel`
* **Substituição de Modais:** O antigo `EditTaskModal` foi removido. A edição de tarefas agora acontece diretamente no painel lateral de detalhes.
* **Campos Editáveis:**
  * **Nome da Tarefa:** Campo `<input>` que salva as alterações ao pressionar `Enter` ou perder o foco (*blur*).
  * **Trimestre (`Quarter`):** Seletor `<select>` com atualização síncrona que persiste imediatamente via `updateTask` no Zustand e invalida o cache do React Query.

### Fase 2: Criação Sequencial no Canvas via Tecla `TAB`
* **Agilidade Teclado-First:** Ao selecionar um nó pai no canvas (`Folder` ou `List`) e pressionar a tecla `TAB`, um nó temporário (*ghost node*) é renderizado diretamente abaixo do nó pai.
* **Componente `TempNode`:**
  * O nó fantasma renderiza um `<input autoFocus>` com o placeholder *"Digite o nome..."*.
  * **Tecla `Enter`:** Invoca a API de criação, remove o nó temporário do canvas e dispara a sincronização.
  * **Tecla `Escape` ou Blur:** Cancela a operação e remove o nó temporário sem efeitos colaterais.
  * **Fluxo Especial para Listas:** Se o pai for um `Folder` (gerando uma nova `List`), após confirmar o nome com `Enter`, o fluxo dispara o `QuarterPickerPopover` inline para escolha do trimestre sem abrir modais.

---

## 2. Fluxo de Dados e Interações

```text
[Seleção de Nó no Canvas] ──(Tecla: TAB)──> [GraphCanvas (onKeyDown)]
                                                   │
                                                   ▼
                                       [Zustand: addTempNode]
                                                   │
                                                   ▼
                                     [Render do TempNode.tsx]
                                 (Input recebe autoFocus no canvas)
                                                   │
                           ┌───────────────────────┴───────────────────────┐
                       (Enter)                                          (Escape / Blur)
                          │                                                 │
                          ▼                                                 ▼
             [handleCreateFromTemp]                             [Zustand: removeTempNode]
                          │                                        (Cancela a criação)
            (Pai é List?) ┬ (Pai é Folder?)
                          │ └─► Exibe [QuarterPickerPopover]
                          ▼
               [API / ClickUp Mutation]
                          │
                          ▼
              [queryClient.invalidateQueries]

```

---

## 3. Estrutura de Arquivos e Modificações Tecnológicas

* **`src/components/graph/panels/NodeDetailPanel.tsx` [MODIFY]:**
* Gerenciamento de estado local (`localName`, `localQuarter`) sincronizado com o `selectedNode`.
* Substituição do título estático `<h2>` por um `<input>` e inclusão do `<select>` de trimestres para tarefas.


* **`src/components/graph/GraphCanvas.tsx` [MODIFY]:**
* Captura do evento `onKeyDown` no container pai do React Flow.
* Mapeamento da tecla `Tab` para inserir o `TempNode` atrelado ao nó ativo.


* **`src/components/graph/nodes/TempNode.tsx` [NEW]:**
* Nó customizado para dados com `data.isTemp === true`.
* Input com foco automático, tratamento de atalhos (`Enter`/`Esc`) e integração com o fluxo de criação.


* **`src/store/graphStore.ts` [MODIFY]:**
* Adição dos helpers `addTempNode` e `removeTempNode`.


* **`src/app/map/page.tsx` [MODIFY]:**
* Remoção completa do componente `<EditTaskModal>`.


* **`src/styles/globals.css` [MODIFY]:**
* Estilização dos inputs de edição inline no painel de detalhes e no card do `TempNode`.


## ✅ Checklist de Critérios de Aceitação

* [x] O antigo `EditTaskModal` foi removido sem deixar dependências órfãs.
* [x] A alteração de nome e trimestre no `NodeDetailPanel` persiste as mudanças no ClickUp e no React Query ao pressionar `Enter` ou sair do campo.
* [x] Pressionar `TAB` com um nó `Folder` ou `List` selecionado renderiza um `TempNode` com input focado.
* [x] Pressionar `Enter` no `TempNode` cria a entidade no backend e atualiza a árvore de nós.
* [x] Pressionar `Escape` ou clicar fora descarta o `TempNode` de forma limpa.
* [x] Estilização visual dos inputs inline alinhada com o tema escuro da aplicação.

```