import Link from "next/link";

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
          <Link
            href="/connexion"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-amber-400"
          >
            Connexion
          </Link>
          <Link
            href="/inscription-client"
            className="hidden rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400 sm:inline-flex"
          >
            Client
          </Link>
          <Link
            href="/pro/inscription"
            className="hidden rounded-lg border border-amber-500/50 px-3 py-1.5 text-sm text-amber-400 transition-colors hover:bg-amber-500/10 sm:inline-flex"
          >
            Pro
          </Link>
        </div>
      </div>
    </header>
  );
}
