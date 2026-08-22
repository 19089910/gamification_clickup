# Relatório Técnico — Refatoração da Arquitetura de Estado e Sincronização do Canvas

**Projeto:** Gerenciador de Projetos / Canvas React Flow
**Objetivo:** Eliminação de acoplamento, glitches de posicionamento e inconsistências de estado
**Arquitetura principal:** React + React Flow + Zustand + React Query + ClickUp API

---

## 1. Objetivo da Refatoração

Este relatório documenta o plano de ação e a arquitetura adotada para corrigir problemas de acoplamento entre componentes, eventos globais do DOM, sincronização de estado e inconsistências visuais no canvas.

A principal mudança consiste em substituir uma arquitetura baseada em eventos globais por um **fluxo unidirecional e previsível**, no qual o **Zustand passa a ser a fonte única da verdade para o estado visual do grafo**.

A arquitetura também separa explicitamente:

* Estado visual e transições locais;
* Operações HTTP;
* Cache do React Query;
* Sincronização em background;
* Renderização do React Flow.

O objetivo final é reduzir efeitos colaterais, evitar re-renders desnecessários e preservar a estabilidade do layout durante operações otimistas.

---

# 2. Problemas da Arquitetura Anterior

A arquitetura anterior utilizava eventos globais do navegador, principalmente através de:

```typescript
window.dispatchEvent(...)
window.addEventListener(...)
```

Um exemplo desse fluxo era o evento:

```text
tempnode:commit
```

Esse mecanismo criava uma dependência indireta entre componentes.

O fluxo aproximado era:

```text
TempNode
   │
   │ window.dispatchEvent()
   ▼
Evento global do DOM
   │
   │ addEventListener()
   ▼
Outro componente / hook
   │
   ▼
Atualização do Zustand
   │
   ▼
React Flow
```

Embora funcional, esse modelo apresenta alguns problemas arquiteturais:

* Alto acoplamento entre componentes;
* Dependências implícitas;
* Dificuldade para rastrear quem dispara e quem consome determinado evento;
* Necessidade de registrar e remover listeners;
* Maior possibilidade de efeitos colaterais;
* Fluxo de execução difícil de acompanhar;
* Maior risco de condições de corrida;
* Dificuldade para controlar rollback de operações otimistas.

Além disso, alterações na árvore poderiam provocar reconstruções desnecessárias através de `buildGraph()`, ocasionando glitches de posição e ordenação.

---

# 3. Plano de Ação

A refatoração será executada em etapas.

## 3.1. Eliminar Eventos Globais do DOM

O primeiro objetivo é remover o uso de:

```typescript
window.dispatchEvent(...)
```

e:

```typescript
window.addEventListener(...)
```

para controlar o ciclo de vida dos `TempNode`.

O fluxo deverá passar a utilizar diretamente as Actions do Zustand.

### Antes

```text
TempNode
   │
   ▼
window.dispatchEvent("tempnode:commit")
   │
   ▼
listener global
   │
   ▼
Zustand
```

### Depois

```text
TempNode
   │
   ▼
commitTempNode()
   │
   ▼
Zustand
```

Isso reduz uma camada inteira de comunicação indireta.

---

# 4. Centralização do Ciclo de Vida no Zustand

Será criado um método unificado:

```typescript
commitTempNode()
```

dentro de:

```text
tempNodeSlice.ts
```

Esse método será responsável por controlar o ciclo completo de persistência do nó.

O ciclo será dividido em quatro estados:

```text
Draft
  │
  ▼
Optimistic
  │
  ▼
Persisted
  │
  ├────── sucesso ──────► Confirmed
  │
  └────── erro ─────────► Rollback
```

## 4.1. Draft

O `TempNode` representa uma entidade ainda não persistida.

Nesse momento, o nó existe apenas como rascunho no canvas.

```text
Usuário cria nó
       │
       ▼
TempNode
       │
       ▼
Draft
```

---

## 4.2. Optimistic

