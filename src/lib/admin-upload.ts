import { supabase } from "@/integrations/supabase/client";

const BUCKET = "site-assets";
/** ~10 years — the bucket is private, so we store a long-lived signed URL. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export async function uploadSiteImage(file: File, folder = "uploads"): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Please choose a JPG, PNG, WEBP, AVIF or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large. Maximum size is 5 MB.");
  }

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext || "jpg"}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not create image URL.");
  return data.signedUrl;
}
