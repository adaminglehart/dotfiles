---
name: dev-browser
description: Control browsers programmatically using JavaScript and Playwright. Use when asked to "scrape a website", "test a page", "browser automation", "web scraping", "check a website", "take a screenshot", "fill a form", "automate a website", or "inspect page elements". Provides sandboxed QuickJS execution with full Playwright Page API, named persistent pages, AI-optimized element discovery, and screenshot/file I/O capabilities.
---

# Dev Browser

Control browsers programmatically using JavaScript in a sandboxed QuickJS runtime with full Playwright Page API access.

## Quick Start

**Install first (one-time):**
```bash
dev-browser install
```

**Run a script:**
```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com");
console.log(await page.title());
EOF
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Named pages** | `browser.getPage("name")` creates/retrieves a persistent page |
| **Anonymous pages** | `browser.newPage()` creates a temporary page (cleaned up after script) |
| **Browser instances** | `--browser <name>` isolates state; default is `default` |
| **Sandbox** | QuickJS WASM — no `require`, `fs`, `fetch`, or `process` |
| **Available globals** | `browser`, `console`, `setTimeout/clearTimeout`, `saveScreenshot()`, `readFile()`, `writeFile()` |

## CLI Options

| Flag | Purpose |
|------|---------|
| `--browser <name>` | Target a specific browser instance (default: `default`) |
| `--connect [<url>]` | Attach to running Chrome (auto-discover if no URL) |
| `--headless` | Run browser without visible window |
| `--ignore-https-errors` | Accept self-signed certificates |
| `--timeout <sec>` | Script timeout (default: 30) |

## Common Patterns

### Navigate and extract data
```bash
dev-browser <<'EOF'
const page = await browser.getPage("scraping");
await page.goto("https://news.ycombinator.com");
const links = await page.$$eval(".titleline > a", els => 
  els.map(e => ({ title: e.textContent, url: e.href })).slice(0, 5)
);
console.log(JSON.stringify(links, null, 2));
EOF
```

### AI-optimized element discovery
```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com");
const snapshot = await page.snapshotForAI();
console.log(snapshot.full);
// Look for [ref=eN] markers, then:
// await page.getByRole("button", { name: "Submit" }).click();
EOF
```

### Take screenshots
```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com");
const buf = await page.screenshot({ fullPage: true });
const path = await saveScreenshot(buf, "example.png");
console.log(JSON.stringify({ screenshot: path }));
EOF
```

### Connect to running Chrome
```bash
# Launch Chrome with debugging first:
# google-chrome --remote-debugging-port=9222

dev-browser --connect http://localhost:9222 <<'EOF'
const page = await browser.getPage("debug");
console.log(await page.title());
EOF
```

### File I/O (temp directory only)
```bash
dev-browser <<'EOF'
// Write data
await writeFile("data.json", JSON.stringify({ key: "value" }));

// Read it back
const data = await readFile("data.json");
console.log(JSON.parse(data));
EOF
```

## Playwright Page API

Common methods available on pages:

| Method | Use for |
|--------|---------|
| `page.goto(url)` | Navigate |
| `page.title()` | Get page title |
| `page.url()` | Get current URL |
| `page.click(selector)` | Click element |
| `page.fill(selector, value)` | Fill input |
| `page.type(selector, text)` | Type character by character |
| `page.press(selector, key)` | Press key (Enter, Tab, etc.) |
| `page.evaluate(fn)` | Run JS in page context (plain JS only, no TS) |
| `page.$$eval(sel, fn)` | Run function on all matches |
| `page.$eval(sel, fn)` | Run function on first match |
| `page.locator(selector)` | Create reusable locator |
| `page.getByRole(role, opts)` | Find by ARIA role |
| `page.waitForSelector(sel)` | Wait for element |
| `page.waitForURL(pattern)` | Wait for navigation |
| `page.screenshot(opts)` | Capture buffer → use `saveScreenshot()` |
| `page.snapshotForAI(opts)` | AI-optimized element tree |

## Browser Global API

| Method | Returns | Purpose |
|--------|---------|---------|
| `browser.getPage(name)` | Page | Get/create named page (persists) |
| `browser.newPage()` | Page | Create anonymous page (temporary) |
| `browser.listPages()` | Array | List all tabs: `{id, url, title, name}` |
| `browser.closePage(name)` | void | Close and remove named page |

## Workflow Tips

**Small, focused scripts:** Each script should do ONE thing — navigate, click, extract, or verify.

**Named pages persist:** Scripts can resume work across multiple invocations:
```bash
dev-browser --browser checkout <<'EOF'
const page = await browser.getPage("cart");
await page.goto("https://shop.example.com/cart");
await page.fill("#email", "user@example.com");
EOF

# Later — page state is preserved:
dev-browser --browser checkout <<'EOF'
const page = await browser.getPage("cart");
await page.click("button:has-text('Checkout')");
console.log(await page.url());
EOF
```

**Structured output:** Always use `console.log(JSON.stringify(...))` for machine-readable results.

**Error recovery:** If a script fails, the page stays where it stopped. Reconnect and inspect:
```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
const buf = await page.screenshot();
console.log(JSON.stringify({
  screenshot: await saveScreenshot(buf, "debug.png"),
  url: page.url(),
  title: await page.title(),
}, null, 2));
EOF
```

## Daemon Management

```bash
dev-browser status      # Check daemon status
dev-browser browsers    # List managed browser instances
dev-browser stop        # Stop daemon and all browsers
dev-browser install     # Install Playwright browsers
```

## Limitations

- **NO module loading:** No `require()` or `import()`
- **NO direct network:** No `fetch` or `WebSocket` — use page methods
- **NO filesystem:** No `fs` module — use `readFile`/`writeFile`/`saveScreenshot` (temp dir only)
- **NO process access:** No `process` global
- **QuickJS only:** Plain JavaScript in `page.evaluate()` — no TypeScript syntax

## Example: Complete Form Flow

```bash
dev-browser --browser signup --timeout 60 <<'EOF'
const page = await browser.getPage("flow");

// Navigate
await page.goto("https://example.com/signup");

// Get AI snapshot to find elements
const snapshot = await page.snapshotForAI();
console.log("Available elements:", snapshot.full);

// Fill form using discovered selectors
await page.fill('input[name="email"]', "test@example.com");
await page.fill('input[name="password"]', "secure123");

// Submit
await page.click('button[type="submit"]');

// Wait for navigation
await page.waitForURL("**/welcome");

// Verify success
console.log(JSON.stringify({
  success: true,
  url: page.url(),
  title: await page.title()
}, null, 2));
EOF
```
