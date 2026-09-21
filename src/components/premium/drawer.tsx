"use client";

import type { ModalProps } from "@/components/premium/modal";
import { Modal } from "@/components/premium/modal";

export type DrawerProps = Omit<ModalProps, "placement">;

export function Drawer(props: DrawerProps) {
  return <Modal {...props} placement="right" />;
}
