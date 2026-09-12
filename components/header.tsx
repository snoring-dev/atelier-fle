import Link from "next/link";
import { Text } from "@/components/text";

const navItems = [
  { href: "/", label: "Séance" },
  { href: "/lexique", label: "Lexique" },
  { href: "/archive", label: "Archive" },
] as const;

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-heading text-base font-semibold text-primary"
        >
          Atelier FLE
        </Link>
        <nav
          className="flex items-center gap-6"
          aria-label="Navigation principale"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              <Text as="span">{item.label}</Text>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
