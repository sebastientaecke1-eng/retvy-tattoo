import { redirect } from "next/navigation";

export default async function ProDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const params = await searchParams;

  if (params.connect === "success" || params.connect === "refresh") {
    redirect(`/pro/dashboard/acompte?connect=${params.connect}`);
  }

  redirect("/pro/dashboard/reservations");
}
