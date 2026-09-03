# [Epic-02] Plan: Pipeline de Descoberta de IDs e Mapeamento de Status do ClickUp

**O que é:** Estratégia de diagnóstico em tempo de execução para inspecionar, registrar e catalogar a estrutura exata de status (`status_name`, `status_id`, cores e categorias) retornada pela API do ClickUp. Essa descoberta alimenta o arquivo centralizador `STATUS_CONFIG`, garantindo sincronização sem erros entre a UI e o backend.

**Identificador:** `001-status-discovery-pipeline`  
**Status:** Concluído / Em Produção  
**Complexidade:** Baixa-Média  

---

## 1. O que a Funcionalidade Faz (Comportamento & Diagnóstico)

### 1.1. Inspeção de Status por Tarefa (Client-Side)
* **Visualização no Console:** Insere logs direcionados no componente `NodeDetailPanel` ao selecionar qualquer nó do tipo `task` ou `subtask`.
* **Identificação Estrutural:** Permite inspecionar se a propriedade `status` no objeto retornado é uma string simples (ex: `"in progress"`) ou um objeto complexo contendo `id`, `status`, `color` e `type`.

### 1.2. Mapeamento por Lista e Espaço (Server-Side)
* **Mapeamento no Transformador:** Como o ClickUp permite que diferentes listas/pastas tenham fluxos e nomes de status personalizados, o transformador (`graph-transformer.ts`) registra no terminal do servidor a coleção `list.statuses`.
* **Extração de Metadados:** Mapeia a relação direta entre `status_name`, `status_id`, `color` e `orderindex`.

---

## 2. Fluxo de Descoberta e Alimentação do `STATUS_CONFIG`

```text
[Abertura do Grafo / Painel]
             │
             ├──► [Server Logs (Terminal)] ──► Mapeia `list.statuses` por Lista
             │
             └──► [Client Logs (DevTools)] ──► Mapeia objeto `task.status`
                                │
                                ▼
               [Mapeamento Manual / Mapeador de Domínio]
                                │
                                ▼
                   [Atualização do STATUS_CONFIG]
             (Id, Category, Label e Color padronizados)

```

---

## 3. Arquivos Envolvidos e Especificação Técnica

### [Diagnóstico Client-Side] Painel de Detalhes

* **`src/components/ui/NodeDetailPanel.tsx` [MODIFY]:**
* Adição de log temporário de depuração:
```typescript
console.log('DEBUG TASK STATUS:', task.status);

```





### [Diagnóstico Server-Side] Transformador de Dados

* **`src/lib/graph-transformer.ts` [MODIFY]:**
* Adição de log para inspecionar os status configurados no nível da lista:
```typescript
console.log(`[Status Discovery] List "${list.name}":`, list.statuses);

```





### [Configuração de Domínio] Mapeamento Central

* **`src/config/status.ts` [MODIFY]:**
* Atualização da constante `STATUS_CONFIG` com os IDs reais, slugs e mapeamentos por categoria (`not-started`, `active`, `done`).



---

## ✅ Checklist de Execução e Próximos Passos

* [x] Inserir log no `NodeDetailPanel.tsx` para captura no console do navegador.
* [x] Inserir log no `graph-transformer.ts` para captura no terminal do servidor Next.js.
* [x] Iniciar a aplicação e interagir com tarefas pertencentes a diferentes listas.
* [x] Extrair os valores reais de `status` e `status_id` dos logs gerados.
* [x] Atualizar a fonte da verdade em `src/config/status.ts` e remover os logs de diagnóstico.
