import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-md", {
  variants: {
    variant: {
      gold: "bg-gold/15 text-tertiary-container",
      standard: "bg-surface-container-high text-on-surface",
      success: "bg-secondary-container text-on-secondary-container",
      error: "bg-error-container text-on-error-container",
      outline: "border border-outline-variant text-on-surface-variant",
    },
  },
  defaultVariants: { variant: "standard" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
