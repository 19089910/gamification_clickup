// Mapeamento baseado nos logs reais do workspace (Usando os nomes exatos que o ClickUp espera)
export const STATUS_CONFIG = [
  {
    category: 'Não Iniciado',
    statuses: [
      { id: 'planning', label: 'PLANNING', color: '#87909e' },
    ]
  },
  {
    category: 'Ativo',
    statuses: [
      { id: 'in progress', label: 'EM PROGRESSO', color: '#5f55ee' },
      { id: 'at risk', label: 'AT RISK', color: '#e16b16' },
      { id: 'update required', label: 'UPDATE REQUIRED', color: '#f8ae00' },
      { id: 'on hold', label: 'ON HOLD', color: '#aa8d80' },
    ]
  },
  {
    category: 'Feito',
    statuses: [
      { id: 'complete', label: 'CONCLUÍDO', color: '#0f9d9f' },
    ]
  }
];

// Helper para buscar status no config por ID ou por Nome
export function getStatusFromConfig(statusAttr: string) {
  if (!statusAttr) return null;
  const s = statusAttr.toLowerCase();
  for (const group of STATUS_CONFIG) {
    const found = group.statuses.find(item => 
      item.id === statusAttr || 
      item.label.toLowerCase() === s || 
      item.id.split('_').pop()?.toLowerCase() === s
    );
    if (found) return found;
  }
  return null;
}
