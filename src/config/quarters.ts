export const SEASON_FIELD_ID = process.env.SEASON_FIELD_ID!;

export const SEASON_MAP = {
  SUMMER: process.env.SUMMER_ID!,
  FALL: process.env.FALL_ID!,
  WINTER: process.env.WINTER_ID!,
  SPRING: process.env.SPRING_ID!,
} as const;

export type Season = keyof typeof SEASON_MAP;