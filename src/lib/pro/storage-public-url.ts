import { getSupabaseUrl } from "@/lib/supabase/env";

export function storagePublicUrl(bucket: string, path: string): string {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const clean = path.replace(/^\//, "");
  return `${base}/storage/v1/object/public/${bucket}/${clean}`;
}
