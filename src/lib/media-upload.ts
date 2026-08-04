import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Uploads a file to the private media bucket and returns a long-lived signed URL. */
export async function uploadMedia(file: File, folder = "uploads"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from("media")
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Could not create link");

  return data.signedUrl;
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}
