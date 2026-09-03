# [Epic-01] Plan: Criação Refinada de Listas e Vínculo de Campo Customizado (Trimestres)

**O que é:** Refinamento do fluxo de criação de Listas a partir de Pastas (`FolderNode`). Garante a seleção do trimestre (`Q1` a `Q4`), a associação automática do Custom Field *"Trimestres"* à nova lista no ClickUp e a criação da tarefa padrão de sustentação (`geral`) vinculada ao trimestre correto.

**Identificador:** `003-refined-list-rendering`  
**Status:** Concluído / Em Produção  
**Complexidade:** Média  

---

## 1. O que a Funcionalidade Faz (Comportamento & UX)

### 1.1. Fluxo de Criação Multietapa
Ao acionar a criação de uma lista a partir de um `FolderNode` (via botão `+` ou duplo clique):
1. **Nome da Lista:** O sistema solicita o nome da nova lista.
2. **Seleção de Trimestre:** O sistema solicita o trimestre de associação (`Q1`, `Q2`, `Q3` ou `Q4`).
3. **Validação:** Aceita apenas entradas válidas referentes às opções de trimestre suportadas.

### 1.2. Regras e Automações de Backend
Quando o servidor recebe a requisição de criação da lista (`POST /api/clickup/lists`):
* **Criação da Lista:** Cria a entidade no ClickUp sob a pasta pai informada.
* **Vínculo do Campo Customizado:** Garante que o campo customizado **"Trimestres"** (ID: `8290f74e-4241-4eac-af4a-08018ecbbffa`) seja associado à nova lista via `addCustomFieldToList`.
* **Tratamento de Exceção (`FIELD_198`):** Caso o campo customizado já exista na lista (herança da pasta), o erro retornado pela API do ClickUp é ignorado graciosamente sem interromper a execução.
* **Criação da Tarefa Inicial:** Gera automaticamente a tarefa inicial `geral` configurada com a tag/opção do trimestre selecionado pelo usuário.

---

## 2. Fluxo de Dados e Integração

```text
[Usuário no FolderNode] ──► [Input: Nome & Quarter]
                                     │
                                     ▼
                      [POST /api/clickup/lists]
                                     │
                                     ▼
                        [ClickUp: Create List]
                                     │
                                     ▼
                     [addCustomFieldToList (Field ID)]
                  (Ignora erro se retornado FIELD_198)
                                     │
                                     ▼
                    [Create Task 'geral' + Option ID]
                                     │
                                     ▼
                     [Zustand & Query Invalidation]

```

---

## 3. Arquivos Envolvidos e Modificações Tecnológicas

### [Backend] Integração ClickUp e API Route

* **`src/lib/clickup.ts` [MODIFY]:**
* Implementação da função `addCustomFieldToList(listId: string, fieldId: string)`.


* **`src/app/api/clickup/lists/route.ts` [MODIFY]:**
* Atualização do handler `POST` para encadear a ativação do campo customizado e a criação da tarefa padrão `geral` associada ao trimestre.
* Captura e tratamento de erros do código `FIELD_198`.



### [Frontend] Interface de Usuário e Eventos

* **`src/components/graph/nodes/FolderNode.tsx` [MODIFY]:**
* Atualização do handler `handleCreateList` para capturar e validar Nome e Trimestre (`Q1`-`Q4`).


* **`src/components/graph/GraphCanvas.tsx` [MODIFY]:**
* Atualização do manipulador de duplo clique no `FolderNode` para seguir o fluxo multietapa.



---

## ✅ Checklist de Implementação e Aceite

* [x] Função `addCustomFieldToList` adicionada em `src/lib/clickup.ts`.
* [x] Endpoint `POST /api/clickup/lists` atualizado para assegurar a presença do campo customizado e ignorar o erro `FIELD_198`.
* [x] Validação de input dos trimestres (`Q1`, `Q2`, `Q3`, `Q4`) no frontend.
* [x] Handler no `FolderNode.tsx` atualizado com fluxo de atribuição.
* [x] Handler de duplo clique em `GraphCanvas.tsx` atualizado.
* [x] Validação manual da criação da lista com o campo *"Trimestres"* ativado e a tarefa `geral` associada no ClickUp.
