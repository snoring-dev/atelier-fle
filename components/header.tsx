import Link from "next/link";

const navItems = [
  { href: "/", label: "Séance" },
  { href: "/lexique", label: "Lexique" },
  { href: "/archive", label: "Archive" },
] as const;

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold text-primary">
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
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
