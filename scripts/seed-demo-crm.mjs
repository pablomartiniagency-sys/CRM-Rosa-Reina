import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const env = { ...loadEnv(path.join(root, ".env.local")), ...process.env };
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const seedId = env.DEMO_SEED_ID || "rosa-reina-demo-v1";
const runId = env.DEMO_RUN_ID || new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const args = new Set(process.argv.slice(2));
const mode = args.has("--status") ? "status" : args.has("--clean") ? "clean" : args.has("--reset") ? "reset" : "seed";
const requestedCount = parseCountArg(process.argv.slice(2), env.DEMO_COUNT || env.DEMO_RECORD_COUNT);
const demoCount = Math.min(Math.max(requestedCount ?? 6, 1), 250);
const shouldCleanFirst = mode === "reset" || (!args.has("--keep-existing") && mode === "seed");

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL/SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

if (mode === "status") {
  console.log(JSON.stringify({ ok: true, mode, seedId, status: await getDemoStatus() }, null, 2));
  process.exit(0);
}

if (mode === "clean" || shouldCleanFirst) {
  await cleanDemoData();
}

if (mode !== "clean") {
  const result = await seedDemoData();
  console.log(JSON.stringify({ ok: true, mode, seedId, requestedCount: demoCount, ...result }, null, 2));
} else {
  console.log(JSON.stringify({ ok: true, mode, seedId }, null, 2));
}

function parseCountArg(argv, envValue) {
  const countArg = argv.find((arg) => arg.startsWith("--count="));
  const raw = countArg ? countArg.split("=")[1] : envValue;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return index === -1 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function targetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return digits.startsWith("34") ? digits : `34${digits}`;
}

function demoCustom(extra = {}) {
  return {
    demo: true,
    demo_seed_id: seedId,
    created_by_script: "scripts/seed-demo-crm.mjs",
    demo_run_id: runId,
    ...extra,
  };
}

async function cleanDemoData() {
  const { data: demoOrders, error: ordersError } = await supabase
    .from("pedidos")
    .select("id")
    .contains("custom", { demo_seed_id: seedId });
  if (ordersError) throw ordersError;

  const orderIds = (demoOrders ?? []).map((order) => order.id);
  if (orderIds.length) {
    await must("delete demo order lines by order", supabase.from("pedido_lineas").delete().in("pedido_id", orderIds));
  }

  await must("delete demo order lines by attrs", supabase.from("pedido_lineas").delete().contains("atributos", { demo_seed_id: seedId }));
  await must("delete demo activities", supabase.from("actividades").delete().eq("external_thread_id", seedId));
  await must("delete demo leads", supabase.from("leads").delete().contains("custom", { demo_seed_id: seedId }));
  await must("delete demo orders", supabase.from("pedidos").delete().contains("custom", { demo_seed_id: seedId }));

  const { data: demoContacts, error: contactsError } = await supabase
    .from("contactos")
    .select("id")
    .contains("custom", { demo_seed_id: seedId });
  if (contactsError) throw contactsError;

  const contactIds = (demoContacts ?? []).map((contact) => contact.id);
  if (contactIds.length) {
    await must("delete demo contact methods", supabase.from("contacto_metodos").delete().in("contacto_id", contactIds));
  }

  await must("delete demo contacts", supabase.from("contactos").delete().contains("custom", { demo_seed_id: seedId }));
  await must("delete demo accounts", supabase.from("cuentas").delete().contains("custom", { demo_seed_id: seedId }));
}

async function getDemoStatus() {
  const [accounts, contacts, leads, orders, activities, methods] = await Promise.all([
    countRows("cuentas", (query) => query.contains("custom", { demo_seed_id: seedId }).is("deleted_at", null)),
    countRows("contactos", (query) => query.contains("custom", { demo_seed_id: seedId }).is("deleted_at", null)),
    countRows("leads", (query) => query.contains("custom", { demo_seed_id: seedId }).is("deleted_at", null)),
    countRows("pedidos", (query) => query.contains("custom", { demo_seed_id: seedId })),
    countRows("actividades", (query) => query.eq("external_thread_id", seedId).is("deleted_at", null)),
    countDemoContactMethods(),
  ]);

  return {
    accounts,
    contacts,
    contactMethods: methods,
    leads,
    orders,
    activities,
  };
}

