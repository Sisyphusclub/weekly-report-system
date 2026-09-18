import { BusinessError } from "./api";

/** Read at most maxBytes before invoking JSON or multipart parsers. */
export async function boundedBody(request: Request, maxBytes: number) {
  const tooLarge = () => new BusinessError("导入文件或请求体过大", 413);
  if (Number(request.headers.get("content-length")) > maxBytes) {
    await request.body?.cancel();
    throw tooLarge();
  }
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const reader = request.body?.getReader();
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw tooLarge();
        }
        chunks.push(new Uint8Array(value));
      }
    } finally {
      reader.releaseLock();
    }
  }
  return new Response(new Blob(chunks), {
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
    },
  });
}
