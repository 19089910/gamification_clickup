# 📖 Playbook de Engenharia: Fluxo de Trabalho e Git Workflow
## Milestone: `task-focus` | [Epic-04] Melhorias Contínuas (Enhancements)

Este documento estabelece o padrão de versionamento, fluxo de branches e convenção de commits para a implementação da funcionalidade de **Task-Focus (Position & Collapse)**. Devido à alta complexidade e necessidade de refatoração estrutural (SOLID), adotaremos o modelo de **Epic Feature Branch**.

---

## 🏗️ 1. Separação de Conceitos (Mentalidade)

- **Épico (`[Epic-04]`):** O assunto macro do nosso backlog (Evolução do Produto).
- **Milestone (`task-focus`):** O objetivo de valor final que engloba múltiplas sprints. Ele só será fechado quando o comportamento completo estiver testado.
- **Sprints (Ciclos):** Nosso ritmo de entrega quinzenal. Cada sprint atacará uma parte isolada deste documento.

---

## 🌿 2. Arquitetura de Branches no Git

Para não quebrar a branch estável do projeto (`main`/`develop`) com códigos pela metade, trabalharemos em um ecossistema isolado de sub-branches.

### 📍 A Branch Mãe da Feature (Epic Branch)
Toda a evolução técnica do Milestone será centralizada nesta branch. Ela nasce da branch principal estável e só retorna para ela via Pull Request (PR) após a homologação final do Milestone.
- **Nome padrão:** `epic/task-focus`

### 🏃‍♂️ Sub-branches de Ciclo (Sprint Branches)
Os desenvolvedores **nunca** mandam código direto para a `epic/task-focus`. Eles criam branches menores focadas em tarefas específicas da Sprint vigente. Essas sub-branches nascem de `epic/task-focus` e morrem nela através de Code Review.

#### Exemplo Prático de Fluxo (Comandos Git):

1. **Garantir que está na branch da Epic atualizada:**
   ```bash
   git checkout epic/task-focus
   git pull origin epic/task-focus
   ```

2. **Criar a branch focada na tarefa da Sprint:**
   ```bash
   git checkout -b feat/task-focus-collapse-hierarchy
   ```

3. **Submeter a entrega para revisão da equipe (Apontando para a Epic):**
   ```bash
   git push origin feat/task-focus-collapse-hierarchy
   # No GitHub/GitLab, abra o PR tendo como BASE a branch 'epic/task-focus'
   ```

---

## 📅 3. Cronograma de Desenvolvimento por Sprints

O Milestone será fatiado em fases incrementais de entrega para garantir que o código seja revisado em partes menores:

### 🧩 Sprint 1: Ciclo de Colapso (Collapse Mechanism)
*Foco na manipulação de estados do Redux e colapso visual das árvores hierárquicas.*
- **Branches sugeridas:** `feat/task-focus-collapse-hierarchy`, `refactor/hierarchy-slice`
- **Commits Esperados:**
  - `feat(hierarchy): implementar colapso de nós ao ativar foco de tarefa`
  - `refactor(hierarchySlice): isolar estado de colapso no Redux Toolkit`

### 📐 Sprint 2: Ciclo de Posicionamento e SOLID (Positioning Engine)
*Foco no cálculo geométrico de coordenadas de tela e refatoração da arquitetura do mapa mental.*
- **Branches sugeridas:** `refactor/graph-transformer-solid`, `feat/task-focus-dynamic-position`
- **Commits Esperados:**
  - `refactor(graph-transformer): desacoplar modulos aplicando principios do SOLID`
  - `feat(graph): implementar renderizacao dinamica de posicoes na base bottom`
  - `style(graph-transformer): cleanup de codigo morto e variaveis nao utilizadas`

---

## 🔀 4. Fluxo Visual do Git (Git Graph)

```text
main (Produção) ─────────────────────────────────────────────────────────────► (Merge Final)
       │                                                                            ▲
       └──► epic/task-focus (Feature Branch Principal) ─────────────────────────────┘
              │                       ▲                      │               ▲
              ├──► feat/collapse ─────┘ (PR da Sprint 1)     ├──► refactor/ ─┘ (PR da Sprint 2)
```

---

## 🚨 5. Boas Práticas Obrigatórias para os Desenvolvedores

1. **Atenção à Base do PR:** Ao abrir um Pull Request no gerenciador (GitHub/GitLab), certifique-se manualmente de que o destino (*base branch*) é **`epic/task-focus`** e nunca a `main`.
2. **Conventional Commits:** Siga estritamente o padrão `tipo(escopo): descrição minúscula`. Commits fora do padrão travarão o pipeline de Integração Contínua (CI).
3. **SOLID no Code Review:** Qualquer alteração no módulo `graph-transformer` que fira o princípio de Responsabilidade Única (SRP) ou Aberto/Fechado (OCP) será recusada na revisão de código.

---
*Este guia visa garantir a saúde da esteira de deploy e a manutenibilidade do código do Mapa Mental.*