async function countRows(table, applyFilter) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  query = applyFilter ? applyFilter(query) : query;
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function countDemoContactMethods() {
  const { data: contacts, error } = await supabase
    .from("contactos")
    .select("id")
    .contains("custom", { demo_seed_id: seedId })
    .is("deleted_at", null);
  if (error) throw error;

  const ids = (contacts ?? []).map((contact) => contact.id);
  if (!ids.length) return 0;
  return countRows("contacto_metodos", (query) => query.in("contacto_id", ids));
}

async function seedDemoData() {
  const schools = buildDemoSchools(demoCount);

  const accounts = await insertAccounts(schools);
  const contacts = await insertContacts(schools, accounts);
  await insertContactMethods(schools, contacts);
  const leads = await insertLeads(schools, accounts, contacts);
  const orders = await insertOrders(schools, accounts, contacts, leads);
  await insertActivities(schools, accounts, contacts, leads);

  return {
    accounts: accounts.length,
    contacts: contacts.length,
    leads: leads.length,
    orders: orders.length,
    activities: schools.length * 3,
  };
}

function buildDemoSchools(count) {
  const accountPrefixes = [
    "Colegio Alameda Montessori",
    "Escuela Infantil Los Naranjos",
    "Centro Educativo Mar Azul",
    "Colegio Sierra Verde",
    "Escuela Infantil Peque Sol",
    "Colegio Britanico Costa",
    "Centro Infantil La Estrella",
    "Colegio Nuevo Horizonte",
    "Escuela Infantil Arco Iris",
    "Colegio San Olivo",
  ];
  const cities = ["Malaga", "Sevilla", "Cadiz", "Granada", "Cordoba", "Benalmadena", "Marbella", "Jaen", "Huelva", "Almeria"];
  const contacts = [
    "Laura Benitez",
    "Marta Campos",
    "Daniel Ruiz",
    "Ana Pastor",
    "Irene Molina",
    "Sofia Martin",
    "Elena Romero",
    "Javier Prieto",
    "Clara Navarro",
    "Pablo Santos",
  ];
  const roles = ["Directora", "Administracion", "Coordinador", "Secretaria", "Propietaria", "Operations"];
  const topics = [
    "babis personalizados con escudo bordado",
    "uniforme de verano y mochilas para nuevo curso",
    "renovacion de imagen corporativa y equipacion deportiva",
    "pedido recurrente de polos y chaquetas",
    "catalogo de babis y complementos sin precios",
    "consulta por tallaje y plazos orientativos",
    "batas para aula infantil y complementos",
    "uniformes para jornada de puertas abiertas",
    "personalizacion con logotipo del centro",
    "reposición trimestral de uniformes",
  ];
  const urgencies = ["medium", "high", "medium", "low", "medium", "high"];
  const statuses = ["qualified", "contacted", "new", "qualified", "contacted", "new"];

  return Array.from({ length: count }, (_, index) => {
    const suffix = String(index + 1).padStart(3, "0");
    const account = `${accountPrefixes[index % accountPrefixes.length]} ${suffix}`;
    const emailSlug = account
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/(^\.|\.$)/g, "");

    return {
      account,
      city: cities[index % cities.length],
      email: `${emailSlug}.demo@example.com`,
      phone: String(600100000 + index + 1),
      contact: `${contacts[index % contacts.length]} ${suffix}`,
      role: roles[index % roles.length],
      topic: topics[index % topics.length],
      urgency: urgencies[index % urgencies.length],
      status: statuses[index % statuses.length],
    };
  });
}

async function insertAccounts(schools) {
  const payload = schools.map((school, index) => ({
    nombre: `[DEMO] ${school.account}`,
    email: school.email,
    telefono: normalizePhone(school.phone),
    custom: demoCustom({ city: school.city, segment: "colegio", demo_index: index + 1 }),
    created_at: daysAgo(30 + (index % 20)),
    updated_at: daysAgo(index % 12),
  }));

  const { data, error } = await supabase
    .from("cuentas")
    .insert(payload)
    .select("id,nombre,email,telefono,custom");
  if (error) throw error;
  return data ?? [];
}

