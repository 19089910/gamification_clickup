# [Epic-02] Plan: Restauração da UI Instantânea e Sincronização de Query Keys

**O que é:** Restauração do comportamento de resposta instantânea da interface no mapa mental. Corrige o descompasso entre a chave da query (`queryKey`) utilizada pelos componentes/hooks e a utilizada no manipulador de dados do React Query, além de eliminar travamentos visuais causados pela flag `isLoading` durante re-fetches em segundo plano.

**Identificador:** `002-restoring-instant-ui-updates`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média  

---

## 1. O que a Funcionalidade Faz (Comportamento & UX)

### 1.1. Sincronização de Cache Buckets (`spaceId`)
* **Diagnóstico da Falha:** A UI perdia o feedback instantâneo porque componentes tentavam ler ou atualizar o cache usando `['clickup-graph']`, enquanto o hook de dados utilizava `['clickup-graph', spaceId]`. Isso fazia com que as atualizações fossem enviadas para um *bucket* de cache isolado e ignorado pelo canvas.
* **Correção:** Unificação da chave global para `['clickup-graph', spaceId]`, garantindo que toda mutação otimista acerte exatamente o cache consumido pelo React Flow.

### 1.2. Desbloqueio do Render no Canvas (`useClickUpData`)
* **Fim do "Tela Branca/Loading Screen":** A checagem `!isLoading` foi removida do efeito de montagem do grafo (`buildGraph`). Se o cache local já possui dados (`data`), o mapa renderiza os nós imediatamente — mesmo se houver uma busca em segundo plano (*background refetch*) acontecendo.

### 1.3. Atualização Otimista de Custom Fields (Trimestres)
* Ajuste na mutação local do `NodeDetailPanel` para injetar o valor atualizado dentro do array `custom_fields` do ClickUp. Isso permite que o transformador de grafo re-computará o estado e o destaque do nó no mesmo frame sem depender da API.

---

## 2. Fluxo de Execução e Cache Key Alignment

```text
[Ação na UI (Ex: Mudar Trimestre)]
                 │
                 ▼
     [NodeDetailPanel / Hooks]
                 │
  (Usa queryKey unificada com spaceId)
                 │
                 ▼
[queryClient.setQueryData(['clickup-graph', spaceId])]
                 │
                 ▼
     [useClickUpData: buildGraph()]
     (Ignora flag isLoading em background)
                 │
                 ▼
    [UI Otimista Refletida na Tela (0ms)]

```

---

## 3. Arquivos Envolvidos e Especificação Técnica

### [Core] Hook de Leitura de Dados

* **`src/hooks/useClickUpData.ts` [MODIFY]:**
* Remoção da trava `!isLoading` no efeito de reconstrução do grafo, permitindo que dados otimistas no cache atualizem a tela sem aguardar o retorno da rede.



### [UI] Componentes e Páginas

* **`src/app/map/page.tsx` [MODIFY]:**
* Injeção e sincronização do `spaceId` na chamada dos dados e na store.


* **`src/components/ui/NodeDetailPanel.tsx` [MODIFY]:**
* Ajuste no payload de `queryClient.setQueryData` para atualizar o array `custom_fields` da tarefa e fundir os dados com a estrutura original do cache.



---

## ✅ Plano de Verificação e Testes Manuais

* [x] **Renomear Tarefa:** Alterar o nome de uma tarefa e confirmar atualização imediata no card.
* [x] **Trocar Trimestre:** Alterar o trimestre e validar que o nó se move/muda de destaque sem exibir o indicador de carregamento geral do mapa.
* [x] **Nenhum Flash de Tela:** Confirmar que re-fetches em background não causam piscamento ou desconstrução do canvas do React Flow.
