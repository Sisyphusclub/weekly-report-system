"use client";

import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/utils/cx";

export interface ModalProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  placement?: "center" | "right";
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
  placement = "center",
}: ModalProps) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cx(
        "fixed inset-0 z-50 flex",
        placement === "right"
          ? "items-stretch justify-end"
          : "items-center justify-center p-4",
      )}
      role="presentation"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-foreground/30 backdrop-blur-[2px]"
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "编辑内容"}
        initial={{
          opacity: 0,
          x: reduceMotion ? 0 : placement === "right" ? "100%" : 0,
          y: reduceMotion ? 0 : placement === "center" ? 8 : 0,
        }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        className={cx(
          "relative z-10 flex w-full flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-xl",
          placement === "right"
            ? "h-dvh max-w-lg border-y-0 border-r-0"
            : "max-h-[min(720px,calc(100dvh-32px))] max-w-2xl rounded-xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="关闭弹层"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </motion.section>
    </div>,
    document.body,
  );
}
