import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-zinc-500">
          © {new Date().getFullYear()} Retvy — Marketplace tatouage & piercing
          en France.
        </p>
        <div className="flex gap-6 text-sm text-zinc-500">
          <Link href="/connexion" className="hover:text-amber-400">
            Connexion
          </Link>
          <Link href="/pro/inscription" className="hover:text-amber-400">
            Devenir pro
          </Link>
        </div>
      </div>
    </footer>
  );
}
