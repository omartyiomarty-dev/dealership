import { chromium } from "playwright";
const B = process.env.BASE;
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto(`${B}/admin/login`, { waitUntil: "domcontentloaded" });
if (!p.url().includes("/admin/setup")) { console.log("SETUP_CLOSED"); process.exit(1); }
await p.fill('input[name="name"]', "Owner");
await p.fill('input[name="email"]', "omartyiomarty@gmail.com");
await p.fill('input[name="password"]', process.env.ADPW);
await p.click("button:has-text('إنشاء الحساب')");
await p.waitForURL(/\/admin$/, { timeout: 40000 });
console.log("ADMIN_CREATED", p.url());
await b.close();
