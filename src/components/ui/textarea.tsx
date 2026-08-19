import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const textareaVariants = cva(
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500",
  {
    variants: {
      size: {
        default: "h-24",
        sm: "h-20",
        lg: "h-28",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, size, ...props }, ref) => (
  <textarea ref={ref} className={cn(textareaVariants({ size }), className)} {...props} />
));
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
