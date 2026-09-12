import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type TextElement = "p" | "span" | "div" | "label" | "li";

type TextProps<T extends TextElement = "p"> = {
  as?: T;
  className?: string;
  children: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Text<T extends TextElement = "p">({
  as,
  className,
  children,
  ...props
}: TextProps<T>) {
  const Tag = (as ?? "p") as ElementType;

  return (
    <Tag className={cn("font-sans text-foreground", className)} {...props}>
      {children}
    </Tag>
  );
}
