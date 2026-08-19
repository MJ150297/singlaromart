import * as React from "react";
import { cn } from "./utils";

export type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement>;

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-xs text-rose-600 dark:text-rose-400 mt-1", className)} {...props} />
));
FormMessage.displayName = "FormMessage";

export { FormMessage };