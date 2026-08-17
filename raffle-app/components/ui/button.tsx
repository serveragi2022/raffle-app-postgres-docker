import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded font-semibold text-body-md transition disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary hover:bg-primary/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
        secondary:
          "bg-secondary text-on-secondary hover:bg-secondary/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
        outline:
          "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
        ghost: "text-on-surface hover:bg-surface-container-low",
        destructive: "bg-error text-on-error hover:bg-error/90",
      },
      size: {
        sm: "h-8 px-3 text-label-md",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-title-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
