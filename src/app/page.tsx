import Link from "next/link";
import { Sparkles, MapPin, Shield } from "lucide-react";
import { AiChat } from "@/components/home/ai-chat";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-zinc-900">
        <div className="gradient-gold pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-xs font-medium text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            IA + marketplace France
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-50 md:text-6xl">
            Votre projet de tatouage,{" "}
            <span className="text-amber-400">guidé puis matché</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-400">
            Retvy qualifie votre idée avec l&apos;intelligence artificielle, puis
            vous oriente vers les tatoueurs et pierceurs les plus adaptés à votre
            style, votre ville et votre budget.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="#chat">
              <Button size="lg">Démarrer avec l&apos;IA</Button>
            </Link>
            <Link href="/pro/inscription">
              <Button variant="outline" size="lg">
                Je suis professionnel
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-100">
              Parlez-nous de votre projet
            </h2>
            <p className="mt-2 text-zinc-500">
              L&apos;assistant affine emplacement, style, dimensions et budget
              avant de vous proposer une sélection d&apos;artistes.
            </p>
            <AiChat />
          </div>
          <div className="space-y-8 pt-4">
            {[
              {
                icon: Sparkles,
                title: "Qualification IA",
                text: "GPT-4o mini comprend votre brief et structure les critères de recherche.",
              },
              {
                icon: MapPin,
                title: "Pros en France",
                text: "Tatoueurs et pierceurs vérifiés, profils publics sur /ink/[slug].",
              },
              {
                icon: Shield,
                title: "Paiements sécurisés",
                text: "Stripe Connect pour les pros, réservation et facturation simplifiées.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-200">{title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
