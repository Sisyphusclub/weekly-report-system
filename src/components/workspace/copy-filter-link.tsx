"use client";
import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
export function CopyFilterLink({ href }: { href: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        new URL(href, window.location.origin).toString(),
      );
      setMessage("链接已复制");
    } catch {
      setMessage("复制失败，请手动复制地址");
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={copy}>
        复制筛选链接
      </Button>
      {message && (
        <span role="status" className="text-body-regular text-text-secondary">
          {message}
        </span>
      )}
    </span>
  );
}