Após o commit, o Zustand converte o nó temporário em uma entidade real de forma otimista.

O estado visual é atualizado imediatamente:

```text
TempNode
   │
   ▼
commitTempNode()
   │
   ▼
Node real
isOptimistic: true
```

Essa atualização acontece sem esperar a resposta da API.

O objetivo é fornecer feedback imediato ao usuário.

---

## 4.3. Confirmed

A API do ClickUp é chamada em background.

Se a operação for concluída com sucesso:

```text
API Success
    │
    ▼
isOptimistic: false
    │
    ▼
Persisted
```

O identificador definitivo e os dados retornados pela API podem então substituir ou complementar os dados temporários.

---

## 4.4. Rollback

Caso a operação falhe:

```text
API Error
   │
   ▼
Rollback
   │
   ▼
Estado anterior
```

O estado otimista deverá ser revertido para impedir que o canvas apresente uma entidade que não existe no backend.

---

# 5. Arquitetura de Fluxo Unificado

A nova arquitetura segue um fluxo unidirecional:

```text
┌─────────────────────────────────────────────────────────┐
│               Zustand State (GraphStore)                │
│       Fonte Única da Verdade para Renderização da UI    │
└────────────────────────────┬────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌──────────────────┐          ┌──────────────────────┐
   │ React Flow Canvas│          │ ClickUp API /         │
   │   UI / Render    │          │ Mutations (I/O)      │
   └──────────────────┘          └──────────┬───────────┘
                                            │
                                            ▼
                                   ┌──────────────────────┐
                                   │ React Query Cache    │
                                   │ Sincronização BG     │
                                   └──────────────────────┘
```

A responsabilidade de cada camada fica explicitamente definida.

---

# 6. Responsabilidades das Camadas

## 6.1. Zustand / GraphStore

O Zustand será responsável pelo **estado necessário para renderização e interação do canvas**.

Responsabilidades:

* Armazenar os nós utilizados pela UI;
* Controlar posições;
* Controlar estados otimistas;
* Executar transições de estado;
* Converter `TempNode` em nó persistível;
* Aplicar rollback;
* Preservar a ordenação visual;
* Atualizar a interface imediatamente.

O Zustand não deverá ser utilizado como cliente HTTP.

---

# 7. React Flow

O React Flow será responsável exclusivamente pela representação visual do grafo.

```text
Zustand
   │
   ▼
React Flow
   │
   ▼
Canvas
```

A camada visual não deverá precisar conhecer detalhes sobre:

* ClickUp;
* React Query;
* Eventos globais;
* Estrutura interna das mutations;
* Estratégias de sincronização de cache.

---

# 8. Isolamento das Mutations HTTP

O arquivo:

```text
lib/clickup/mutations.ts
```

deverá permanecer focado em operações de I/O.

Sua responsabilidade é:

```text
Request
   │
   ▼
ClickUp API
   │
   ▼
HTTP Response
```

A camada de mutation não deverá assumir responsabilidades de:

* Estado global;
* Renderização;
* Modais;
* Atualização direta do Zustand;
* Controle visual;
* Eventos do DOM.

Isso aplica diretamente o **Single Responsibility Principle (SRP)**.

---

# 9. graphCacheSync

O:

```text
src/lib/cache/graphCacheSync.ts
```

será mantido, porém com uma responsabilidade específica:

> Sincronizar os dados brutos armazenados no React Query Cache.

Ele funcionará como uma camada de sincronização em background.

Não será responsável por controlar a UI.

---

# 10. Zustand vs. graphCacheSync

A separação de responsabilidades será:

```text
                    ┌─────────────────────────┐
                    │    Ação do Usuário      │
                    └────────────┬────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            ▼                                         ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│     Zustand Store       │               │    graphCacheSync       │
│  Atualização da UI      │               │  Sincronização Cache    │
├─────────────────────────┤               ├─────────────────────────┤
│ • Feedback imediato     │               │ • Atualiza dados brutos │
│ • TempNode → Node       │               │   no React Query         │
│ • Mantém layout         │               │ • Evita refetch total   │
│ • Mantém ordenação      │               │ • Garante consistência  │
│ • Rollback              │               │ • Sincronização BG      │
└─────────────────────────┘               └─────────────────────────┘
```

