### **`TempNode` & `TempNodeSlice` — Resumo Técnico**

#### **1. O que é o `TempNode`?**

O `TempNode` é um **nó de formulário inline** renderizado no mapa visual (React Flow) para permitir a criação rápida de novos itens na hierarquia (`Folder` ➔ `List` ➔ `Task` ➔ `Subtask`) sem abrir modais externos.

* **Type Discriminator:** `'temp'`
* **Instância:** `Node<TempNodeData, 'temp'>`
* **Interface `TempNodeData`:**
```typescript
export interface TempNodeData extends BaseNodeData {
  label: string;
  isTemp: boolean;
  parentId: string;
  parentType: 'folder' | 'list' | 'task';
  quarter?: Season | null;
  collapsed: boolean;
}

```



---

#### **2. Regras de Relacionamento (`parentType`)**

O tipo do nó pai determina o tipo de entidade que o `TempNode` irá persistir na API do ClickUp:

| `parentType` | Nó Pai | Entidade Gerada no Commit | Slice da API Utilizado |
| --- | --- | --- | --- |
| `'folder'` | **FolderNode** | Cria uma nova **List** | `createList(folderId, name, quarter)` |
| `'list'` | **ListNode** | Cria uma nova **Task** | `createTask(listId, name, quarter)` |
| `'task'` | **TaskNode** | Cria uma nova **Subtask** | `createSubtask(parentTaskId, name)` |

---

#### **3. Métodos do `TempNodeSlice**`

O ciclo de vida do `TempNode` no mapa é controlado inteiramente por 3 ações:

```typescript
export interface TempNodeSlice {
  /** Adiciona um TempNode no grafo vinculado ao nó pai selecionado */
  addTempNode: (parentId: string, parentType: 'folder' | 'list' | 'task') => void;

  /** Remove o TempNode sem salvar (ex: ao pressionar ESC ou cancelar) */
  removeTempNode: (tempNodeId: string) => void;

  /** Converte o TempNode em uma entidade real via API e substitui no grafo */
  commitTempNode: (tempNodeId: string, name: string, quarter?: Season | null) => Promise<void>;
}

```

---

#### **4. Ciclo de Vida & Fluxo de Dados**

1. **Invocação (`addTempNode`):** Disparado via atalho de teclado (`Tab`) ou botão UI. Gera um nó com ID temporário (`temp-${Date.now()}`) posicionado próximo ao pai.
2. **Edição Inline:** O usuário digita o nome do item direto no componente do card temporário no canvas.
3. **Persistência (`commitTempNode`):**
* Lê o `parentId` e o `parentType` do `TempNodeData`.
* Executa a mutation correspondente (`createList`, `createTask` ou `createSubtask`).
* Remove o `TempNode` temporário do grafo e insere o nó definitivo retornado pelo backend.


4. **Cancelamento (`removeTempNode`):** Descarta a adição e limpa o nó da store/canvas sem efeitos colaterais.