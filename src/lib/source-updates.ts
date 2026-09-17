import { z } from "zod";
const snapshotSchema = z.object({
  sourceReports: z.array(
    z.object({ id: z.string(), version: z.number().int().positive() }),
  ),
});
export function sourceReferences(snapshot: unknown) {
  const parsed = snapshotSchema.safeParse(snapshot);
  return parsed.success ? parsed.data.sourceReports : [];
}
export function updatedSources(
  snapshot: unknown,
  current: Array<{ id: string; version: number }>,
) {
  const versions = new Map(current.map((item) => [item.id, item.version]));
  return sourceReferences(snapshot)
    .filter(
      (item) => versions.has(item.id) && versions.get(item.id) !== item.version,
    )
    .map((item) => item.id);
}
