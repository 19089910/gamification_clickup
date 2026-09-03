# [Epic-02] Plan: Sincronização do Grafo, Controle de Cache e Rate Limits do ClickUp

**O que é:** Eliminação do atraso de sincronização entre as mutações de dados no mapa mental (`POST`/`PUT`) e a renderização do grafo no frontend. Desativa o cache estático do Next.js no `fetch` e ajusta o `staleTime` do React Query para resposta imediata às alterações.

**Identificador:** `001-clickup-api-rate-limit-and-cache`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média  

---

## 1. O que a Funcionalidade Faz (Comportamento & UX)

### 1.1. Eliminação de Stale Data (Dados Desatualizados)
* **Causa Raiz:** O Next.js estava revalidando a requisição para a API do ClickUp a cada 60 segundos (`revalidate: 60`), fazendo com que mutações salvas no backend não aparecessem no mapa mesmo após um *refetch* do React Query.
* **Solução Server-Side:** Remoção da revalidação temporal do Next.js em favor da opção `{ cache: 'no-store' }` e forçamento de rota dinâmica (`export const dynamic = 'force-dynamic'`).

### 1.2. Reatividade do React Query
* **Redução do `staleTime`:** O tempo de "dado fresco" no cliente (`useClickUpData`) foi reduzido de 5 minutos para 0 ms (ou 30s dependendo do cenário), garantindo que qualquer invalidação de query (`invalidateQueries`) dispare um fetch real para a API do ClickUp imediatamente.

### 1.3. Alerta de Rate Limit do ClickUp
* > [!IMPORTANT]
  > **Consideração de Limite de Requisições:** A desativação do cache do Next.js aumenta o volume de requisições diretas ao ClickUp. Essa escolha foi necessária para a natureza interativa do mapa mental, sendo mitigada no cliente através de otimizações e *debounces* em edição de texto.

---

## 2. Fluxo de Requisição e Atualização de Cache

```text
[Ação do Usuário (Criar / Editar / Mover)]
                    │
                    ▼
          [POST/PUT API Route]
                    │
                    ▼
     [ClickUp API: Processa Alteração]
                    │
                    ▼
   [React Query: invalidateQueries()]
                    │
                    ▼
     [GET /api/clickup/graph] ──(force-dynamic)──► [fetchClickUp]
                                                         │
                                                  (cache: 'no-store')
                                                         │
                                                         ▼
                                            [Retorna Dado Real do ClickUp]

```

---

## 3. Arquivos Envolvidos e Especificação Técnica

### [Server-Side] Biblioteca do ClickUp

* **`src/lib/clickup.ts` [MODIFY]:**
* Remoção da configuração `next: { revalidate: 60 }` da função base `fetchClickUp`.
* Inclusão de `{ cache: 'no-store' }` nas opções padrão do `fetch`.



### [Server-Side] Rotas de API

* **`src/app/api/clickup/graph/route.ts` [MODIFY]:**
* Adição da diretiva do Next.js App Router: `export const dynamic = 'force-dynamic'`.



### [Client-Side] Hooks de Leitura do Grafo

* **`src/hooks/useClickUpData.ts` [MODIFY]:**
* Ajuste na configuração da chave `'clickup-graph'` reduzindo o `staleTime` para resposta ágil.



---

## ✅ Plano de Verificação e Testes Manuais

* [x] **Edição de Tarefa:** Alterar o nome de uma tarefa no painel e confirmar que o novo nome é refletido no card do mapa sem necessidade de dar F5.
* [x] **Adição de Item:** Criar um novo nó e validar se o refetch do React Query traz a lista/tarefa atualizada do ClickUp.
* [x] **Navegação de Trimestres:** Alternar entre os trimestres e garantir que as alterações salvas em background sejam mantidas.
* [x] **Rate Limit Test:** Verificar se os logs do servidor respondem com status `200` sem erros `429 Too Many Requests` do ClickUp durante o uso moderado.
