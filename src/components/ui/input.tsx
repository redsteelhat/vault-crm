import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CMP / Input — Design system: size sm(36h) | md(44h),
 * state default|focus|disabled|error, affix none|leadingIcon|trailingIcon|clearButton
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Validation tone: neutral | error | success */
  validation?: "neutral" | "error" | "success";
  /** Size: sm 36px, md 44px (desktop standard) */
  inputSize?: "sm" | "md";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, validation = "neutral", inputSize = "md", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-ds-md border bg-background px-3 py-2 text-body ring-offset-background file:border-0 file:bg-transparent file:text-body file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          inputSize === "sm" && "h-touch-sm min-h-touch-sm text-body-sm",
          inputSize === "md" && "h-touch-md min-h-touch-md text-body",
          validation === "error" &&
            "border-destructive focus-visible:ring-destructive",
          validation === "success" &&
            "border-success focus-visible:ring-success",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
