"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  className,
  children,
  title,
  ...props
}: DialogPrimitive.DialogContentProps & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-40 animate-in fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 glass-panel bg-white/95 p-6 shadow-ambient",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          <DialogPrimitive.Title className="text-title-lg text-on-surface">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="text-on-surface-variant hover:text-on-surface">
            <X size={18} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
