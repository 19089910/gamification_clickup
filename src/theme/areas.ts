export const AREA_COLORS: Record<string, string> = {
  Agência: '#22C55E',
  Trabalho: '#3B82F6',
  Acadêmico: '#EAB308',
  Científico: '#F97316',
  Financeiro: '#15803D',
  Saúde: '#E5E7EB',
  Artístico: '#8B5CF6',
  Família: '#EC4899',
  Inglês: '#06B6D4',
  'Igreja/Social': '#EF4444',
  Exploração: '#18181B',
};

export function getAreaColor(name: string): string {
  const lowerName = name.toLowerCase();

  for (const [area, color] of Object.entries(AREA_COLORS)) {
    if (area.includes('/')) {
      const parts = area.split('/');

      if (
        parts.some((p) =>
          lowerName.includes(p.toLowerCase())
        )
      ) {
        return color;
      }
    } else {
      if (lowerName.includes(area.toLowerCase())) {
        return color;
      }
    }
  }

  return '#0ea5e9';
}