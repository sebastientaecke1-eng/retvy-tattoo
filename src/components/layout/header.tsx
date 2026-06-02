import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900/80 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-amber-400">Ret</span>
          <span className="text-zinc-100">vy</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <Link href="/#chat" className="hover:text-amber-400 transition-colors">
            Qualifier mon projet
          </Link>
          <Link href="/ink/demo" className="hover:text-amber-400 transition-colors">
            Exemple profil
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/connexion">
            <Button variant="ghost" size="sm">
              Connexion
            </Button>
          </Link>
          <Link href="/inscription-client" className="hidden sm:block">
            <Button size="sm">Client</Button>
          </Link>
          <Link href="/pro/inscription" className="hidden sm:block">
            <Button variant="outline" size="sm">
              Pro
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
