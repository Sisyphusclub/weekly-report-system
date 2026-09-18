/** Excel dates have no timezone; ExcelJS decodes serial dates as UTC. */
export function excelDate(value: unknown): unknown {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return value;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") return value.trim() || null;
  return value ?? null;
}
