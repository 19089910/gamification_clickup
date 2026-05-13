function getEnv(
  value: string | undefined,
  name: string
): string {
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }

  return value;
}

export const SEASON_MAP = {
  SUMMER: getEnv(process.env.NEXT_PUBLIC_SUMMER_ID, 'NEXT_PUBLIC_SUMMER_ID'),
  FALL: getEnv(process.env.NEXT_PUBLIC_FALL_ID, 'NEXT_PUBLIC_FALL_ID'),
  WINTER: getEnv(process.env.NEXT_PUBLIC_WINTER_ID, 'NEXT_PUBLIC_WINTER_ID'),
  SPRING: getEnv(process.env.NEXT_PUBLIC_SPRING_ID, 'NEXT_PUBLIC_SPRING_ID'),
} as const;

export type Season = keyof typeof SEASON_MAP;

export const TRIMESTRE_FIELD_ID =
  getEnv(process.env.NEXT_PUBLIC_TRIMESTRE_FIELD_ID, 'NEXT_PUBLIC_TRIMESTRE_FIELD_ID');

export const SEASON_CONFIG = [
  { id: 'SUMMER' as Season, label: '☀️ SUMMER', color: '#F59E0B' },
  { id: 'FALL'   as Season, label: '🍂 FALL',   color: '#F97316' },
  { id: 'WINTER' as Season, label: '❄️ WINTER', color: '#38BDF8' },
  { id: 'SPRING' as Season, label: '🌸 SPRING', color: '#4ADE80' },
] as const;

export function getSeasonFromConfig(value: string | undefined) {
  if (!value) return null;
  return SEASON_CONFIG.find(s => s.id === value) ?? null;
}