import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600",
      "focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
