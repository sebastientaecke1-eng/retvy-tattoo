import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl } from "@/lib/app-url";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const bodySchema = z.object({
  role: z.enum(["client", "pro"]),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(40).optional(),
  next: z.string().optional(),
});

function isAlreadyRegistered(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already") ||
    m.includes("registered") ||
    m.includes("exists") ||
    m.includes("duplicate")
  );
}

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const appUrl = getAppUrl();
  const defaultNext =
    body.role === "pro" ? "/pro/inscription" : "/client/dashboard";
  const next =
    body.next?.startsWith("/") && !body.next.startsWith("//")
      ? body.next
      : defaultNext;
  const emailRedirectTo = `${appUrl}/api/auth/callback?next=${encodeURIComponent(next)}`;

  const metadata: Record<string, string> = {
    first_name: body.firstName,
    last_name: body.lastName,
    role: body.role,
  };
  if (body.phone) metadata.phone = body.phone;

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      emailRedirectTo,
      data: metadata,
    },
  });

  if (error) {
    if (isAlreadyRegistered(error.message)) {
      return NextResponse.json(
        {
          error: "Un compte existe déjà avec cet email. Connectez-vous.",
          code: "already_registered",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user?.identities?.length === 0) {
    return NextResponse.json(
      {
        error: "Un compte existe déjà avec cet email. Connectez-vous.",
        code: "already_registered",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    emailSent: true,
    message:
      "Un email de confirmation a été envoyé. Cliquez sur le lien pour activer votre compte.",
  });
}
