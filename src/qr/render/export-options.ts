/**
 * Export choices safe to load with the generator shell.
 *
 * Keep these values outside `export.ts`: that module intentionally reaches the
 * renderer and PDF stack, while a size selector needs only this tiny contract.
 */
export const PNG_EXPORT_SIZES = [512, 1024, 2048] as const;
export type PngExportSize = (typeof PNG_EXPORT_SIZES)[number];

export const DEFAULT_PNG_SIZE: PngExportSize = 1024;
