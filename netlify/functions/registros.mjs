import { getStore } from "@netlify/blobs";

const USERS = [
  { user: "freddy", pass: "76752716", write: true },
  { user: "jorge", pass: "40345782", write: true },
];
const SEED = {
  "2026-08-03": { lunch: true, dinner: true },
  "2026-08-04": { lunch: true, dinner: false },
  "2026-08-05": { lunch: true, dinner: true },
  "2026-08-07": { lunch: true, dinner: false },
  "2026-08-10": { lunch: true, dinner: true },
  "2026-08-11": { lunch: true, dinner: true },
  "2026-08-12": { lunch: false, dinner: true },
};

function identity(request) {
  const user = (request.headers.get("x-user") || "").trim().toLowerCase();
  const pass = request.headers.get("x-pass") || "";
  return USERS.find((item) => item.user === user && item.pass === pass) || null;
}

function recordKey(cuenta) {
  return `records-${cuenta.user}`;
}

export default async (request) => {
  const cuenta = identity(request);
  if (!cuenta) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const store = getStore({ name: "comidas", consistency: "strong" });

  if (request.method === "GET") {
    const key = recordKey(cuenta);
    let records = await store.get(key, { type: "json" });
    if (!records && cuenta.user === "freddy") {
      records = await store.get("records", { type: "json" });
    }
    if (!records) {
      records = cuenta.user === "jorge" ? {} : SEED;
      if (cuenta.write) await store.setJSON(key, records);
    }
    return Response.json(records);
  }

  if (request.method === "PUT") {
    if (!cuenta.write) {
      return Response.json({ error: "readonly" }, { status: 403 });
    }
    const records = await request.json();
    if (!records || typeof records !== "object" || Array.isArray(records)) {
      return Response.json({ error: "bad" }, { status: 400 });
    }
    await store.setJSON(recordKey(cuenta), records);
    return Response.json(records);
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = { path: "/api/registros" };
