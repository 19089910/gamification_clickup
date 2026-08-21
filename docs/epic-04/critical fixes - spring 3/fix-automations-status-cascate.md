
# [Epic-04] Melhorias Contínuas (Enhancements)
## Fix: Correção automação de status em cascata (tarefas e subtarefas)
O que é: Consertar o gatilho de progresso e o fechamento automático da tarefa pai ao bater 100% das subtasks.

**Identificador:** `fix_enhancement_cascade_automation`  
**Status:** Próximo ao Desenvolvimento (Backlog)  
**Complexidade:** Média-Alta (Refatoração de Slice/State)  

---

### 🛠️ Solução Esperada
Implementar uma estratégia completa de **Optimistic UI** para a criação de nós:
1.  **Atualização Imediata:** Utilizar `setQueryData` para atualizar o estado local assim que a requisição à API (POST/PUT) for concluída.
2.  **Full Sync:** Garantir que a atualização seja refletida imediatamente em toda a aplicação.
3.  **Rollback:** Em caso de falha na API, o sistema deve reverter automaticamente a alteração, garantindo a consistência dos dados.

### 🎯 Onde mexer (Contexto Técnico)
- **Arquivo Principal:** `lib/store/slices/tempNode.slice.ts`
- **Ações Críticas:** `createNode`, `updateNode`.
- **Gerenciamento:** Utilizar `queryClient.setQueryData` para manipulação do cache do React Query.

### ✅ Critérios de Aceitação

- [ ] **Criação Instantânea:** Novos nós devem aparecer na tela imediatamente após o clique em "Salvar".
- [ ] **Persistência:** A mudança deve ser persistida no cache local (API Mockada) sem a necessidade de *refetch*.
- [ ] **Segurança:** Implementar lógica de *rollback* em caso de erro na API.
- [ ] **Compatibilidade:** Garantir que a funcionalidade continue compatível com o ciclo de vida atual do `TempNode`.

---
*Previsão: 2 a 3 commits (1 lógica do setQueryData, 1 rollback, 1 UI instantânea).*