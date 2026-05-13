import { ClickUpTask } from '@/types/clickup';
import { SEASON_MAP, TRIMESTRE_FIELD_ID } from '@/config/quarters';

// Extrai múltiplos quarters das tasks
export function getListQuarters(tasks: ClickUpTask[]): string[] {
  const quarters = new Set<string>();

  for (const task of tasks) {
    if (!task.custom_fields) continue;

    const field = task.custom_fields.find(f =>
      f.id === TRIMESTRE_FIELD_ID
    );

    if (!field || field.value === undefined) continue;

    let val: string | null = null;

    // Caminho normal: type_config presente (dados reais da API)
    const options = field.type_config?.options;
    if (options) {
      const selected = options.find((o: any) =>
        o.id === field.value || o.orderindex === field.value
      );
      val = selected?.name?.toUpperCase() ?? null;
    }

    // Fallback: campo injetado otimisticamente (sem type_config)
    if (!val) {
      const entry = Object.entries(SEASON_MAP).find(
        ([, uuid]) => uuid === field.value
      );
      val = entry?.[0] ?? null; 
    }

    if (!val) continue;

    if (val.includes('SUMMER')) quarters.add('SUMMER');
    if (val.includes('FALL')) quarters.add('FALL');
    if (val.includes('WINTER')) quarters.add('WINTER');
    if (val.includes('SPRING')) quarters.add('SPRING');
  }

  return Array.from(quarters);
}

export function getPrimaryQuarter(quarters: string[]): string | null {
  const order = ['SUMMER', 'FALL', 'WINTER', 'SPRING'];
  return order.find(q => quarters.includes(q)) || null;
}

export function getTaskQuarter(task: ClickUpTask): string | null {
  const field = task.custom_fields?.find(f =>
    f.id === TRIMESTRE_FIELD_ID
  );

  if (!field || field.value === undefined) return null;

  // Caminho normal
  const options = field.type_config?.options;
  if (options) {
    const selected = options.find((o: any) =>
      o.id === field.value || o.orderindex === field.value
    );
    if (selected?.name) return selected.name.toUpperCase();
  }

  // Fallback otimista
  const entry = Object.entries(SEASON_MAP).find(([, uuid]) => uuid === field.value);
  return entry?.[0] ?? null;
}
