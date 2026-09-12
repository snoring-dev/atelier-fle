import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TooltipProvider>
      <div className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
