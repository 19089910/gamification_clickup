# [Epic-04] Melhorias Contínuas (Enhancements)
## Feature: Reposicionar Nós de Lista para o Bottom ao Ativar Task-Focus

**Identificador:** `feat_enhancement_task-focus_position`  
**Status:** Pronto para Desenvolvimento (Backlog)  
**Complexidade:** Alta (Requer Refatoração)  

---

### 📝 Contexto
Anteriormente, implementamos o colapso dos nós de tarefas (*tasks*) e subtarefas (*subtasks*) ao clicar na funcionalidade de `task-focus`. 

O novo requisito técnico exige que, ao ativar essa mesma função, todas as listas de nós (*node lists*) mudem dinamicamente de posição, movendo-se para a base da tela (`bottom`).

### ⚠️ Nota de Arquitetura (Atenção Dev)
Esta é uma tarefa de grande impacto na base de código atual. Será necessário refatorar várias linhas de lógica de renderização e cálculo de coordenadas. 

**Diretriz Obrigatória:** Aplicar estritamente os princípios do **SOLID** para garantir que a lógica de posicionamento dos nós fique completamente desacoplada do componente visual e seja facilmente reutilizável ou estendível no futuro.

---

### ✅ Critérios de Aceitação

- [ ] **Isolamento de Lógica:** Identificar, extrair e isolar a lógica atual que calcula e define o posicionamento dos nós no mapa mental.
- [ ] **Novo Posicionamento:** Implementar a nova regra de cálculo de coordenadas para alinhar as *node lists* na base (`bottom`), disparada exclusivamente pelo gatilho do `task-focus`.
- [ ] **Retrocompatibilidade:** Garantir que o comportamento anterior (colapso de tasks e subtasks) continue funcionando perfeitamente e sem quebras visuais.
- [ ] **Qualidade de Código:** Aplicar padrões SOLID (especialmente Responsabilidade Única e Aberto/Fechado) na refatoração de todos os arquivos afetados.

---
*Documento criado para alinhamento técnico do time de desenvolvimento.*
