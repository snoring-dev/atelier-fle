import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

const levelTag = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

const levelStyles = {
  1: "text-3xl font-semibold tracking-tight",
  2: "text-2xl font-semibold tracking-tight",
  3: "text-xl font-semibold tracking-tight",
  4: "text-lg font-medium",
  5: "text-base font-medium",
  6: "text-sm font-medium",
} as const;

type HeadingLevel = keyof typeof levelTag;

type HeadingProps = {
  level: HeadingLevel;
  className?: string;
  children: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<"h1">, "className" | "children">;

export function Heading({
  level,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = levelTag[level] as ElementType;

  return (
    <Tag
      className={cn(
        "font-heading text-foreground",
        levelStyles[level],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
