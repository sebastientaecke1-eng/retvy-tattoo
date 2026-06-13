import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variants: Record<Variant, string> = {
  primary:
    "bg-blue-500 text-black hover:bg-blue-400 font-semibold shadow-lg shadow-blue-500/20",
  secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700",
  ghost: "text-zinc-300 hover:text-blue-400 hover:bg-zinc-900",
  outline:
    "border border-blue-500/50 text-blue-400 hover:bg-blue-500/10",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
