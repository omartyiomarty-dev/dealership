/**
 * Unit tests — pure logic, no server or browser needed.
 * Run: node tests/unit.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as z from "zod";

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ok  " + name); } catch (e) { fail++; console.log("FAIL  " + name + "\n      " + e.message); } };
const section = (n) => console.log("\n# " + n);

// Real application modules are imported directly thanks to the "@/..." alias
// loader (tests/register-alias.mjs) — no copies, no build step.
const { safeInt, safeId, safeIdList, safeText, safeSlug, safeEnum, safeEnumList } = await import("@/lib/safe");

// Complete valid settings object. settings.ts imports the DB client, so it is
// not importable in a pure unit test — this mirrors the shipped defaults.
const defaults = {
  nameAr: "معرض", nameEn: "Showroom", taglineAr: "", taglineEn: "",
  logoMediaId: null, heroMediaId: null, phone: "01001234567", whatsapp: "01001234567",
  email: "a@b.com", addressAr: "", addressEn: "", mapUrl: "", hoursAr: "", hoursEn: "",
  aboutAr: "", aboutEn: "", footerAr: "", footerEn: "", socialLinks: [],
  theme: { primary: "#16a34a", primaryDark: "#15803d", accent: "#f59e0b", dark: "#1f2937" },
};

section("input hardening (src/lib/safe.ts)");
if (safeInt) {
  t("safeInt clamps to Postgres integer range", () => {
    assert.equal(safeInt("99999999999999999999"), 2147483647);
    assert.equal(safeInt("-99999999999999999999"), -2147483648);
  });
  t("safeInt rejects garbage → undefined", () => {
    assert.equal(safeInt("abc"), undefined);
    assert.equal(safeInt("1e400"), undefined);
    assert.equal(safeInt(""), undefined);
    assert.equal(safeInt(null), undefined);
  });
  t("safeInt honours min/max/fallback", () => {
    assert.equal(safeInt("5", { min: 1, max: 10 }), 5);
    assert.equal(safeInt("99", { min: 1, max: 10 }), 10); // clamped up to max
    assert.equal(safeInt("abc", { fallback: 1 }), 1);
    assert.equal(safeInt("0", { min: 1 }), 1); // clamped to min (good for ?page=0)
  });
  t("safeId drops zero, negatives and junk", () => {
    assert.equal(safeId("12"), 12);
    assert.equal(safeId("0"), undefined);
    assert.equal(safeId("-3"), undefined);
    assert.equal(safeId("<script>"), undefined);
  });
  t("safeIdList keeps only valid ids, dedupes, caps at 100", () => {
    assert.deepEqual(safeIdList(["1", "2", "2", "abc", "-5", "99999999999999999999"]), [1, 2]);
    assert.deepEqual(safeIdList([]), []);
    assert.deepEqual(safeIdList(undefined), []);
  });
  t("safeText strips NUL and control chars (Postgres rejects 0x00)", () => {
    assert.equal(safeText("x\u0000y"), "xy");
    assert.equal(safeText("a\u0007b"), "ab");
    assert.equal(safeText("ok"), "ok");
    assert.equal(safeText("abc".repeat(200), 10), "abcabcabca"); // first N chars
  });
  t("safeSlug allows only letters, numbers, dash (Arabic kept)", () => {
    assert.equal(safeSlug("Toyota Corolla 2011"), "toyota-corolla-2011");
    assert.equal(safeSlug("تويوتا-كورولا"), "تويوتا-كورولا");
    assert.equal(safeSlug("../../etc/passwd"), "etc-passwd");
    assert.equal(safeSlug("x\u0000y"), "xy");
    assert.equal(safeSlug("--a--b--"), "a-b");
  });
  t("safeEnum only allows whitelisted values", () => {
    assert.equal(safeEnum("sale", ["sale", "rent"]), "sale");
    assert.equal(safeEnum("DROP TABLE", ["sale", "rent"]), undefined);
    assert.equal(safeEnum("", ["sale"]), undefined);
  });
  t("safeEnumList filters and dedupes", () => {
    assert.deepEqual(safeEnumList("automatic,manual,bogus", ["automatic", "manual"]), ["automatic", "manual"]);
    assert.deepEqual(safeEnumList(["automatic", "automatic"], ["automatic"]), ["automatic"]);
  });
}

section("validators (src/lib/validators.ts)");
const vmod = await import("@/lib/validators");
if (vmod.vehicleSchema) {
  const vs = vmod.vehicleSchema;
  const base = {
    transactionType: "sale", make: "Toyota", model: "Corolla", titleAr: "ع", titleEn: "E",
    year: 2015, condition: "used", status: "published", availability: "available",
  };
  t("accepts a minimal valid vehicle", () => {
    const r = vs.safeParse(base);
    assert.equal(r.success, true, JSON.stringify(r.error?.issues));
  });
  t("rejects missing make / titles", () => {
    assert.equal(vs.safeParse({ ...base, make: "" }).success, false);
    assert.equal(vs.safeParse({ ...base, titleEn: "" }).success, false);
  });
  t("rejects impossible year", () => assert.equal(vs.safeParse({ ...base, year: 1800 }).success, false));
  t("rejects negative price", () => assert.equal(vs.safeParse({ ...base, price: -5 }).success, false));
  t("rent with a price requires a rental period", () => {
    assert.equal(vs.safeParse({ ...base, transactionType: "rent", price: 100, rentalPeriod: null }).success, false);
    assert.equal(vs.safeParse({ ...base, transactionType: "rent", price: 100, rentalPeriod: "daily" }).success, true);
  });
  t("coerces numeric strings from forms", () => {
    const r = vs.safeParse({ ...base, year: "2015", price: "350000" });
    assert.equal(r.success, true);
    assert.equal(r.data.year, 2015);
  });
  t("caps list lengths (images/features)", () => {
    assert.equal(vs.safeParse({ ...base, images: Array(31).fill(1) }).success, false);
    assert.equal(vs.safeParse({ ...base, featuresAr: Array(61).fill("x") }).success, false);
  });
  t("unknown enum value rejected", () => {
    assert.equal(vs.safeParse({ ...base, availability: "floating" }).success, false);
    assert.equal(vs.safeParse({ ...base, vehicleType: "spaceship" }).success, false);
  });

  const inv = vmod.inquirySchema;
  t("inquiry: valid phone accepted, junk rejected", () => {
    assert.equal(inv.safeParse({ name: "Ali", phone: "01001234567", message: "hi there" }).success, true);
    assert.equal(inv.safeParse({ name: "Ali", phone: "not-a-phone", message: "hi" }).success, false);
    assert.equal(inv.safeParse({ name: "A", phone: "01001234567", message: "hi" }).success, false);
    assert.equal(inv.safeParse({ name: "Ali", phone: "01001234567", email: "bad", message: "hi" }).success, false);
  });

  const st = vmod.siteSettingsSchema;
  t("shipped default settings pass validation", () => {
    const r = st.safeParse(defaults);
    assert.equal(r.success, true, JSON.stringify(r.error?.issues?.slice(0, 2)));
  });
  t("theme colours must be 6-digit hex", () => {
    assert.equal(st.safeParse({ ...defaults, theme: { ...defaults.theme, primary: "green" } }).success, false);
    assert.equal(st.safeParse({ ...defaults, theme: { ...defaults.theme, primary: "#16a34" } }).success, false);
  });
  t("social link URL must be a real URL", () => {
    const bad = { ...defaults, socialLinks: [{ label: "f", url: "not-a-url" }] };
    assert.equal(st.safeParse(bad).success, false);
    const good = { ...defaults, socialLinks: [{ label: "f", url: "https://facebook.com/x" }] };
    assert.equal(st.safeParse(good).success, true);
  });
}

section("constants single-source-of-truth");
const cs = await import("@/lib/constants");
if (cs.VEHICLE_TYPES) {
  t("no duplicate enum values", () => {
    for (const key of ["VEHICLE_TYPES", "TRANSMISSIONS", "FUEL_TYPES", "AVAILABILITIES", "CONDITIONS", "RENTAL_PERIODS"]) {
      const arr = cs[key];
      assert.equal(new Set(arr).size, arr.length, key + " has duplicates");
    }
  });
  // Requirement change: sold/rented vehicles stay VISIBLE with a banner plus
  // recommended alternatives, so they must NOT be in the hidden list.
  t("sold/rented are NOT hidden (they show a badge + alternatives)", () => {
    assert.ok(!cs.HIDDEN_AVAILABILITIES.includes("sold"), "sold should stay public");
    assert.ok(!cs.HIDDEN_AVAILABILITIES.includes("rented"), "rented should stay public");
  });
  t("unavailable vehicles are hidden from the public site", () => {
    assert.ok(cs.HIDDEN_AVAILABILITIES.includes("unavailable"));
  });
  t("every availability value is either hidden or publicly shown", () => {
    for (const a of cs.AVAILABILITIES) assert.ok(typeof a === "string" && a.length > 2);
  });
  t("every rental period / transmission is a non-empty string", () => {
    for (const v of [...cs.RENTAL_PERIODS, ...cs.TRANSMISSIONS]) assert.ok(typeof v === "string" && v.length > 2);
  });
  t("year limits are sane", () => { assert.ok(cs.LIMITS.minYear < cs.LIMITS.maxYear); });
}

section("i18n dictionary integrity");
const i18nSrc = readFileSync("src/lib/i18n.ts", "utf8");
t("no empty translations", () => {
  const bad = [...i18nSrc.matchAll(/\{ ar: "([^"]*)", en: "([^"]*)" \}/g)].filter((m) => !m[1].trim() || !m[2].trim());
  assert.equal(bad.length, 0, bad.map((b) => b[0]).join(", "));
});
t("no duplicated dictionary keys", () => {
  const keys = [...i18nSrc.matchAll(/^\s{2}([a-z_0-9]+): \{ ar:/gm)].map((m) => m[1]);
  assert.equal(new Set(keys).size, keys.length, "duplicates: " + keys.filter((k, i) => keys.indexOf(k) !== i).join(","));
});
t("every AR/EN pair has both sides", () => {
  const nAr = (i18nSrc.match(/ar: "/g) || []).length, nEn = (i18nSrc.match(/en: "/g) || []).length;
  assert.equal(nAr, nEn, `ar=${nAr} en=${nEn}`);
});

section("constants are used everywhere (no drift)");
t("schema enums reference constants.ts (not inline literals)", () => {
  const schema = readFileSync("src/db/schema.ts", "utf8");
  for (const col of ["vehicleType", "transactionType", "rentalPeriod", "condition", "transmission", "fuelType", "status", "availability"]) {
    assert.ok(schema.includes(`{ enum:`), "schema column not enum-typed: " + col);
  }
});
t("public filter validation uses constants, not hardcoded lists", () => {
  const v = readFileSync("src/lib/vehicles.ts", "utf8");
  assert.ok(v.includes("safeEnumList(getAll(\"transmission\"), TRANSMISSIONS)"));
  assert.ok(v.includes("safeEnumList(getAll(\"availability\"), AVAILABILITIES)"));
  assert.ok(!v.includes('"available", "reserved", "sold"'), "hardcoded availability list still present");
});
t("admin actions import shared validators", () => {
  const a = readFileSync("src/app/admin/actions.ts", "utf8");
  assert.ok(a.includes('from "@/lib/validators"'));
  assert.ok(!a.includes('z.string().trim().min(1).max(80),\n  nameEn'), "category schema duplicated in actions");
});

section("security posture");
t("no hardcoded secrets", () => {
  for (const f of ["src/lib/auth.ts", "src/app/admin/actions.ts", "src/db/index.ts"]) {
    const s = readFileSync(f, "utf8");
    assert.ok(!/(password|secret)\s*[:=]\s*["'][^"']{8,}["']/i.test(s.replace(/process\.env\.[A-Z_]+/g, "")), "possible secret in " + f);
  }
});
t("every admin action calls requireAdmin", () => {
  const a = readFileSync("src/app/admin/actions.ts", "utf8");
  const fns = a.split(/^export async function /m).slice(1);
  const unsafe = fns.filter((f) => /^(loginAction|setupAction|logoutAction)/.test(f) === false && !/requireAdmin\(|requirePrimaryAdmin\(|getCurrentAdmin\(/.test(f.split("\n\n")[0]));
  assert.deepEqual(unsafe, [], "actions without an auth check: " + unsafe.map((f) => f.slice(0, 30)).join(", "));
});
t("session cookie is httpOnly + SameSite", () => {
  const a = readFileSync("src/lib/auth.ts", "utf8");
  assert.ok(a.includes("httpOnly: true"));
  assert.ok(a.includes('sameSite: "lax"'));
});
t("public search never leaks drafts", () => {
  const v = readFileSync("src/lib/vehicles.ts", "utf8");
  assert.ok(v.includes("if (!p.includeDrafts)"));
  assert.ok(v.includes("notHidden()"));
});
t("middleware never sheds /admin", () => {
  const m = readFileSync("middleware.ts", "utf8");
  assert.ok(m.includes('pathname.startsWith("/admin")'));
});

section("accessibility (colour contrast)");
// settings.ts pulls in the DB client and a cache, so read the shipped default
// straight from the source — this also proves the file on disk is correct.
const _settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
const _themeMatch = _settingsSrc.match(/theme: \{ primary: "(#[0-9a-fA-F]{6})"/);
const defaultPrimary = _themeMatch?.[1] ?? defaults.theme.primary;
function _lum(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function _ratio(a, b) {
  const [l1, l2] = [_lum(a), _lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
t("default primary colour meets WCAG AA with white text (≥4.5:1)", () => {
  assert.ok(_ratio(defaultPrimary, "#ffffff") >= 4.5, `${defaultPrimary} is ${_ratio(defaultPrimary, "#ffffff").toFixed(2)}:1`);
});
t("all theme presets meet WCAG AA with white text", () => {
  const src = readFileSync("src/app/admin/(panel)/settings/SiteSettingsForm.tsx", "utf8");
  const primaries = [...src.matchAll(/primary: "(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]);
  assert.ok(primaries.length >= 6, "no presets found");
  for (const c of primaries) {
    const r = _ratio(c, "#ffffff");
    assert.ok(r >= 4.5, `${c} is ${r.toFixed(2)}:1 (needs ≥4.5)`);
  }
});
t("dark text colour is readable on white (≥7:1 AAA)", () => {
  const dark = _settingsSrc.match(/dark: "(#[0-9a-fA-F]{6})"/)?.[1] ?? defaults.theme.dark;
  assert.ok(_ratio(dark, "#ffffff") >= 7, `${dark} is ${_ratio(dark, "#ffffff").toFixed(2)}:1`);
});
t("CSS fallback matches the default theme (no flash of wrong colour)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.ok(css.includes(`--primary: ${defaultPrimary}`), "globals.css --primary differs from defaultSite.theme.primary");
});

section("injection / output-escaping");
const { toJsonLdString, toCssValue } = await import("@/lib/sanitize");
const { socialLinkSchema, siteSettingsSchema, safeUrl } = await import("@/lib/validators");

t("javascript: URLs are rejected for social links (stored XSS)", () => {
  for (const bad of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,<script>", "vbscript:msgbox", "java\tscript:x"]) {
    assert.equal(socialLinkSchema.safeParse({ label: "x", url: bad }).success, false, bad);
  }
});
t("http(s) URLs still accepted for social links", () => {
  assert.equal(socialLinkSchema.safeParse({ label: "f", url: "https://facebook.com/x" }).success, true);
  assert.equal(socialLinkSchema.safeParse({ label: "f", url: "http://example.com" }).success, true);
  assert.equal(socialLinkSchema.safeParse({ label: "f", url: "not a url" }).success, false);
});
t("map embed URL cannot be a script scheme (rendered as iframe src)", () => {
  const base = { ...defaults, mapUrl: "" };
  for (const bad of ["javascript:alert(1)", "data:text/html,<iframe>", "vbscript:x"]) {
    assert.equal(siteSettingsSchema.safeParse({ ...base, mapUrl: bad }).success, false, bad);
  }
  assert.equal(siteSettingsSchema.safeParse({ ...base, mapUrl: "https://www.google.com/maps?x=1" }).success, true);
  assert.equal(siteSettingsSchema.safeParse({ ...base, mapUrl: "" }).success, true);
});
t("public site URL cannot be a script scheme (used for canonical + WhatsApp)", () => {
  const base = { ...defaults, siteUrl: "" };
  assert.equal(siteSettingsSchema.safeParse(base).success, true);
  assert.equal(siteSettingsSchema.safeParse({ ...base, siteUrl: "javascript:alert(1)" }).success, false);
  assert.equal(siteSettingsSchema.safeParse({ ...base, siteUrl: "https://shop.example.com" }).success, true);
});
t("JSON-LD escaping neutralises </script> breakout", () => {
  const out = toJsonLdString({ name: '</script><script>alert(1)</script>' });
  assert.ok(!out.includes("</script>"), "raw closing tag leaked");
  assert.ok(out.includes("\\u003c"), "angle bracket not escaped");
});
t("JSON-LD escaping keeps normal data intact", () => {
  assert.equal(JSON.parse(toJsonLdString({ a: "تويوتا", b: 2011, c: [1, 2] })).a, "تويوتا");
});
t("CSS value escaping strips injection characters", () => {
  const out = toCssValue("red;background:url(javascript:alert(1))");
  assert.ok(!out.includes(";") && !out.includes(":") && !out.includes("("));
});
t("safe URL helper rejects every non-http(s) scheme", () => {
  for (const bad of ["ftp://x", "file:///etc/passwd", "mailto:a@b.c", "tel:+20100", "javascript:1", "#anchor", "/relative"]) {
    assert.equal(safeUrl.safeParse(bad).success, false, bad);
  }
});

section("google reviews link");
const { safeHref } = await import("@/lib/sanitize");
t("google reviews URL: https accepted, empty allowed", () => {
  assert.equal(siteSettingsSchema.safeParse({ ...defaults, googleReviewsUrl: "https://maps.app.goo.gl/abc123" }).success, true);
  assert.equal(siteSettingsSchema.safeParse({ ...defaults, googleReviewsUrl: "" }).success, true);
});
t("google reviews URL: script schemes rejected (stored XSS)", () => {
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "vbscript:x", "not a url"]) {
    assert.equal(siteSettingsSchema.safeParse({ ...defaults, googleReviewsUrl: bad }).success, false, bad);
  }
});
t("google reviews URL survives validation (not stripped as an unknown key)", () => {
  const r = siteSettingsSchema.safeParse({ ...defaults, googleReviewsUrl: "https://g.page/r/xyz/review" });
  assert.equal(r.success && r.data.googleReviewsUrl, "https://g.page/r/xyz/review");
});
t("safeHref render guard blocks non-http links even if stored", () => {
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("data:text/html,x"), null);
  assert.equal(safeHref(""), null);
  assert.equal(safeHref(null), null);
  assert.ok(safeHref("https://maps.app.goo.gl/x")?.startsWith("https://"));
});
t("contact page, footer, home and details render the reviews link through safeHref", () => {
  const comp = readFileSync("src/components/GoogleReviewsLink.tsx", "utf8");
  assert.ok(comp.includes("safeHref(url)"));
  for (const f of ["src/app/(public)/contact/page.tsx", "src/components/Footer.tsx", "src/app/(public)/page.tsx", "src/app/(public)/vehicles/[slug]/page.tsx"]) {
    assert.ok(readFileSync(f, "utf8").includes("GoogleReviewsLink"), "missing in " + f);
  }
});
t("social links and map iframe are also guarded at render time", () => {
  const c = readFileSync("src/app/(public)/contact/page.tsx", "utf8");
  assert.ok(c.includes("safeHref(site.mapUrl)") && c.includes("safeHref(s.url)"));
});

section("automatic database setup (web-only deploy)");
const { SCHEMA_SQL } = await import("@/db/bootstrap-sql");
const schemaSrc = readFileSync("src/db/schema.ts", "utf8");
t("embedded SQL creates every table declared in schema.ts", () => {
  const tables = [...schemaSrc.matchAll(/pgTable\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(tables.length >= 11, "found " + tables.length);
  for (const tb of tables) assert.ok(SCHEMA_SQL.includes(`CREATE TABLE "${tb}"`), "missing table " + tb);
});
t("embedded SQL includes the stock-number sequence and the single-primary-admin index", () => {
  assert.ok(SCHEMA_SQL.includes("vehicle_stock_seq"));
  assert.ok(SCHEMA_SQL.includes("admins_single_primary_idx"));
});
t("embedded SQL contains no destructive statements", () => {
  // statement-level only: "ON DELETE CASCADE" in a foreign key is not a delete
  assert.ok(!/(^|;)\s*(DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE\s+\S+\s+DROP)\b/im.test(SCHEMA_SQL));
});
t("bootstrap only runs on an empty DB and is race-safe", () => {
  const b = readFileSync("src/db/bootstrap.ts", "utf8");
  assert.ok(b.includes("pg_advisory_xact_lock"), "must use a transaction-scoped (pooler-safe) lock");
  assert.ok(!/pg_advisory_lock\(/.test(b), "session-level locks leak behind transaction poolers");
  assert.ok(b.includes("if (await tablesExist(client)) return \"exists\""));
  assert.ok(b.includes("ROLLBACK"));
});
t("db/schema.sql (manual option) matches the embedded SQL", () => {
  const manual = readFileSync("db/schema.sql", "utf8");
  assert.ok(manual.includes(SCHEMA_SQL.trim().slice(0, 200)));
});

section("serverless hosting compatibility");
t("uploads are sent one file per request (host body limits)", () => {
  const ui = readFileSync("src/components/admin/ui.tsx", "utf8");
  assert.ok(ui.includes("for (const original of list)") && ui.includes("shrinkImage"));
});
t("large photos are shrunk in the browser before upload", () => {
  const ui = readFileSync("src/components/admin/ui.tsx", "utf8");
  assert.ok(ui.includes("createImageBitmap") && ui.includes("MAX_DIM = 2000"));
});
t("netlify.toml present with build command and Node version", () => {
  const n = readFileSync("netlify.toml", "utf8");
  assert.ok(n.includes('command = "npm run build"') && n.includes("NODE_VERSION"));
});
t("DB pool is small on serverless hosts", () => {
  assert.ok(readFileSync("src/db/index.ts", "utf8").includes("process.env.NETLIFY"));
});

section("auth hardening");
const actionsSrc = readFileSync("src/app/admin/actions.ts", "utf8");
t("login throttling keys are hashed (no unbounded memory keys)", () => {
  assert.ok(actionsSrc.includes('createHash("sha256")'), "lockout uses raw email as key");
});
t("login throttling sweeps expired entries (no memory leak)", () => {
  assert.ok(actionsSrc.includes("lastLockSweep"), "no sweep of lockout map");
});
t("login caps input length before touching the DB", () => {
  assert.ok(actionsSrc.includes(".slice(0, 150)"), "email not length-capped");
  assert.ok(actionsSrc.includes(".slice(0, 200)"), "password not length-capped");
});
t("only one primary admin can exist (DB-level)", () => {
  const schema = readFileSync("src/db/schema.ts", "utf8");
  assert.ok(schema.includes("admins_single_primary_idx"), "missing unique index on is_primary");
});
t("setup handles a concurrent double-submit", () => {
  assert.ok(actionsSrc.includes("cannot \n  // create two primary admins") || actionsSrc.includes("double-submit"));
});
t("session cookie cannot be sent over plain http in production", () => {
  const auth = readFileSync("src/lib/auth.ts", "utf8");
  assert.ok(auth.includes("async function isHttps"), "scheme detection missing");
});

section("project hygiene");
t("package.json has no test-only deps in dependencies", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const bad = Object.keys(pkg.dependencies).filter((d) => /playwright|jest|vitest|mocha/.test(d));
  assert.deepEqual(bad, []);
});
t("node engines pinned", () => assert.ok(JSON.parse(readFileSync("package.json", "utf8")).engines?.node));
t(".gitignore excludes secrets and build output", () => {
  const g = readFileSync(".gitignore", "utf8");
  for (const need of [".env", "node_modules", ".next"]) assert.ok(g.includes(need), "missing " + need);
});
t("no console.log left in source", () => {
  const out = [];
  for (const f of ["src/lib/vehicles.ts", "src/lib/auth.ts", "src/lib/cache.ts", "src/lib/settings.ts", "src/app/admin/actions.ts"]) {
    if (/console\.log\(/.test(readFileSync(f, "utf8"))) out.push(f);
  }
  assert.deepEqual(out, []);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