Essa divisão é fundamental.

O Zustand resolve:

> **O que o usuário deve enxergar agora?**

O `graphCacheSync` resolve:

> **Como manter os dados armazenados em cache consistentes para futuras sincronizações?**

---

# 11. Fluxo Completo de Criação de um TempNode

O fluxo esperado passa a ser:

```text
1. Usuário cria TempNode
        │
        ▼
2. Estado Draft
        │
        ▼
3. commitTempNode()
        │
        ▼
4. Zustand converte para nó real
        │
        ▼
5. isOptimistic = true
        │
        ├──────────────► React Flow
        │                 Atualização imediata
        │
        ▼
6. Mutation HTTP
        │
        ▼
7. ClickUp API
        │
        ├──── sucesso ─────► Confirmed
        │
        │                   ▼
        │              graphCacheSync
        │
        └──── erro ────────► Rollback
```

O usuário não precisa esperar a API para visualizar a alteração.

---

# 12. Pipeline de Dados

A arquitetura geral de dados será:

```text
                    [ 1. ClickUp API ]
                            │
                            ▼
                  [ 2. React Query Cache ]
                     JSON bruto da API
                            │
                            ▼
                      buildGraph()
                    Transformação dos dados
                            │
                            ▼
                   [ 3. Zustand Store ]
                 fullNodes + layout visual
                            │
                            ▼
                 [ 4. React Flow Canvas ]
                            │
                            ▼
                    [ 5. UI / Modais ]
```

Durante mutações otimistas, entretanto, o fluxo visual poderá ser atualizado diretamente no Zustand antes da confirmação da API.

---

# 13. Papel do buildGraph()

O `buildGraph()` continuará sendo responsável pela transformação dos dados brutos em uma estrutura adequada ao grafo.

Porém, a estratégia será evitar utilizar essa reconstrução completa para operações que podem ser resolvidas localmente.

Exemplo:

```text
Atualização simples de um Task
          │
          ▼
Atualização direta no Zustand
          │
          ▼
React Flow
```

em vez de:

```text
Atualização simples
      │
      ▼
Refetch
      │
      ▼
React Query
      │
      ▼
buildGraph()
      │
      ▼
Reconstrução completa
      │
      ▼
React Flow
```

A segunda abordagem pode gerar alterações desnecessárias no layout.

---

# 14. Preservação da Posição e Ordenação

Um dos principais objetivos da refatoração é eliminar glitches de posicionamento.

A árvore possui uma organização temporal, por exemplo:

```text
Summer
   │
   ▼
Fall
   │
   ▼
Winter
   │
   ▼
Spring
```

Quando um `TempNode` é convertido diretamente dentro do Zustand, sua posição existente pode ser preservada.

```text
TempNode
   │
   │ posição existente
   ▼
Optimistic Node
   │
   ▼
Mesma posição visual
```

Isso reduz a necessidade de executar novamente toda a lógica de layout.

---

# 15. Eliminação de Re-renders Desnecessários

A nova estratégia evita utilizar a atualização completa da árvore para toda operação.

O objetivo é trabalhar com atualizações localizadas:

```text
Action
   │
   ▼
Zustand
   │
   ▼
Alteração específica
   │
   ▼
React Flow
```

Somente quando necessário ocorrerá uma sincronização mais ampla.

Isso reduz:

* Re-renderizações;
* Reconstruções do grafo;
* Reprocessamento do layout;
* Alterações inesperadas de posição;
* Flickering visual.

---

# 16. Aplicação do SOLID

## 16.1. Single Responsibility Principle — SRP

Cada componente deverá possuir uma responsabilidade clara.

### TempNode.tsx

