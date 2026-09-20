import { currentUser } from "@/lib/access";
import { getConfig } from "@/lib/config";

export class BusinessError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitEntries = new Map<string, RateLimitEntry>();

/** Process-local guard for expensive authenticated operations. */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  if (rateLimitEntries.size > 10_000) {
    for (const [entryKey, entry] of rateLimitEntries) {
      if (entry.resetAt <= now) rateLimitEntries.delete(entryKey);
    }
  }
  const current = rateLimitEntries.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitEntries.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    throw new BusinessError("操作过于频繁，请稍后重试", 429);
  }
  current.count += 1;
}

export async function writeActor(request: Request) {
  const readOnly = request.method === "GET" || request.method === "HEAD";
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  // Same-origin GETs and downloads commonly omit Origin. Writes must always
  // carry the configured origin; Fetch Metadata never substitutes for it.
  if (
    (origin !== null
      ? origin !== new URL(getConfig().BETTER_AUTH_URL).origin
      : !readOnly) ||
    (readOnly && site !== null && site !== "same-origin" && site !== "none")
  )
    throw new BusinessError("请求来源无效", 403);
  const actor = await currentUser();
  if (!actor) throw new BusinessError("请先登录", 401);
  if (!readOnly) {
    enforceRateLimit(`write:${actor.organizationId}:${actor.id}`, 120, 60_000);
  }
  return actor;
}
export function apiError(error: unknown) {
  if (error instanceof BusinessError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: error.status === 429 ? { "retry-after": "60" } : undefined,
      },
    );
  console.error("Business write failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    { error: "保存失败，请保留内容并稍后重试" },
    { status: 500 },
  );
}
