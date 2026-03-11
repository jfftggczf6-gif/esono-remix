import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "npm:jszip@3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: fileData, error } = await supabase.storage
    .from("templates")
    .download("ODD_template.xlsx");

  if (error || !fileData) {
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const buffer = await fileData.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // List all files
  const files = Object.keys(zip.files);

  // Read workbook.xml to find sheets
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string") ?? "";
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string") ?? "";

  // Extract sheet names and their files
  const sheets: { name: string; rId: string; file: string }[] = [];
  const sheetRegex = /<sheet[^>]+name="([^"]*)"[^>]+r:id="([^"]*)"/g;
  for (const match of workbookXml.matchAll(sheetRegex)) {
    const relRegex = new RegExp(`Id="${match[2]}"[^>]+Target="([^"]*)"`, "s");
    const relMatch = relsXml.match(relRegex);
    const target = relMatch?.[1] ? (relMatch[1].startsWith("worksheets/") ? `xl/${relMatch[1]}` : relMatch[1]) : "unknown";
    sheets.push({ name: match[1], rId: match[2], file: target });
  }

  // Load shared strings
  const ssXml = await zip.file("xl/sharedStrings.xml")?.async("string") ?? "";
  const sharedStrings: string[] = [];
  for (const match of ssXml.matchAll(/<si[^>]*>(.*?)<\/si>/gs)) {
    const tMatch = match[1].match(/<t[^>]*>([^<]*)<\/t>/);
    sharedStrings.push(tMatch ? tMatch[1] : "");
  }

  // For each sheet, scan rows 1-200 and extract columns A-I
  const sheetDetails: Record<string, any[]> = {};
  
  for (const sheet of sheets) {
    const sheetXml = await zip.file(sheet.file)?.async("string") ?? "";
    if (!sheetXml) continue;

    const rows: any[] = [];
    for (let row = 1; row <= 200; row++) {
      const rowData: Record<string, string | null> = {};
      let hasData = false;
      for (const col of ["A", "B", "C", "D", "E", "F", "G", "H", "I"]) {
        const ref = `${col}${row}`;
        const val = getCellValue(sheetXml, ref, sharedStrings);
        rowData[col] = val;
        if (val) hasData = true;
      }
      if (hasData) rows.push({ row, ...rowData });
    }
    sheetDetails[sheet.name] = rows;
  }

  return new Response(JSON.stringify({ sheets, sheetDetails, sharedStringsCount: sharedStrings.length }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function getCellValue(sheetXml: string, cellRef: string, sharedStrings: string[]): string | null {
  // Match both <c ...>...</c> and <c .../>
  const cellRegex = new RegExp(`<c[^>]*r="${cellRef}"[^>]*(?:>(.*?)<\/c>|/>)`, "s");
  const match = sheetXml.match(cellRegex);
  if (!match) return null;

  const cellContent = match[1] || "";

  const tMatch = cellContent.match(/<t[^>]*>([^<]*)<\/t>/);
  if (tMatch) return tMatch[1];

  const vMatch = cellContent.match(/<v[^>]*>([^<]*)<\/v>/);
  if (vMatch) {
    const val = vMatch[1];
    if (match[0].includes('t="s"')) {
      const idx = parseInt(val);
      if (!isNaN(idx) && idx < sharedStrings.length) return sharedStrings[idx];
    }
    return val;
  }

  return null;
}
