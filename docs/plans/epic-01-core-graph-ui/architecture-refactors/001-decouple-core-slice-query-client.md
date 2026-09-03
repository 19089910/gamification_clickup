# [Epic-01] Plan: Desacoplamento do queryClient e Refatoração de Tags

**O que é:** Refatoração da arquitetura da store Zustand para remover o acoplamento direto com a instância do React Query (`queryClient`), adequação da API de Tags ao padrão RESTful e resolução de conflitos de rotas dinâmicas no Next.js (App Router).

**Identificador:** `001-decouple-core-slice-query-client`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média  

## 1. Desacoplamento do `queryClient` (Zustand)

Instâncias de contexto do React não devem ser armazenadas dentro do estado global do Zustand, pois quebram a serialização e violam a separação de responsabilidades.

* **Alteração:** O `queryClient` foi completamente removido do `CoreSlice` e de qualquer estado persistente da store.
* **Injeção de Dependência:** A action `toggleDevMode` passou a receber a instância do `queryClient` como parâmetro em tempo de execução.
* **Componente:** No `ListDetail.tsx`, utilizamos o hook `useQueryClient()` do `@tanstack/react-query` e injetamos o objeto diretamente ao disparar a ação:

```typescript
// Chamada no componente React
const queryClient = useQueryClient();

const handleToggleDev = async () => {
  await toggleDevMode(listId, tasks, enable, queryClient);
};

```

## 2. Refatoração da API de Tags (Padrão REST)

A lógica de manipulação e sincronização de tags no ClickUp foi migrada de chamadas diretas no cliente para uma rota de API dedicada no Next.js, mantendo os tokens de acesso seguros no ambiente do servidor.

* **Nova Estrutura de Rota:** `/api/clickup/tasks/[taskId]/tags/[tagName]`
* **Métodos HTTP:**
* `POST`: Adiciona a tag à tarefa (utilizado ao ativar o Dev Mode).
* `DELETE`: Remove a tag da tarefa (utilizado ao desativar o Dev Mode).

## 3. Resolução de Conflito de Rotas Dinâmicas (`LiteralPath`)

Ao introduzir a rota com o parâmetro `[taskId]`, o Next.js falhou na compilação com o erro:

> `Error: You cannot use different slug names for the same dynamic path ('id' !== 'taskId').`

### Diagnóstico e Causa Raiz

O Next.js exige que rotas dinâmicas sob o mesmo nível de diretório utilizem o mesmo nome de parâmetro (slug). Existiam pastas duplicadas e antigas nomeadas como `[id]` ao lado de `[taskId]` no diretório `tasks/`.

### Solução no Windows (PowerShell)

No PowerShell do Windows, tentativas convencionais de apagar pastas com colchetes (ex: `rm -rf [id]`) falham porque o shell interpreta os colchetes como caracteres curinga (*wildcards*).

A remoção foi executada com o parâmetro `-LiteralPath`:

```powershell
Remove-Item -LiteralPath "src/app/api/clickup/tasks/[id]" -Recurse -Force

```

## 4. Padronização de Parâmetros e Cache

* **Padronização Global:** Todos os slugs dinâmicos de tarefas foram unificados para `[taskId]` e de listas para `[listId]`.
* **Limpeza de Build:** Para descartar o cache invalidados do Next.js contendo as antigas rotas:
```powershell
Remove-Item -Recurse -Force .next

```

## ✅ Status e Impacto Arquitetural

* **Store Zustand:** Limpa, serializável e fortemente tipada, sem referências a hooks ou instâncias de contexto do React.
* **Segurança:** Comunicação com a API do ClickUp para gerenciamento de tags centralizada no servidor em rotas RESTful (`POST`/`DELETE`).
* **Resiliência:** Melhor controle de *Rate Limits* do ClickUp ao centralizar as requisições de tags via Server Endpoints.
* **Interface (UI):** O componente `ListDetail` exibe o feedback visual de sincronização e bloqueia novas ações até a confirmação das alterações.

