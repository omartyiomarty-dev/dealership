// End-to-end browser test. Requires a running server + playwright (see README "Testing").
// Usage: BASE=http://localhost:3000 node tests/e2e.mjs   (run on an EMPTY database)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const B = process.env.BASE || "http://localhost:3000";
const results = [];
const ok = (name, cond, extra = "") => { results.push([cond ? "PASS" : "FAIL", name, extra]); if (!cond) console.log("FAIL:", name, extra); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
for (const p of [page]) {
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("response", (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shots = process.env.SHOTS || "/tmp/pw";
fs.mkdirSync(shots, { recursive: true });

try {
  // ---- SETUP (only when the database has no admin yet) ----
  // For a database that already has an admin, pass EXISTING_ADMIN_EMAIL + EXISTING_ADMIN_PASSWORD.
  const email = process.env.EXISTING_ADMIN_EMAIL ?? "owner@example.com";
  const password = process.env.EXISTING_ADMIN_PASSWORD ?? "StrongPass12345";
  const hasExisting = Boolean(process.env.EXISTING_ADMIN_EMAIL);
  await page.goto(`${B}/admin/login`);
  if (!hasExisting) {
    ok("login redirects to setup when no admin", page.url().includes("/admin/setup"));
    await page.fill('input[name="name"]', "Owner");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click("button:has-text('إنشاء الحساب')");
    await page.waitForURL(/\/admin$/, { timeout: 30000 });
    ok("setup creates primary admin and logs in", page.url().endsWith("/admin"));
    await page.goto(`${B}/admin/setup`);
    ok("setup closed after first admin", page.url().includes("/admin/login") || page.url().endsWith("/admin"));
  } else {
    ok("setup stays closed while an admin exists", page.url().includes("/admin/login"));
  }

  // ---- LOGOUT + LOGIN ----
  if (hasExisting) {
    // no setup step ran, so sign in first
    await page.goto(`${B}/admin/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click("button:has-text('دخول')");
    await page.waitForURL(/\/admin$/, { timeout: 30000 });
    ok("login works (existing admin)", page.url().endsWith("/admin"));
  }
  await page.goto(`${B}/admin`);
  await page.waitForSelector("button:has-text('تسجيل الخروج')", { timeout: 30000 });
  await page.locator("button:has-text('تسجيل الخروج')").first().click({ force: true });
  await page.waitForURL(/\/admin\/login/, { timeout: 30000 });
  ok("logout works", true);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "wrongpass123");
  await page.click("button:has-text('دخول')");
  await page.waitForSelector('[role="alert"]', { timeout: 30000 });
  ok("wrong password rejected", true);
  await page.fill('input[name="password"]', password);
  await page.click("button:has-text('دخول')");
  await page.waitForURL(/\/admin$/, { timeout: 30000 });
  ok("re-login after logout works", true);

  // ---- SETTINGS ----
  await page.goto(`${B}/admin/settings`);
  await page.locator("div:has(> label:has-text('اسم المعرض بالعربية')) input").fill("معرض النور للمركبات");
  await page.locator("div:has(> label:has-text('اسم المعرض بالإنجليزية')) input").fill("Al Nour Vehicles");
  await page.locator("div:has(> label:has-text('رقم الهاتف')) input").fill("01001234567");
  await page.locator("div:has(> label:has-text('رقم واتساب')) input").fill("01001234567");
  // invalid scheme must be rejected by the server, valid link must be saved
  await page.locator("div:has(> label:has-text('رابط تقييمات جوجل')) input").fill("javascript:alert(1)");
  await page.locator("button:has-text('حفظ التغييرات')").first().click();
  await page.waitForSelector("[role=status]", { timeout: 30000 });
  ok("javascript: reviews link rejected by server", (await page.locator("[role=status]").first().textContent()).includes("validation"));
  await wait(3800);
  await page.locator("div:has(> label:has-text('رابط تقييمات جوجل')) input").fill("https://maps.app.goo.gl/TestReviews123");
  await page.click("button:has-text('إضافة رابط')");
  await page.locator('input[placeholder*="فيسبوك"]').last().fill("فيسبوك");
  await page.locator('input[placeholder="https://..."]').last().fill("https://facebook.com/example");
  await page.locator("button:has-text('حفظ التغييرات')").first().click();
  await page.waitForSelector("[role=status]:has-text('تم الحفظ')", { timeout: 30000 });
  ok("dealership settings saved", true);

  // ---- CATEGORIES ----
  await page.goto(`${B}/admin/categories`);
  for (const [ar, en, icon] of [["2011", "2011", "📅"], ["2012", "2012", "📅"], ["أوتوماتيك", "Automatic", "⚙️"], ["اقتصادية", "Economical", "💰"], ["موتوسيكلات", "Motorcycles", "🏍"]]) {
    await page.click("button:has-text('فئة جديدة')");
    await page.fill("form input[dir=rtl]", ar);
    await page.fill("form input[dir=ltr]", en);
    await page.locator('form input[maxlength="4"]').fill(icon);
    await page.click("form button:has-text('حفظ')");
    await page.waitForSelector("[role=status]:has-text('تم الحفظ')", { timeout: 30000 });
    await page.waitForSelector("[role=dialog] form", { state: "detached", timeout: 30000 });
    await wait(500);
  }
  await page.reload();
  const catCount = await page.locator("ul.card li").count();
  ok("5 categories created", catCount === 5, String(catCount));

  // ---- ADD VEHICLES ----
  const img = path.join(shots, "test.png");
  if (!fs.existsSync(img)) {
    // Generate a real PNG without any dependency (so the test never relies on
    // a package's internal file layout): a 640x480 solid-colour image.
    const { deflateSync } = await import("node:zlib");
    const w = 640, h = 480;
    const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const row = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) { row[1 + x * 3] = 30; row[2 + x * 3] = 150; row[3 + x * 3] = 80; }
    const raw = Buffer.concat(Array.from({ length: h }, () => row));
    const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
    fs.writeFileSync(img, png);
  }
  async function addVehicle({ tx, type, make, model, year, ar, en, price, mileage, trans, cats, publish = true, period }) {
    await page.goto(`${B}/admin/vehicles/new`);
    await page.click(tx === "sale" ? "button:has-text('للبيع')" : "button:has-text('للإيجار')");
    await page.locator(`section button[aria-pressed]:has-text("${type}")`).first().click();
    await page.locator("div:has(> label:has-text('الماركة')) input").fill(make);
    await page.locator("div:has(> label:has-text('الموديل')) input").fill(model);
    await page.locator("div:has(> label:has-text('سنة الصنع')) input").fill(String(year));
    await page.locator("div:has(> label:has-text('العنوان بالعربية')) input").fill(ar);
    await page.locator("div:has(> label:has-text('العنوان بالإنجليزية')) input").fill(en);
    if (price !== undefined) await page.locator("div:has(> label:has-text('سعر')) input").first().fill(String(price));
    if (period) await page.locator("div:has(> label:has-text('فترة الإيجار')) select").selectOption(period);
    if (mileage !== undefined) await page.locator("div:has(> label:has-text('الكيلومترات')) input").fill(String(mileage));
    if (trans) await page.locator("div:has(> label:has-text('ناقل الحركة')) select").selectOption(trans);
    await page.setInputFiles("input[type=file][multiple]", [img, img]);
    await page.waitForSelector("li img[src^='/api/media/']", { timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll("li img[src^='/api/media/']").length === 2, null, { timeout: 60000 });
    for (const c of cats) await page.locator(`section:has(h2:has-text('الفئات')) button:has-text("${c}")`).click();
    await page.click(publish ? "button:has-text('حفظ ونشر')" : "button:has-text('حفظ كمسودة')");
    await page.waitForURL(/\/admin\/vehicles\/\d+$/, { timeout: 60000 });
    return page.url().split("/").pop();
  }
  const v1 = await addVehicle({ tx: "sale", type: "سيارة", make: "Toyota", model: "Corolla", year: 2011, ar: "تويوتا كورولا 2011", en: "Toyota Corolla 2011", price: 350000, mileage: 120000, trans: "automatic", cats: ["2011", "أوتوماتيك", "اقتصادية"] });
  await addVehicle({ tx: "sale", type: "سيارة", make: "Hyundai", model: "Verna", year: 2012, ar: "هيونداي فيرنا 2012", en: "Hyundai Verna 2012", price: 300000, mileage: 90000, trans: "manual", cats: ["2012", "اقتصادية"] });
  await addVehicle({ tx: "sale", type: "موتوسيكل", make: "Honda", model: "CB150", year: 2012, ar: "هوندا موتوسيكل 2012", en: "Honda CB150 2012", price: 45000, mileage: 20000, trans: "manual", cats: ["2012", "موتوسيكلات"] });
  const v4 = await addVehicle({ tx: "rent", type: "فان", make: "Toyota", model: "Hiace", year: 2020, ar: "تويوتا هاي إيس إيجار", en: "Toyota Hiace rental", price: 1500, period: "daily", trans: "manual", cats: ["أوتوماتيك"] });
  await addVehicle({ tx: "sale", type: "سيارة", make: "Kia", model: "Cerato", year: 2015, ar: "مسودة", en: "Draft Kia", price: 200000, cats: ["2011"], publish: false });
  ok("5 vehicles created via admin UI (car, motorcycle, van; sale, rent, draft)", true);
  await page.goto(`${B}/admin/vehicles/${v1}`);
  ok("edit page shows saved title", (await page.locator("div:has(> label:has-text('العنوان بالعربية')) input").inputValue()) === "تويوتا كورولا 2011");
  ok("edit page shows 3 categories selected", (await page.locator("section:has(h2:has-text('الفئات')) button[aria-pressed=true]").count()) === 3);
  ok("edit page shows 2 images persisted", (await page.locator("li img[src^='/api/media/']").count()) === 2);
  await page.goto(`${B}/admin/vehicles/${v4}`);
  ok("rent vehicle shows rental period field", (await page.locator("label:has-text('فترة الإيجار')").count()) === 1);
  ok("rent vehicle hides installment", (await page.locator("text=متاح تقسيط").count()) === 0);

  // ---- vehicles list + quick actions ----
  await page.goto(`${B}/admin/vehicles`);
  ok("admin list shows 5", (await page.locator("tbody tr").count()) === 5);
  const row = page.locator("tbody tr", { hasText: "Verna" });
  await row.locator("select").selectOption("sold");
  await page.waitForSelector("[role=status]", { timeout: 30000 });
  await wait(3000); // let the listing cache invalidate and the pages re-render

  // ---- PUBLIC ----
  const pub = await ctx.newPage();
  pub.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await pub.goto(`${B}/`);
  ok("home shows business name", (await pub.textContent("header")).includes("معرض النور"));
  ok("home has phone button", (await pub.locator("a[href='tel:01001234567']").count()) > 0);
  ok("home shows categories with counts", (await pub.locator("a[href^='/choose?cat=']").count()) >= 5);
  ok("home features published vehicles", (await pub.locator("article").count()) >= 3);
  const mainTxt = await pub.textContent("main");
  ok("home hides drafts", !mainTxt.includes("مسودة") && !mainTxt.includes("Draft Kia"));
  // sold vehicles are NOT hidden site-wide: the API must still return them
  const soldCheck = await (await fetch(`${B}/api/vehicles/search?q=Verna`)).json();
  ok("sold vehicle remains publicly listed", soldCheck.total === 1 && soldCheck.items[0].availability === "sold");
  await pub.click("header button:has-text('English')");
  await pub.waitForFunction(() => document.documentElement.dir === "ltr", null, { timeout: 30000 });
  ok("switch to English → ltr + English text", (await pub.textContent("header")).includes("Help Me Choose"));
  await pub.click("header button:has-text('عربي')");
  await pub.waitForFunction(() => document.documentElement.dir === "rtl", null, { timeout: 30000 });
  ok("switch back to Arabic → rtl", true);

  // ---- CHOOSE page filters ----
  await pub.goto(`${B}/choose`);
  await pub.waitForSelector("article", { timeout: 30000 });
  const count = async () => { await wait(1000); return pub.locator("article").count(); };
  const catBtn = (name) => pub.locator(`div:has(> h3:has-text('الفئات')) button[aria-pressed]:has-text("${name}"), div:has(> h3:has-text('اختار الفئات')) button[aria-pressed]:has-text("${name}")`).first();
  const specBtn = (label, name) => pub.locator(`div:has(> div.label:has-text('${label}')) button:has-text("${name}")`).first();
  ok("choose shows all 4 published (sold keeps a badge)", (await count()) === 4, String(await pub.locator("article").count()));
  ok("choose shows vehicle type filter", (await pub.locator("button:has-text('موتوسيكل')").count()) > 0);
  await catBtn("2011").click();
  await catBtn("2012").click();
  const c1 = await count();
  ok("cat 2011 OR 2012 → 3 (sold still matches its category)", c1 === 3, String(c1));
  ok("match-mode toggle appears", (await pub.locator("button:has-text('كل الفئات المختارة')").count()) === 1);
  await specBtn("ناقل الحركة", "أوتوماتيك").click();
  const c2 = await count();
  ok("(2011 OR 2012) AND automatic → 1", c2 === 1, String(c2));
  ok("active chips shown", (await pub.locator("button.chip-on.text-xs").count()) >= 3);
  ok("URL reflects filters", pub.url().includes("cat=") && pub.url().includes("transmission=automatic"));
  await pub.locator("button:has-text('مسح الكل')").first().click();
  ok("clear all restores 4", (await count()) === 4);
  await pub.locator("div:has(> h3:has-text('نوع المركبة')) button:has-text('موتوسيكل')").click();
  ok("vehicle type filter motorcycle → 1", (await count()) === 1);
  await pub.locator("button:has-text('مسح الكل')").first().click();
  await pub.locator("button:has-text('للإيجار')").first().click();
  ok("rent filter → Hiace only", (await count()) === 1 && (await pub.textContent("article")).includes("هاي إيس"));
  await pub.locator("button:has-text('مسح الكل')").first().click();
  await catBtn("أوتوماتيك").click();
  await catBtn("اقتصادية").click();
  await pub.click("button:has-text('كل الفئات المختارة')");
  ok("ALL mode automatic+economical → 1 (corolla)", (await count()) === 1);
  await pub.selectOption("#sort", "price_asc");
  await wait(900);
  // navigation via shared category link + browser back/forward sync
  await pub.goto(`${B}/`);
  await pub.locator("a[href^='/choose?cat=']").first().click();
  await pub.waitForURL(/\/choose\?cat=/, { timeout: 30000 });
  await pub.waitForSelector("article", { timeout: 30000 });
  await wait(1000);
  ok("category link opens choose with that filter active", (await pub.locator("button.chip-on.text-xs").count()) >= 1);
  await pub.goBack();
  await pub.waitForURL(B + "/", { timeout: 30000 });
  ok("back returns to home", true);
  await pub.goForward();
  await pub.waitForURL(/\/choose\?cat=/, { timeout: 30000 });
  await pub.waitForSelector("article", { timeout: 30000 });
  await wait(1000);
  ok("forward restores filtered choose page", (await pub.locator("button.chip-on.text-xs").count()) >= 1 && pub.url().includes("cat="));
  await pub.goto(`${B}/choose`);
  await pub.waitForSelector("article", { timeout: 30000 });

  // ---- DETAILS + inquiry ----
  await pub.goto(`${B}/vehicles`);
  await pub.waitForSelector("article");
  await pub.locator("article", { hasText: "كورولا" }).locator("a:has-text('التفاصيل')").click();
  await pub.waitForSelector("h1:has-text('كورولا')");
  const body = await pub.textContent("main");
  ok("details shows stock number", /CAR-\d{5}/.test(body));
  ok("details shows price in EGP", body.includes("350") && body.includes("ج.م"));
  ok("details shows categories", body.includes("أوتوماتيك") && body.includes("اقتصادية"));
  ok("details WhatsApp contains stock no. + absolute URL", (await pub.getAttribute("aside a[href*='wa.me']", "href")).includes("CAR-01001") && decodeURIComponent(await pub.getAttribute("aside a[href*='wa.me']", "href")).includes("http"));
  ok("gallery shows 2 images", (await pub.locator("img[src^='/api/media/']").count()) >= 2);
  // the corolla is not sold, so no sold banner here
  ok("available vehicle has no sold banner", (await pub.locator("text=هذه المركبة تم بيعها").count()) === 0);
  await pub.fill("#cf-name", "أحمد علي");
  await pub.fill("#cf-phone", "01112223334");
  await pub.click("form button:has-text('إرسال')");
  // The endpoint rate-limits per IP (5 / 10 min). On repeated runs this run may
  // legitimately be throttled, which is the protection working — not a failure.
  const throttled = (await pub.locator("text=تم إرسال عدد كبير من الرسائل").count()) > 0;
  if (throttled) {
    ok("inquiry form shows the throttle message (rate limit active)", true);
  } else {
    await pub.waitForSelector("text=تم إرسال رسالتك", { timeout: 30000 });
    ok("inquiry submitted from details page", true);
  }
  const all = await (await fetch(`${B}/api/vehicles/search?perPage=48`)).json();
  ok("search API never returns draft", !all.items.some((i) => i.titleEn === "Draft Kia"));
  const sold = await (await fetch(`${B}/api/vehicles/search?q=Verna`)).json();
  ok("sold vehicle still searchable with its badge", sold.total === 1 && sold.items[0].availability === "sold");

  // ---- admin inquiries ----
  await page.goto(`${B}/admin/inquiries`);
  ok("inquiry visible in admin with vehicle link", (await page.textContent("main")).includes("أحمد علي") && (await page.locator("a[href^='/vehicles/']").count()) > 0);
  await page.locator("select").first().selectOption("contacted");
  await wait(1500);
  await page.reload();
  ok("inquiry status persisted", (await page.locator("select").first().inputValue()) === "contacted");

  // ---- category delete keeps vehicles ----
  await page.goto(`${B}/admin/categories`);
  const before = await (await fetch(`${B}/api/vehicles/search`)).json();
  await page.locator("ul.card li", { hasText: "اقتصادية" }).locator("button.btn-danger").click();
  await page.click("button:has-text('نعم، احذف')");
  await wait(1500);
  await page.reload();
  const after = await (await fetch(`${B}/api/vehicles/search`)).json();
  ok("deleting category keeps vehicles", before.total === after.total && (await page.locator("ul.card li").count()) === 4);

  // ---- appearance colors ----
  await page.goto(`${B}/admin/appearance`);
  await page.click("button:has-text('Blue')");
  await page.locator("button:has-text('حفظ التغييرات')").first().click();
  await page.waitForSelector("[role=status]:has-text('تم الحفظ')", { timeout: 30000 });
  await pub.goto(`${B}/`);
  ok("theme color applied on public site", (await pub.content()).includes("--primary:#1d4ed8"));

  await pub.goto(`${B}/contact`);
  ok("contact page shows admin page links", (await pub.locator("a[href='https://facebook.com/example']").count()) > 0);
  ok("contact page shows Google reviews link", (await pub.locator("a[href='https://maps.app.goo.gl/TestReviews123']").count()) > 0);
  ok("Google reviews link opens safely in a new tab", (await pub.getAttribute("a[href='https://maps.app.goo.gl/TestReviews123']", "rel"))?.includes("noopener"));
  await pub.goto(`${B}/`);
  ok("footer shows Google reviews link", (await pub.locator("footer a[href='https://maps.app.goo.gl/TestReviews123']").count()) > 0);

  // ---- unauthorized ----
  const anonCtx = await browser.newContext();
  const anon = await anonCtx.newPage();
  await anon.goto(`${B}/admin/vehicles`);
  ok("anonymous redirected from admin", anon.url().includes("/admin/login"));
  const up = await anonCtx.request.post(`${B}/api/admin/media`, { multipart: { files: fs.createReadStream(img) } });
  ok("anonymous upload 401", up.status() === 401);
  // invalid file type rejected even for admin
  const txt = path.join(shots, "notimage.txt");
  fs.writeFileSync(txt, "not an image");
  const bad = await ctx.request.post(`${B}/api/admin/media`, { multipart: { files: { name: "notimage.txt", mimeType: "text/plain", buffer: fs.readFileSync(txt) } } });
  ok("non-image upload rejected 400", bad.status() === 400);
  // corrupted "image" rejected by sharp
  const fake = await ctx.request.post(`${B}/api/admin/media`, { multipart: { files: { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("definitely not a png") } } });
  ok("corrupt image rejected 400", fake.status() === 400);
  // inquiry rate limit (5 per 10 min per IP)
  let limited = false;
  for (let i = 0; i < 8; i++) {
    const r = await ctx.request.post(`${B}/api/inquiries`, { data: { name: "Flood Test", phone: "01000000000", message: "spam " + i } });
    if (r.status() === 429) { limited = true; break; }
  }
  ok("inquiry rate limiting kicks in", limited);

  // ---- mobile layout ----
  const mob = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await mob.goto(`${B}/`);
  await mob.click("header button[aria-expanded]");
  ok("mobile menu opens", (await mob.locator("nav[aria-label=Mobile]").count()) === 1);
  await mob.goto(`${B}/choose`);
  await mob.waitForSelector("article");
  const hasHScroll = await mob.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  ok("no horizontal overflow on mobile /choose", !hasHScroll);
  await mob.screenshot({ path: path.join(shots, "mobile-choose.png") });
  await pub.goto(`${B}/`); await pub.screenshot({ path: path.join(shots, "home.png") });
  await pub.goto(`${B}/choose`); await pub.waitForSelector("article"); await pub.screenshot({ path: path.join(shots, "choose.png") });
  await page.goto(`${B}/admin`); await page.screenshot({ path: path.join(shots, "admin.png") });
  await page.goto(`${B}/admin/vehicles/new`); await page.screenshot({ path: path.join(shots, "admin-new.png") });
} catch (e) {
  ok("UNCAUGHT", false, e.stack?.split("\n").slice(0, 3).join(" | "));
  await page.screenshot({ path: path.join(shots, "fail-admin.png") }).catch(() => {});
}
const serious = errors.filter((e) => !e.includes("favicon"));
ok("no page errors / 5xx during run", serious.length === 0, serious.slice(0, 5).join(" || "));
console.log("\n==== RESULTS ====");
for (const [s, n, x] of results) console.log(s, "-", n, x ? "(" + x + ")" : "");
console.log(`\n${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
await browser.close();
process.exit(results.some((r) => r[0] === "FAIL") ? 1 : 0);