async function insertContacts(schools, accounts) {
  const payload = schools.map((school, index) => ({
    cuenta_id: accounts[index].id,
    nombre_completo: `[DEMO] ${school.contact}`,
    rol: school.role,
    email: school.email.replace("@", ".contacto@"),
    telefono: normalizePhone(school.phone),
    canal_preferido: "whatsapp",
    idioma_preferido: "es",
    es_principal: true,
    acepta_comunicados: true,
    categoria_contacto_base: "decision",
    origen_contacto: "demo_seed",
    notas: `Contacto demo para ${school.topic}.`,
    custom: demoCustom({ account_name: school.account }),
    fecha_ultima_interaccion: daysAgo(index % 12),
    created_at: daysAgo(29 + (index % 20)),
    updated_at: daysAgo(index % 12),
  }));

  const { data, error } = await supabase
    .from("contactos")
    .insert(payload)
    .select("id,cuenta_id,nombre_completo,email,telefono");
  if (error) throw error;
  return data ?? [];
}

async function insertContactMethods(schools, contacts) {
  const methods = schools.flatMap((school, index) => {
    const phone = normalizePhone(school.phone);
    return [
      {
        contacto_id: contacts[index].id,
        tipo: "whatsapp",
        valor_raw: phone,
        valor_norm: phone,
        es_principal: true,
        validado: true,
      },
      {
        contacto_id: contacts[index].id,
        tipo: "email",
        valor_raw: school.email.replace("@", ".contacto@"),
        valor_norm: school.email.replace("@", ".contacto@").toLowerCase(),
        es_principal: false,
        validado: true,
      },
    ];
  });

  await must("insert contact methods", supabase.from("contacto_metodos").insert(methods));
}

async function insertLeads(schools, accounts, contacts) {
  const payload = schools.map((school, index) => ({
    canal: index % 2 === 0 ? "whatsapp" : "email",
    nombre_detectado: school.contact,
    email_detectado: school.email,
    telefono_detectado: normalizePhone(school.phone),
    empresa_detectada: school.account,
    resumen: `[DEMO] ${school.topic}. Requiere seguimiento comercial interno y respuesta personalizada.`,
    intent: index % 3 === 0 ? "catalogo" : index % 3 === 1 ? "pedido" : "marca",
    urgencia: school.urgency,
    status: school.status,
    cuenta_id: accounts[index].id,
    contacto_id: contacts[index].id,
    custom: demoCustom({ city: school.city }),
    created_at: daysAgo(10 + (index % 12)),
    updated_at: daysAgo(index % 8),
  }));

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("lead_id,cuenta_id,contacto_id,status");
  if (error) throw error;
  return data ?? [];
}

async function insertOrders(schools, accounts, contacts, leads) {
  const orderSchools = schools.slice(0, Math.max(1, Math.ceil(schools.length * 0.65)));
  const orderStates = ["pendiente_info", "presupuestado", "confirmado", "en_proceso"];
  const orderChannels = ["whatsapp", "email", "web", "telefono"];
  const payload = orderSchools.map((school, index) => ({
    cuenta_id: accounts[index].id,
    contacto_id: contacts[index].id,
    lead_id: leads[index]?.lead_id ?? null,
    referencia: `DEMO-RR-${String(index + 1).padStart(3, "0")}`,
    estado: orderStates[index % orderStates.length],
    canal_origen: orderChannels[index % orderChannels.length],
    fecha_objetivo: targetDate(20 + (index % 18) * 7),
    total: index % 4 === 0 ? null : 800 + index * 145,
    moneda: "EUR",
    notas: `[DEMO] ${school.topic}. Datos economicos ficticios para vista interna.`,
    custom: demoCustom({ city: school.city }),
    created_at: daysAgo(8 + (index % 12)),
    updated_at: daysAgo(index % 6),
  }));

  const { data, error } = await supabase
    .from("pedidos")
    .insert(payload)
    .select("id,referencia,cuenta_id,contacto_id");
  if (error) throw error;

  const lines = (data ?? []).flatMap((order, index) => [
    {
      pedido_id: order.id,
      concepto: index % 2 === 0 ? "Babi colegial personalizado" : "Polo infantil con imagen corporativa",
      cantidad: 40 + (index % 9) * 10,
      precio_unitario: index % 4 === 0 ? null : 10 + (index % 5) * 1.25,
      total_linea: index % 4 === 0 ? null : (40 + (index % 9) * 10) * (10 + (index % 5) * 1.25),
      observaciones: "[DEMO] Linea ficticia para comprobar pedido.",
      atributos: demoCustom({ order_reference: order.referencia }),
    },
    {
      pedido_id: order.id,
      concepto: index % 2 === 0 ? "Mochila infantil coordinada" : "Chaqueta uniforme",
      cantidad: 20 + (index % 7) * 5,
      precio_unitario: index % 4 === 0 ? null : 6 + (index % 6) * 1.4,
      total_linea: index % 4 === 0 ? null : (20 + (index % 7) * 5) * (6 + (index % 6) * 1.4),
      observaciones: "[DEMO] Segunda linea ficticia.",
      atributos: demoCustom({ order_reference: order.referencia }),
    },
  ]);

  await must("insert order lines", supabase.from("pedido_lineas").insert(lines));
  return data ?? [];
}

