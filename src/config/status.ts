export type StatusCategory =
  | 'not-started'
  | 'active'
  | 'done';

export interface StatusItem {
  id: string;
  label: string;
  color: string;
  category: StatusCategory;
}

export const STATUS_CONFIG: StatusItem[] = [
  {
    id: 'planning',
    label: 'PLANNING',
    color: '#87909e',
    category: 'not-started',
  },
  {
    id: 'in progress',
    label: 'EM PROGRESSO',
    color: '#5f55ee',
    category: 'active',
  },
  {
    id: 'at risk',
    label: 'AT RISK',
    color: '#e16b16',
    category: 'active',
  },
  {
    id: 'update required',
    label: 'UPDATE REQUIRED',
    color: '#f8ae00',
    category: 'active',
  },
  {
    id: 'on hold',
    label: 'ON HOLD',
    color: '#aa8d80',
    category: 'active',
  },
  {
    id: 'complete',
    label: 'CONCLUÍDO',
    color: '#0f9d9f',
    category: 'done',
  },
];

/**
 * Busca o StatusItem correspondente na configuração pelo ID ou pelo texto vindo da API/UI.
 */
export function getStatus(statusAttr: string): StatusItem | null {
  if (!statusAttr) return null;
  const normalized = statusAttr.trim().toLowerCase();

  return (
    STATUS_CONFIG.find(
      (item) => item.id.toLowerCase() === normalized || item.label.toLowerCase() === normalized
    ) || null
  );
}

/**
 * Retorna a categoria ('not-started' | 'active' | 'done') de um determinado status.
 */
export function getCategory(statusAttr: string): StatusCategory | null {
  const item = getStatus(statusAttr);
  return item ? item.category : null;
}