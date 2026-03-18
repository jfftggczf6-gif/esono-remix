import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/helpers.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // Find share by token
    const { data: share, error: shareErr } = await sb
      .from("data_room_shares")
      .select("*")
      .eq("access_token", token)
      .maybeSingle();

    if (shareErr || !share) {
      return new Response(JSON.stringify({ error: "Lien invalide ou expiré" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Ce lien a expiré" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as viewed
    if (!share.viewed_at) {
      await sb.from("data_room_shares").update({ viewed_at: new Date().toISOString() }).eq("id", share.id);
    }

    // Get enterprise info
    const { data: enterprise } = await sb
      .from("enterprises")
      .select("name, sector, country, description")
      .eq("id", share.enterprise_id)
      .single();

    // Get documents
    const { data: documents } = await sb
      .from("data_room_documents")
      .select("id, category, label, filename, storage_path, file_size, evidence_level, is_generated, created_at")
      .eq("enterprise_id", share.enterprise_id)
      .order("category")
      .order("created_at", { ascending: false });

    // Generate signed URLs for documents if download is allowed
    const docsWithUrls = [];
    for (const doc of documents || []) {
      let downloadUrl = null;
      if (share.can_download) {
        const { data: signed } = await sb.storage
          .from("documents")
          .createSignedUrl(doc.storage_path, 3600);
        downloadUrl = signed?.signedUrl || null;
      }
      docsWithUrls.push({ ...doc, download_url: downloadUrl });
    }

    return new Response(JSON.stringify({
      enterprise,
      investor_name: share.investor_name,
      can_download: share.can_download,
      documents: docsWithUrls,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("access-data-room error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erreur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
