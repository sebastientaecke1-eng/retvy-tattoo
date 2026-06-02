import { Suspense } from "react";
import { OnboardingWizard } from "@/components/pro/onboarding-wizard";
import { ProInscriptionIntro } from "@/components/pro/pro-inscription-intro";
import { ProInscriptionLoading } from "@/components/pro/pro-inscription-loading";

export default function ProInscriptionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <ProInscriptionIntro />
      <div className="mt-8">
        <Suspense fallback={<ProInscriptionLoading />}>
          <OnboardingWizard />
        </Suspense>
      </div>
    </div>
  );
}