Responsável por:

* Capturar interação do usuário;
* Validar ou preparar dados necessários;
* Invocar `commitTempNode()`.

Não deverá:

* Disparar eventos globais;
* Conhecer detalhes do React Query;
* Gerenciar diretamente cache;
* Conhecer detalhes de implementação do ClickUp.

---

### mutations.ts

Responsável por:

* Executar requests;
* Enviar dados para a API;
* Receber respostas;
* Propagar erros.

Não deverá:

* Atualizar Zustand;
* Controlar UI;
* Abrir modais;
* Manipular cache global diretamente.

---

### tempNodeSlice.ts

Responsável por:

* Estado do `TempNode`;
* Commit;
* Estado otimista;
* Persistência;
* Rollback;
* Transições de estado.

---

### graphCacheSync.ts

Responsável por:

* Atualizar dados no React Query Cache;
* Sincronizar mapas;
* Evitar refetch completo quando uma atualização localizada for suficiente.

---

# 17. Open/Closed Principle — OCP

A arquitetura deverá permitir adicionar novos tipos de entidades sem modificar um sistema central de listeners.

Por exemplo:

```text
Task
List
Milestone
Note
Folder
```

A criação poderá seguir o mesmo contrato:

```text
commitTempNode()
        │
        ▼
Create Callback / Promise
        │
        ▼
Persistência da entidade
```

O fluxo não precisa conhecer antecipadamente cada implementação concreta.

Isso permite expandir o sistema sem reintroduzir eventos globais.

---

# 18. Dependency Inversion Principle — DIP

O componente visual não deverá depender diretamente de detalhes de infraestrutura.

### Arquitetura anterior

```text
TempNode
   │
   ├── DOM Event
   ├── React Query
   ├── ClickUp
   └── Estado Global
```

### Arquitetura proposta

```text
TempNode
   │
   ▼
commitTempNode()
   │
   ▼
Abstração de persistência
   │
   ▼
Mutation
   │
   ▼
ClickUp API
```

O componente depende de uma abstração de operação e não da implementação concreta da infraestrutura.

---

# 19. Redução de Dependências

A nova arquitetura remove dependências implícitas.

### Removido

```typescript
window.dispatchEvent(...)
```

```typescript
window.addEventListener(...)
```

### Centralizado

```typescript
commitTempNode(...)
```

### Isolado

```text
mutations.ts
```

### Sincronizado em background

```text
graphCacheSync.ts
```

O resultado é uma arquitetura mais previsível e testável.

---

# 20. Arquitetura Final

A arquitetura consolidada será:

```text
┌─────────────────────────────────────────────────────────┐
│                  GraphStore / Zustand                   │
│                                                         │
│              Fonte Única da Verdade da UI              │
│                                                         │
│  • Nodes                                                │
│  • Positions                                            │
│  • Optimistic State                                     │
│  • TempNode Lifecycle                                   │
│  • Rollback                                             │
└────────────────────────────┬────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
       ┌─────────────────┐       ┌────────────────────┐
       │  React Flow     │       │  Mutation Layer    │
       │     Canvas      │       │  ClickUp I/O       │
       └─────────────────┘       └─────────┬──────────┘
                                           │
                                           ▼
                                  ┌────────────────────┐
                                  │  ClickUp API       │
                                  └─────────┬──────────┘
                                            │
                                            ▼
                                  ┌────────────────────┐
                                  │ React Query Cache  │
                                  └─────────┬──────────┘
                                            │
                                            ▼
                                  ┌────────────────────┐
                                  │ graphCacheSync     │
                                  │ Background Sync    │
                                  └────────────────────┘
```

---

# 21. Matriz de Responsabilidades

