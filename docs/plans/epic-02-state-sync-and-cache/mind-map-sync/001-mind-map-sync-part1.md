# [Epic-02] Plan & Walkthrough: Correção de Sincronização do Mapa Mental (Parte 1 - Invalidação e Dynamic Fetching)

**O que é:** Ajustes e refinamentos na camada de transporte do servidor e do cliente para eliminar a exibição de dados velhos no mapa mental após edições ou criações. Desativa caches persistentes do Next.js e zera o `staleTime` no React Query.

**Identificador:** `001-mind-map-sync-part1`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média  

---

## 1. O que a Funcionalidade Faz (Comportamento & UX)

* **Eliminação do Lag de Sincronização:** Alterações feitas em tarefas e listas (como mudança de nome, status ou trimestre) são refletidas no grafo do React Flow assim que a API do ClickUp responde, sem exigir atualização manual da página (`F5`) ou reinício do servidor.
* **Busca Forçada do Estado Atualizado (`no-store`):** Garante que cada requisição `/api/clickup/graph` consulte a API oficial do ClickUp em tempo real, sem servir respostas estáticas em cache.
* **Refetch Imediato no Cliente:** Configura o React Query para considerar os dados do grafo como obsoletos (`staleTime: 0`), permitindo que chamadas a `invalidateQueries()` disparem sincronizações de rede instantâneas.

---

## 2. Fluxo de Atualização Síncrona

```text
[Edição no Painel de Detalhes] ──► [API ClickUp: Update]
                                            │
                                            ▼
                          [React Query: invalidateQueries()]
                                            │
                                            ▼
                             [GET /api/clickup/graph]
                        (force-dynamic + cache: 'no-store')
                                            │
                                            ▼
                              [Re-render no Canvas do Grafo]

```

---

## 3. Modificações na Arquitetura

### 1. Desativação de Cache no Servidor (`src/lib/clickup.ts`)

* **Antes:** As requisições utilizavam a estratégia de revalidação por tempo `next: { revalidate: 60 }`.
* **Depois:** Substituído por `cache: 'no-store'`, garantindo requisições diretas à fonte.

### 2. Rota Dinâmica no Next.js (`src/app/api/clickup/graph/route.ts`)

* Adição da diretiva `export const dynamic = 'force-dynamic'` para impedir que a rota do grafo seja otimizada estaticamente durante o build.

### 3. Ajuste de Reatividade no Cliente (`src/hooks/useClickUpData.ts`)

* Configuração do `staleTime` para `0` ms. O React Query re-executa a busca de rede no momento em que a query `clickup-graph` é invalidada pelo painel lateral ou pelos hooks de nós.

---

## 4. Guia de Verificação e Teste Manual

1. Abra o mapa mental no navegador.
2. Selecione qualquer nó de tarefa para abrir o painel de detalhes à direita.
3. Altere o nome da tarefa e pressione **Enter**.
4. Verifique se o título no card do grafo é atualizado **imediatamente** após o término da requisição da API.

> [!TIP]
> Caso haja um pequeno delay visual de frações de segundo, é apenas o tempo de processamento da API do ClickUp e da montagem do Grafo no servidor. Não há mais retenção por cache antigo.

---

## ✅ Checklist de Implementação

* [x] Desativar cache server-side em `src/lib/clickup.ts`.
* [x] Tornar a rota do grafo dinâmica (`force-dynamic`) em `src/app/api/clickup/graph/route.ts`.
* [x] Reduzir o `staleTime` para `0` em `src/hooks/useClickUpData.ts`.
* [x] Validar a atualização imediata simulando edições no painel lateral de tarefas.
