# [Epic-04] Melhorias Contínuas (Enhancements)
## Fix: Erro 500 Intermitente e Alta Latência na Rota do Grafo (/api/clickup/graph)

**Identificador:** `fix_clickup_graph_timeout_500`  
**Status:** Emergencial / Investigação  
**Complexidade:** Alta (Envolve concorrência e cache)  

---

### 🚨 Descrição do Problema
A rota `/api/clickup/graph` está apresentando falhas intermitentes de HTTP 500 com tempos de resposta extremamente altos (chegando a 12.7 segundos). Há um forte indício de que o token do ClickUp não tolera requisições pesadas simultâneas, resultando em bloqueios ou timeouts no servidor.

**Log do Terminal:**
```text
GET /api/clickup/graph?spaceId=90175073398 500 in 12.7s (Next.js Timeout / Rate Limit) 🟥
GET /api/clickup/graph?spaceId=90175073398 200 in 3.4s  (Sucesso isolado)
GET /api/clickup/graph?spaceId=90175073398 500 in 4.7s  (Bloqueio subsequente)
```

### 🛠️ Solução Proposta para Investigação
1. **Fila de Requisições / Mutex (Single Active Request):** Impedir que o mesmo `spaceId` faça requisições concorrentes na API do Next.js se já houver uma busca idêntica em andamento.
2. **Estratégia de Cache Abstrato (Stale-While-Revalidate):** Implementar um cache temporário rápido (ex: memória do Node ou Redis de poucos segundos) para a rota do grafo, evitando bater no ClickUp em cliques duplicados seguidos.

---

### ✅ Critérios de Aceitação

- [ ] **Mecanismo Anti-Deduplicação:** Implementar uma trava para que requisições repetidas idênticas aguardem a primeira terminar ou usem a mesma Promise em andamento.
- [ ] **Tratamento de Timeout Explicito:** Configurar um limite máximo de tempo de espera na chamada externa e retornar um status amigável (ex: 429 ou 504) se o ClickUp travar.
- [ ] **Log de Concorrência:** Adicionar um log no terminal do Next.js quando houver tentativas de chamadas simultâneas com o mesmo token.
---

**Previsão: 2 a 3 commits (1 log/diagnóstico, 1 implementação de trava/cache, 1 tratamento de erro).**