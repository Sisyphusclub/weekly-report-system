"use client";

import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/motion/button/base";

export function SecurityBackLink({ href }: { href: string }) {
  return (
    <ButtonLink href={href} variant="ghost" size="small" className="self-start">
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      返回工作台
    </ButtonLink>
  );
}
