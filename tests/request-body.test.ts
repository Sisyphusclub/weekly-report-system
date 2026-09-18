import { expect, it, vi } from "vitest";
import { boundedBody } from "../src/lib/request-body";

it.each([undefined, "1", "invalid"])(
  "enforces actual size with length %s",
  async (length) => {
    const request = new Request("https://test.invalid", {
      method: "POST",
      body: "12345",
      headers: length === undefined ? {} : { "content-length": length },
    });
    await expect(boundedBody(request, 4)).rejects.toMatchObject({
      status: 413,
    });
  },
);
it("permits exactly the limit and preserves JSON", async () => {
  const body = await boundedBody(
    new Request("https://test.invalid", { method: "POST", body: "[12]" }),
    4,
  );
  expect(await body.json()).toEqual([12]);
});
it("counts UTF-8 bytes rather than characters", async () => {
  await expect(
    boundedBody(
      new Request("https://test.invalid", { method: "POST", body: "中文" }),
      5,
    ),
  ).rejects.toMatchObject({ status: 413 });
});
it("preserves multipart boundary and file contents", async () => {
  const form = new FormData();
  form.set("file", new Blob(["test"]), "tasks.xlsx");
  const result = await boundedBody(
    new Request("https://test.invalid", { method: "POST", body: form }),
    4096,
  );
  const parsed = await result.formData();
  expect(await (parsed.get("file") as File).text()).toBe("test");
});
it("cancels reading when streamed chunks exceed the limit", async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(3));
    },
    cancel,
  });
  const request = { headers: new Headers(), body: stream } as Request;
  await expect(boundedBody(request, 4)).rejects.toMatchObject({ status: 413 });
  expect(cancel).toHaveBeenCalledOnce();
});
