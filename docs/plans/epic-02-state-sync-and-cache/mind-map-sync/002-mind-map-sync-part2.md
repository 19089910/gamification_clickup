# [Epic-02] Plan: Sincronização de Cache Local e Atualizações Otimistas na UI (Parte 2)

**O que é:** Eliminação do atraso de rede pós-edição substituindo os refetches globais por atualização direta do cache do React Query (`queryClient.setQueryData`). As alterações em tarefas e listas (nome, status, trimestre) são refletidas instantaneamente na interface no momento da confirmação da API.

**Identificador:** `002-mind-map-sync-part2`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média-Alta  

---

## 1. O que a Funcionalidade Faz (Comportamento & UX)

### 1.1. Eliminação do Gargalo de 3.7 Segundos
* **Problema Anterior:** Cada alteração simples (como renomear uma tarefa) disparava um `invalidateQueries`, forçando a re-execução completa de uma busca pesada e a reconstrução do grafo do ClickUp.
* **Abordagem Implementada (Local Sync):** Em vez de reconstruir o grafo do zero via rede, o sistema aguarda a resposta rápida do endpoint de mutação e injeta as propriedades alteradas diretamente na árvore de dados mantida pelo React Query (`GraphApiResponse`).

### 1.2. Estratégia de Mutação de Cache
* **Local Sync (Pós-Sucesso):** A UI aplica a mudança no mesmo frame em que a requisição `PUT`/`POST` retorna sucesso, eliminando os relayouts e o *flicker* visual.
* **Função Auxiliar Dedicada (`GraphSyncService`):** Centraliza a lógica de mutação imutável para navegar pela estrutura hierárquica (`Space` ➔ `Folder` ➔ `List` ➔ `Task`) e atualizar apenas o nó alterado.

---

## 2. Fluxo de Dados e Manipulação de Cache

```text
[Ação no Painel / Modal] ──► [API Mutation (updateTask/updateList)]
                                            │
                                            ▼
                             (Retorna os campos atualizados)
                                            │
                                            ▼
                          [GraphSyncService.updateInCache()]
                                            │
                                            ▼
                       [queryClient.setQueryData('clickup-graph')]
                                            │
                                            ▼
                       [Re-render Instantâneo do Nó afetado]

```

---

## 3. Arquivos Envolvidos e Especificação Técnica

### [Core] Biblioteca de API do ClickUp

* **`src/lib/clickup.ts` [MODIFY]:**
* Atualização da função `updateTask` para retornar os dados/campos atualizados.
* Atualização da função `updateList` para retornar a nova estrutura da lista.



### [UI] Componentes e Manipuladores de Mutação

* **`src/components/ui/NodeDetailPanel.tsx` [MODIFY]:**
* Substituição de `queryClient.invalidateQueries` por blocos de `queryClient.setQueryData` nas funções `handleSaveTask` e `handleSaveList`.


* **`src/components/ui/EditTaskModal.tsx` [MODIFY]:**
* Aplicação da mesma lógica de atualização de cache em tempo de execução para edições de nome e trimestre.



### [Logic] Helper de Sincronização de Grafo

* **`src/domain/graph/graphSync.service.ts` [NEW/MODIFY]:**
* Utilitário responsável por clonar e mesclar as alterações dentro da estrutura imutável de `GraphApiResponse`.



---

## ✅ Plano de Verificação e Testes Manuais

* [x] **Renomear Tarefa:** Alterar o nome de uma tarefa e pressionar Enter. O nó no mapa deve atualizar no exato momento em que o spinner de salvamento desaparece, sem piscar o grafo.
* [x] **Trocar Trimestre:** Alterar o trimestre da tarefa e confirmar que a opacidade/destaque do nó reage instantaneamente sem refetch.
* [x] **Renomear Lista:** Renomear uma lista e verificar que o rótulo e os contadores atualizam de imediato.
* [x] **Consistência do Grafo:** Garantir que o restante dos nós e conexões permaneça intacto durante a injeção dos novos dados.
