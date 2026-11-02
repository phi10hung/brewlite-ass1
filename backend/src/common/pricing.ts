export const SIZE_EXTRA = { S: 0, M: 5000, L: 10000 } as const;
export type Size = keyof typeof SIZE_EXTRA;