| Camada              | Responsabilidade          | Não deve fazer                  |
| ------------------- | ------------------------- | ------------------------------- |
| `TempNode.tsx`      | Interação do usuário      | HTTP, cache, eventos globais    |
| `tempNodeSlice.ts`  | Ciclo de vida do TempNode | Implementação HTTP              |
| Zustand             | Estado visual             | Ser cliente da API              |
| React Flow          | Renderização              | Gerenciar persistência          |
| `mutations.ts`      | I/O ClickUp               | Controlar UI/cache              |
| `graphCacheSync.ts` | Sincronização de cache    | Controlar layout                |
| React Query         | Cache e revalidação       | Ser fonte primária da UI        |
| `buildGraph()`      | Transformação de dados    | Ser acionado desnecessariamente |
| ClickUp API         | Persistência              | Gerenciar estado local          |

---

# 22. Resultado Esperado

Com a aplicação dessa arquitetura, espera-se obter:

### Estabilidade visual

* Preservação das posições dos nós;
* Preservação da ordenação temporal;
* Redução de flickering;
* Eliminação dos glitches durante commits.

### Menor acoplamento

* Sem eventos globais para comunicação interna;
* Menor dependência entre componentes;
* Contratos explícitos entre camadas.

### Melhor previsibilidade

* Fluxo unidirecional;
* Estado centralizado;
* Ciclo de vida explícito;
* Rollback controlado.

### Melhor separação de responsabilidades

```text
UI
 ↓
Zustand
 ↓
Mutation
 ↓
API
 ↓
React Query Cache
 ↓
Background Sync
```

### Melhor manutenção

Novas entidades e novas operações podem ser adicionadas sem criar novos listeners globais ou modificar uma infraestrutura central de eventos.

---

# 23. Critérios de Validação

A refatoração será considerada bem-sucedida quando:

* [ ] `window.dispatchEvent("tempnode:commit")` não for mais utilizado.
* [ ] `window.addEventListener("tempnode:commit")` não for mais utilizado.
* [ ] `commitTempNode()` estiver centralizado no `tempNodeSlice.ts`.
* [ ] O `TempNode` conseguir realizar commit através do Zustand.
* [ ] O estado otimista aparecer imediatamente no canvas.
* [ ] A posição original do nó seja preservada durante o commit.
* [ ] A ordenação temporal permaneça estável.
* [ ] Falhas da API provoquem rollback correto.
* [ ] `mutations.ts` permaneça isolado para operações HTTP.
* [ ] `graphCacheSync.ts` seja utilizado apenas para sincronização de cache.
* [ ] Operações locais não provoquem reconstrução desnecessária via `buildGraph()`.
* [ ] React Query continue responsável pelo cache e revalidação.
* [ ] Zustand permaneça como fonte primária do estado visual.
* [ ] Não ocorram desaparecimentos temporários de Tasks após sincronização.
* [ ] Não ocorram mudanças inesperadas de posição após refetch.

---

# 24. Conclusão

A refatoração substitui uma arquitetura baseada em **eventos globais e comunicação indireta** por uma arquitetura baseada em **estado centralizado, fluxo unidirecional e responsabilidades bem definidas**.

O ponto central da solução é o `commitTempNode()` no Zustand, que passa a controlar explicitamente o ciclo:

```text
Draft
  ↓
Optimistic
  ↓
Confirmed
  └──► Rollback em caso de falha
```

Enquanto o Zustand controla a experiência visual imediata, as mutations permanecem responsáveis pelo I/O e o `graphCacheSync` atua como mecanismo de sincronização do cache em background.

Dessa forma, cada camada possui uma responsabilidade específica:

```text
TempNode
   ↓
Interação
   ↓
Zustand
   ↓
Estado visual
   ↓
React Flow
   ↓
Renderização

Mutation
   ↓
ClickUp API
   ↓
React Query Cache
   ↓
graphCacheSync
   ↓
Sincronização em Background
```

O resultado esperado é uma arquitetura com **menor acoplamento, maior previsibilidade, menor complexidade e maior estabilidade visual**, eliminando a necessidade de eventos globais para controlar o ciclo de vida dos nós e reduzindo a ocorrência de glitches causados por reconstruções desnecessárias do grafo.