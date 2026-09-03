import { ClickUpTask } from '@/types/clickup';
import { SEASON_MAP, TRIMESTRE_FIELD_ID, SEASONS } from '@/config/quarters';
import { Season } from '@/types/graph';


// ============================================================================
// ClickUp Field Extraction Helpers
// ============================================================================

function isSeason(value: string): value is Season {
    return SEASONS.includes(value as Season);
}

/**
 * Extrai o quarter de uma única task do ClickUp observando os custom_fields.
 */
export function getTaskQuarter(task: ClickUpTask): Season | null {
    const field = task.custom_fields?.find(f => f.id === TRIMESTRE_FIELD_ID);

    if (!field || field.value === undefined) return null;

    // Caminho normal: type_config presente (dados reais da API)
    const options = field.type_config?.options;
    if (options) {
        const selected = options.find(
            (o: any) => o.id === field.value || o.orderindex === field.value
        );
        if (selected?.name) {
            const upper = selected.name.toUpperCase();
            return isSeason(upper) ? upper : null;
        }
    }

    // Fallback: campo injetado otimisticamente (sem type_config)
    const entry = Object.entries(SEASON_MAP).find(([, uuid]) => uuid === field.value);
    const key = entry?.[0] ?? null;
    return key && isSeason(key) ? key : null;
}

/**
 * Extrai todos os quarters presentes em um conjunto de tasks.
 */
export function getListQuarters(tasks: ClickUpTask[]): string[] {
    const quarters = new Set<string>();

    for (const task of tasks) {
        const val = getTaskQuarter(task);
        if (!val) continue;

        for (const season of SEASONS) {
            if (val.includes(season)) {
                quarters.add(season);
            }
        }
    }

    return Array.from(quarters);
}

// ============================================================================
// Business Logic & Fallback Resolvers
// ============================================================================

/**
 * Define o quarter primário com base na ordem cronológica de estações.
 */
export function getPrimaryQuarter(quarters: string[]): string | null {
    return SEASONS.find(q => quarters.includes(q)) ?? null;
}

/**
 * Tenta resolver o quarter primário pelo nome da lista; se não encontrar,
 * utiliza o quarter primário obtido através das tasks.
 */
export function resolveListPrimaryQuarter(
    listName: string,
    fallbackQuarter: string | null
): string | null {
    const nameUpper = listName.toUpperCase();
    const foundSeason = SEASONS.find(season => nameUpper.includes(season));
    return foundSeason ?? fallbackQuarter;
}

/**
 * Garante que o primaryQuarter esteja presente na lista final de quarters resolvidos.
 */
export function buildResolvedQuarters(
    quarters: string[],
    primaryQuarter: string | null
): string[] {
    if (primaryQuarter && !quarters.includes(primaryQuarter)) {
        return [...quarters, primaryQuarter];
    }
    return quarters;
}