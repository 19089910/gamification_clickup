# [Epic-04] Melhorias Contínuas (Enhancements)
## Feature: Otimização de Cache (Optimistic UI) para Subtarefas

**Identificador:** `feat_enhancement_cache_subtask`  
**Status:** Pronto para Desenvolvimento (Backlog)  
**Complexidade:** Média (Refatoração de Hook/Cache)  

---

### 📝 Contexto
Atualmente, a atualização do status das subtarefas depende exclusivamente do ciclo de *polling* da API (a cada 5 segundos). Para melhorar drasticamente a experiência do usuário (UX), implementaremos uma estratégia de **Optimistic UI**.

O objetivo é fazer com que a mudança de status seja instantânea na interface, atualizando o cache local (`setQueryData`) imediatamente após a requisição à API, sem depender do *polling*.

### 🔧 Onde mexer (Contexto Técnico)
- **Hooks Principais:** `useSubtaskDetail` e `useTaskDetail`.
- **Gerenciamento:** Utilizar `queryClient.setQueryData` para atualizar o cache de forma assíncrona e reativa.

### ✅ Critérios de Aceitação

- [ ] **Update de Subtarefa:** Ao alterar o status de uma subtarefa (e.g., `in_progress` -> `done`), atualizar imediatamente o cache local para refletir o novo status.
- [ ] **Invalidação de Dependência:** Garantir que a alteração propague para a lista de tarefas principal, caso necessário.
- [ ] **Resiliência:** Em caso de falha na API, o sistema deve reverter a alteração (rollback automático do React Query) sem deixar a interface inconsistente.
- [ ] **Manutenção:** A lógica deve estender ou reutilizar a implementação existente de `useSubtaskDetail`, garantindo que o *polling* continue como *fallback*.

---
*Documento criado para alinhamento técnico do time de desenvolvimento.*