async function insertActivities(schools, accounts, contacts, leads) {
  const payload = schools.flatMap((school, index) => {
    const phone = normalizePhone(school.phone);
    return [
      {
        tipo: "WhatsApp",
        direccion: "inbound",
        asunto: `[DEMO] WhatsApp de ${school.contact}`,
        descripcion: `Hola, somos ${school.account}. Queremos informacion sobre ${school.topic}.`,
        resultado: "Completada",
        fecha_hora: daysAgo(3 + (index % 12)),
        message_id_externo: `demo-${seedId}-${runId}-${index}-in`,
        channel_raw: phone,
        ai_resumen: `${school.contact} consulta sobre ${school.topic}.`,
        ai_urgencia: school.urgency,
        cuenta_id: accounts[index].id,
        contacto_id: contacts[index].id,
        categoria: "Consulta",
        external_thread_id: seedId,
        lead_id: leads[index]?.lead_id ?? null,
      },
      {
        tipo: "WhatsApp",
        direccion: "outbound",
        asunto: "[DEMO] Respuesta WhatsApp",
        descripcion:
          "Gracias por contactar con Rosa Reina. Podemos orientar sobre catalogo, tallaje y opciones de personalizacion. Para precios o presupuestos lo revisa administracion.",
        resultado: "Completada",
        fecha_hora: daysAgo(2 + (index % 12)),
        message_id_externo: `demo-${seedId}-${runId}-${index}-out`,
        channel_raw: phone,
        ai_resumen: "Respuesta segura sin precios, con derivacion comercial si aplica.",
        ai_urgencia: "medium",
        cuenta_id: accounts[index].id,
        contacto_id: contacts[index].id,
        categoria: "whatsapp_reply",
        external_thread_id: seedId,
        lead_id: leads[index]?.lead_id ?? null,
      },
      {
        tipo: "Email",
        direccion: "inbound",
        asunto: `[DEMO] Email seguimiento ${school.account}`,
        descripcion: `Adjuntan consulta ficticia sobre ${school.topic}. Revisar si requiere presupuesto.`,
        notas_internas: "Demo: simula email que requiere revision humana si pide precios o plazos.",
        resultado: "Pendiente",
        fecha_hora: daysAgo(1 + (index % 12)),
        message_id_externo: `demo-${seedId}-${runId}-${index}-email`,
        channel_raw: school.email,
        ai_resumen: `Email demo con posible oportunidad: ${school.topic}.`,
        ai_urgencia: school.urgency,
        cuenta_id: accounts[index].id,
        contacto_id: contacts[index].id,
        categoria: "revision_admin",
        external_thread_id: seedId,
        has_attachments: index % 2 === 0,
        attachments: index % 2 === 0 ? [{ name: "consulta-demo.pdf", demo: true }] : null,
        lead_id: leads[index]?.lead_id ?? null,
      },
    ];
  });

  await must("insert activities", supabase.from("actividades").insert(payload));
}

async function must(label, promise) {
  const { error } = await promise;
  if (error) {
    error.message = `${label}: ${error.message}`;
    throw error;
  }
}
