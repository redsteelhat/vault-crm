import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * CMP / Button — Design system: variant (primary|secondary|ghost|destructive),
 * size sm(36h) | md(44h) | lg(52h), state via hover/focus/disabled, icon none|leading|trailing|only
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ds-md text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-touch-sm min-h-touch-sm px-3 text-body-sm [&_svg]:size-4",
        md: "h-touch-md min-h-touch-md px-4 text-body [&_svg]:size-4",
        lg: "h-touch-lg min-h-touch-lg px-6 text-body-lg [&_svg]:size-5",
        icon: "h-touch-md w-touch-md [&_svg]:size-4",
        "icon-sm": "h-touch-sm w-touch-sm [&_svg]:size-4",
        "icon-lg": "h-touch-lg w-touch-lg [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
