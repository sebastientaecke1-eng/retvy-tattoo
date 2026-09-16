import type { Metadata } from "next";
import { CatalogueClient } from "@/components/catalogue/catalogue-client";

export const metadata: Metadata = {
  title: "Trouver un tatoueur | Retvy",
  description:
    "Parcourez les tatoueurs et studios en France. Filtrez par style, ville, et prenez rendez-vous en ligne avec acompte sécurisé.",
  openGraph: {
    title: "Trouver un tatoueur | Retvy",
    description: "Découvrez les meilleurs tatoueurs près de chez vous sur Retvy.",
    url: "https://retvy.fr/artistes",
  },
};

export const dynamic = "force-dynamic";

// Data is always loaded client-side via /api/artists to avoid baked-in env key issues
export default function ArtistesPage() {
  return <CatalogueClient artists={[]} />;
}
