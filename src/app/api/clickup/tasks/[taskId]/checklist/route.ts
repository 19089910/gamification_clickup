import { NextRequest, NextResponse } from "next/server";
import { BASE_URL, getHeaders } from "@/lib/clickup/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const body = await req.json();
    const { items } = body as {
      items: {
        checklistId: string;
        id: string;
        name: string;
        resolved: boolean;
        isNew?: boolean; // Captura a flag de item novo do frontend
      }[];
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const headers = getHeaders();

    // 1. Verificação de segurança: Se houver itens novos, precisamos garantir uma checklist pai.
    // Se o primeiro item novo não tiver checklistId, criamos uma "Checklist Geral" na tarefa antes de rodar o loop.
    let sharedChecklistId = items.find(item => item.isNew)?.checklistId || "";

    if (items.some(item => item.isNew) && !sharedChecklistId) {
      const createChecklistRes = await fetch(`${BASE_URL}/task/${taskId}/checklist`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Checklist Geral" }),
      });

      if (!createChecklistRes.ok) {
        const errorText = await createChecklistRes.text();
        throw new Error(`Falha ao criar checklist pai automática no ClickUp: ${errorText}`);
      }

      const newChecklistData = await createChecklistRes.json();
      sharedChecklistId = newChecklistData.checklist.id;
    }

    // 2. Processa todas as operações (Criações e Atualizações) em paralelo de forma ultra rápida
    const results = await Promise.all(
      items.map(async (item) => {

        if (item.isNew) {
          // === FLUXO DE CRIAÇÃO (Item Novo) ===
          const targetId = item.checklistId || sharedChecklistId;

          const res = await fetch(`${BASE_URL}/checklist/${targetId}/checklist_item`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: item.name,
              resolved: item.resolved,
            }),
          });

          if (!res.ok) {
            const error = await res.text();
            throw new Error(`ClickUp API [POST] falhou para o item novo: ${error}`);
          }

          return res.json();

        } else {
          // === FLUXO DE ATUALIZAÇÃO (Item Existente) ===
          const res = await fetch(
            `${BASE_URL}/checklist/${item.checklistId}/checklist_item/${item.id}`,
            {
              method: "PUT",
              headers,
              body: JSON.stringify({
                name: item.name,
                resolved: item.resolved,
              }),
            }
          );

          if (!res.ok) {
            const error = await res.text();
            throw new Error(`ClickUp API [PUT] falhou para o item ${item.id}: ${error}`);
          }

          return res.json();
        }
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Erro na rota de checklist unificada:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}