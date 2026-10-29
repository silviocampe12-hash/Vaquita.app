const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BODY_BYTES = 256_000;
const MAX_MEMBERS = 100;
const MAX_EXPENSES = 2_000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function memberReferences(value: unknown, members: Set<string>) {
  return Array.isArray(value) && value.length <= MAX_MEMBERS &&
    new Set(value).size === value.length &&
    value.every((id) => typeof id === "string" && members.has(id));
}

function cleanGroup(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !isId(value.id) || !isText(value.name, 120)) return null;
  if (!Array.isArray(value.members) || value.members.length < 1 || value.members.length > MAX_MEMBERS) return null;
  if (!Array.isArray(value.expenses) || value.expenses.length > MAX_EXPENSES) return null;
  if (value.del !== undefined && (!Array.isArray(value.del) || value.del.length > MAX_EXPENSES)) return null;

  const members: Record<string, string>[] = [];
  const memberIds = new Set<string>();
  for (const item of value.members) {
    if (!isRecord(item) || !isId(item.id) || !isText(item.name, 120) ||
      (item.alias !== undefined && !isText(item.alias, 120)) || memberIds.has(item.id)) return null;
    memberIds.add(item.id);
    members.push({ id: item.id, name: item.name, alias: typeof item.alias === "string" ? item.alias : "" });
  }

  const expenses: Record<string, unknown>[] = [];
  const expenseIds = new Set<string>();
  for (const item of value.expenses) {
    if (!isRecord(item) || !isId(item.id) || expenseIds.has(item.id) ||
      !memberIds.has(String(item.paid)) || !isText(item.title, 120) ||
      !Number.isSafeInteger(item.amount) || (item.amount as number) < 0 ||
      !memberReferences(item.split, memberIds)) return null;
    expenseIds.add(item.id);

    const expense: Record<string, unknown> = {
      id: item.id,
      paid: item.paid,
      title: item.title,
      split: item.split,
      amount: item.amount,
    };
    if (item.items !== undefined) {
      if (!Array.isArray(item.items) || item.items.length > 200) return null;
      const cleanItems: Record<string, unknown>[] = [];
      for (const subItem of item.items) {
        if (!isRecord(subItem) || !isText(subItem.name, 120) ||
          !Number.isSafeInteger(subItem.price) || (subItem.price as number) < 0 ||
          !memberReferences(subItem.to, memberIds)) return null;
        cleanItems.push({ name: subItem.name, price: subItem.price, to: subItem.to });
      }
      expense.items = cleanItems;
    }
    expenses.push(expense);
  }

  const deleted = value.del === undefined ? [] : value.del;
  if (!Array.isArray(deleted) || !deleted.every(isId)) return null;

  const group = { id: value.id, name: value.name, members, expenses, del: deleted };
  if (new TextEncoder().encode(JSON.stringify(group)).length > MAX_BODY_BYTES) return null;
  return group;
}

async function tokenHash(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function tableUrl(query: string) {
  return `${supabaseUrl}/rest/v1/vaquita_groups${query}`;
}

async function databaseRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(tableUrl(path), {
    ...init,
    headers: {
      apikey: serviceRoleKey!,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Database request failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { error: "Método no permitido" });
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase server environment variables");
    return respond(500, { error: "La función no está configurada en Supabase" });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return respond(413, { error: "El grupo supera el tamaño permitido" });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return respond(400, { error: "Solicitud JSON inválida" });
  }
  if (!isRecord(body) || !TOKEN_PATTERN.test(String(body.token || ""))) {
    return respond(400, { error: "Enlace de grupo inválido" });
  }
  const action = body.action;
  if (action !== "load" && action !== "save" && action !== "delete") {
    return respond(400, { error: "Acción no válida" });
  }

  try {
    const hash = await tokenHash(body.token as string);
    const rows = await databaseRequest(`?token_hash=eq.${hash}&select=id,data`);
    const existing = Array.isArray(rows) ? rows[0] : null;

    if (action === "load") return respond(200, { data: existing ? existing.data : null });
    if (action === "delete") {
      await databaseRequest(`?token_hash=eq.${hash}`, { method: "DELETE" });
      return respond(200, { ok: true });
    }

    const group = cleanGroup(body.data);
    if (!group) return respond(400, { error: "Los datos del grupo no tienen un formato válido" });
    if (existing && existing.id !== group.id) {
      return respond(409, { error: "El enlace no corresponde a este grupo" });
    }

    await databaseRequest("?on_conflict=token_hash", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: group.id,
        token_hash: hash,
        data: group,
        updated_at: new Date().toISOString(),
      }),
    });
    return respond(200, { ok: true });
  } catch (error) {
    console.error("Private group function failed:", error);
    return respond(500, { error: "No se pudo completar la operación en Supabase" });
  }
});
