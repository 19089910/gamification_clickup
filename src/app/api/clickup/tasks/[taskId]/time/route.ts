import { NextRequest, NextResponse } from "next/server";
import { BASE_URL, getHeaders } from "@/lib/clickup/api";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const body = await req.json();
        const { action } = body as { action: "start" | "stop" };

        if (!taskId) {
            return NextResponse.json({ error: "taskId is required" }, { status: 400 });
        }

        // 💡 IMPORTANTE: Substitua pelo ID real do seu Workspace do ClickUp.
        // Geralmente você pode ler do seu .env como: process.env.CLICKUP_TEAM_ID
        // Ou passar o ID direto temporariamente para testar, ex: "1234567"
        const teamId = process.env.CLICKUP_TEAM_ID;

        if (!teamId) {
            console.error("❌ ERRO: Você esqueceu de configurar o CLICKUP_TEAM_ID!");
            return NextResponse.json({ error: "Configuração de Team ID ausente no servidor" }, { status: 500 });
        }

        const headers = getHeaders();

        if (action === "start") {
            console.log(`[Timer] Tentando iniciar o cronômetro para a task: ${taskId} no Team: ${teamId}`);

            const res = await fetch(`${BASE_URL}/team/${teamId}/time_entries/start`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    tid: taskId
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`❌ Erro do ClickUp ao INICIAR timer [Status ${res.status}]:`, errText);
                return NextResponse.json({ error: `ClickUp Error: ${errText}` }, { status: res.status });
            }

            return NextResponse.json({ success: true, tracking: true });

        } else {
            console.log(`[Timer] Tentando parar o cronômetro ativo no Team: ${teamId}`);

            const res = await fetch(`${BASE_URL}/team/${teamId}/time_entries/stop`, {
                method: "POST",
                headers,
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`❌ Erro do ClickUp ao PARAR timer [Status ${res.status}]:`, errText);
                return NextResponse.json({ error: `ClickUp Error: ${errText}` }, { status: res.status });
            }

            return NextResponse.json({ success: true, tracking: false });
        }
    } catch (error) {
        console.error("❌ Erro crítico interno na rota de Time Tracking:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}