/* To run: use the existing test command (e.g., `npm test`). If the stylesheet is not auto-detected, run with: CSS_UNDER_TEST=relative/path/to/styles.css npm test */
/**
 * Test framework: Jest (or compatible, e.g., Vitest)
 * These tests validate the CSS defined in the PR diff by reading the stylesheet file.
 * They avoid introducing new dependencies and use regex-based assertions that are whitespace-tolerant.
 */

const fs = require('fs');
const path = require('path');

function readCssSafely() {
  // Resolve CSS path detected by the changescript, if available via environment.
  const detected = process.env.CSS_UNDER_TEST || "styles.css";
  const candidates = [
    detected,
    "styles.css",
    "src/styles.css",
    "public/styles.css",
    "assets/styles.css",
    "src/assets/styles.css",
    "app/styles.css"
  ].filter(Boolean);

  for (const rel of candidates) {

    try {
      const p = path.resolve(process.cwd(), rel);
      if (fs.existsSync(p)) {
        return { css: fs.readFileSync(p, "utf8"), path: rel };
      }
    } catch (_) {}
  }
  // As a last resort, scan for any .css containing the distinctive token.
  try {
    const { execSync } = require('child_process');
    const out = execSync("rg -n --no-heading --fixed-strings '--primary-color: #2563eb;' -g '**/*.css' || true", { encoding: 'utf8' });
    const first = out.split(/\r?\n/).filter(Boolean)[0];
    if (first) {
      const file = first.split(':')[0];
      const abs = path.resolve(process.cwd(), file);
      if (fs.existsSync(abs)) {
        return { css: fs.readFileSync(abs, 'utf8'), path: file };
      }
    }
  } catch (_) {}
  throw new Error("Could not locate the target CSS file containing the PR changes. Please ensure the stylesheet exists.");
}

function norm(s) {
  return s.replace(/\r/g, '');
}

function blockForSelector(css, selector) {
  // Very lightweight extraction: finds 'selector { ... }' and returns inner content.
  // Handles nested braces minimally by counting.
  let pattern;
  if (selector.includes("\\")) {
    pattern = new RegExp(selector + "\\s*\\{", "m");
  } else {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pattern = new RegExp(escaped + "\\s*\\{", "m");
  }
  const m = pattern.exec(css);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  let content = '';
  while (i < css.length && depth > 0) {

    const ch = css[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth > 0) content += ch;
    i++;
  }
  return content;
}

describe("styles.css - PR diff validation", () => {
  const { css, path: cssPath } = readCssSafely();
  const CSS = norm(css);

  test("stylesheet is discoverable and non-empty", () => {
    expect(cssPath).toMatch(/\.css$/);
    expect(CSS.length).toBeGreaterThan(100);
  });

  describe(":root custom properties", () => {
    const root = blockForSelector(CSS, ':root');
    test("has :root block", () => {
      expect(root).toBeTruthy();
    });

    const vars = {
      '--primary-color': '#2563eb',
      '--primary-hover': '#1d4ed8',
      '--secondary-color': '#64748b',
      '--success-color': '#10b981',
      '--warning-color': '#f59e0b',
      '--error-color': '#ef4444',
      '--border-color': '#e2e8f0',
      '--background-color': '#f8fafc',
      '--text-color': '#1e293b',
      '--text-secondary': '#64748b',
    };

    for (const [name, value] of Object.entries(vars)) {
      test(`declares ${name}: ${value}`, () => {
        const re = new RegExp(`${name}\\s*:\\s*${value}\\s*;`);
        expect(root).toMatch(re);
      });
    }
  });

  describe("Global reset and body", () => {
    test("* selector sets margin, padding, and box-sizing", () => {
      const b = blockForSelector(CSS, '\\*');
      expect(b).toMatch(/margin:\s*0\s*;/);
      expect(b).toMatch(/padding:\s*0\s*;/);
      expect(b).toMatch(/box-sizing:\s*border-box\s*;/);
    });

    test("body sets font, line-height, color, and background", () => {
      const b = blockForSelector(CSS, 'body');
      expect(b).toMatch(/font-family:\s*[^;]+;/);
      expect(b).toMatch(/line-height:\s*1\.6\s*;/);
      expect(b).toMatch(/color:\s*var\(--text-color\)\s*;/);
      expect(b).toMatch(/background-color:\s*var\(--background-color\)\s*;/);
    });
  });

  describe("Upload area interactions", () => {
    test(".upload-area base styles and hover/dragover variants", () => {
      const base = blockForSelector(CSS, '\\.upload-area');
      expect(base).toMatch(/border:\s*2px dashed var\(--border-color\)\s*;/);
      expect(base).toMatch(/border-radius:\s*12px\s*;/);
      expect(base).toMatch(/padding:\s*3rem\s*;/);
      expect(base).toMatch(/cursor:\s*pointer\s*;/);
      expect(base).toMatch(/transition:\s*all 0\.3s ease\s*;/);

      const hover = blockForSelector(CSS, '\\.upload-area:hover');
      expect(hover).toMatch(/border-color:\s*var\(--primary-color\)\s*;/);
      expect(hover).toMatch(/background-color:\s*#f0f7ff\s*;/);

      const dragover = blockForSelector(CSS, '\\.upload-area\\.dragover');
      expect(dragover).toMatch(/border-color:\s*var\(--primary-color\)\s*;/);
      expect(dragover).toMatch(/background-color:\s*#f0f7ff\s*;/);
      expect(dragover).toMatch(/transform:\s*scale\(1\.02\)\s*;/);
    });
  });

  describe("Spinner and animation", () => {
    test(".spinner styling", () => {
      const b = blockForSelector(CSS, '\\.spinner');
      expect(b).toMatch(/width:\s*24px\s*;/);
      expect(b).toMatch(/height:\s*24px\s*;/);
      expect(b).toMatch(/border:\s*3px solid var\(--border-color\)\s*;/);
      expect(b).toMatch(/border-top:\s*3px solid var\(--primary-color\)\s*;/);
      expect(b).toMatch(/border-radius:\s*50%\s*;/);
      expect(b).toMatch(/animation:\s*spin 1s linear infinite\s*;/);
    });

    test("@keyframes spin exists and rotates 0deg -> 360deg", () => {
      // Use a more robust approach to extract keyframes content
      const keyframesStart = CSS.indexOf('@keyframes spin');
      expect(keyframesStart).toBeGreaterThan(-1);
      
      const openBrace = CSS.indexOf('{', keyframesStart);
      expect(openBrace).toBeGreaterThan(-1);
      
      // Find the matching closing brace
      let braceCount = 1;
      let pos = openBrace + 1;
      while (pos < CSS.length && braceCount > 0) {
        if (CSS[pos] === '{') braceCount++;
        else if (CSS[pos] === '}') braceCount--;
        pos++;
      }
      
      const inner = CSS.substring(openBrace + 1, pos - 1);
      expect(inner).toMatch(/0%\s*\{\s*transform:\s*rotate\(0deg\)\s*;\s*\}/);
      expect(inner).toMatch(/100%\s*\{\s*transform:\s*rotate\(360deg\)\s*;\s*\}/);
    });
  });

  describe("Table and sticky header", () => {
    test("table and th/td basic layout", () => {
      const table = blockForSelector(CSS, 'table');
      expect(table).toMatch(/width:\s*100%\s*;/);
      expect(table).toMatch(/border-collapse:\s*collapse\s*;/);

      const thtd = CSS.match(/th,\s*td\s*\{([\s\S]*?)\}/);
      expect(thtd && thtd[1]).toMatch(/padding:\s*1rem\s*;/);
      expect(thtd && thtd[1]).toMatch(/text-align:\s*left\s*;/);
      expect(thtd && thtd[1]).toMatch(/border-bottom:\s*1px solid var\(--border-color\)\s*;/);
    });

    test("th is sticky with top:0 and z-index set", () => {
      const th = blockForSelector(CSS, 'th');
      expect(th).toMatch(/position:\s*sticky\s*;/);
      expect(th).toMatch(/top:\s*0\s*;/);
      expect(th).toMatch(/z-index:\s*1\s*;/);
      expect(th).toMatch(/background:\s*var\(--background-color\)\s*;/);
    });
  });

  describe("Buttons and focus styles", () => {
    test(".btn base styles", () => {
      const btn = blockForSelector(CSS, '\\.btn');
      expect(btn).toMatch(/padding:\s*0\.5rem 1rem\s*;/);
      expect(btn).toMatch(/border-radius:\s*6px\s*;/);
      expect(btn).toMatch(/cursor:\s*pointer\s*;/);
      expect(btn).toMatch(/display:\s*inline-flex\s*;/);
      expect(btn).toMatch(/align-items:\s*center\s*;/);
      expect(btn).toMatch(/gap:\s*0\.5rem\s*;/);
    });

    test(".btn-primary and hover", () => {
      const base = blockForSelector(CSS, '\\.btn-primary');
      expect(base).toMatch(/background:\s*var\(--primary-color\)\s*;/);
      expect(base).toMatch(/color:\s*white\s*;/);
      const hover = blockForSelector(CSS, '\\.btn-primary:hover');
      expect(hover).toMatch(/background:\s*var\(--primary-hover\)\s*;/);
    });

    test(".btn-secondary and hover", () => {
      const base = blockForSelector(CSS, '\\.btn-secondary');
      expect(base).toMatch(/background:\s*var\(--secondary-color\)\s*;/);
      expect(base).toMatch(/color:\s*white\s*;/);
      const hover = blockForSelector(CSS, '\\.btn-secondary:hover');
      expect(hover).toMatch(/background:\s*#475569\s*;/);
    });

    test(".btn-outline and hover", () => {
      const base = blockForSelector(CSS, '\\.btn-outline');
      expect(base).toMatch(/background:\s*transparent\s*;/);
      expect(base).toMatch(/color:\s*var\(--text-secondary\)\s*;/);
      expect(base).toMatch(/border:\s*1px solid var\(--border-color\)\s*;/);
      const hover = blockForSelector(CSS, '\\.btn-outline:hover');
      expect(hover).toMatch(/background:\s*var\(--background-color\)\s*;/);
      expect(hover).toMatch(/color:\s*var\(--text-color\)\s*;/);
    });

    test(".search-input:focus shows focus ring and border color", () => {
      const focus = blockForSelector(CSS, '\\.search-input:focus');
      expect(focus).toMatch(/outline:\s*none\s*;/);
      expect(focus).toMatch(/border-color:\s*var\(--primary-color\)\s*;/);
      expect(focus).toMatch(/box-shadow:\s*0 0 0 3px rgba\(37,\s*99,\s*235,\s*0\.1\)\s*;/);
    });
  });

  describe("Links and URL styling", () => {
    test(".url base and anchor hover behavior", () => {
      const url = blockForSelector(CSS, '\\.url');
      expect(url).toMatch(/color:\s*var\(--primary-color\)\s*;/);
      expect(url).toMatch(/word-break:\s*break-all\s*;/);
      const link = blockForSelector(CSS, '\\.url a');
      expect(link).toMatch(/color:\s*inherit\s*;/);
      expect(link).toMatch(/text-decoration:\s*none\s*;/);
      const hover = blockForSelector(CSS, '\\.url a:hover');
      expect(hover).toMatch(/text-decoration:\s*underline\s*;/);
    });
  });

  describe("Responsive media query @media (max-width: 768px)", () => {
    test("contains expected overrides", () => {
      const m = CSS.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\}\s*(?:\/\*|$)/m);
      expect(m).toBeTruthy();
      const inner = m ? m[1] : '';

      expect(blockForSelector(inner, '\\.container')).toMatch(/padding:\s*1rem\s*;/);
      expect(blockForSelector(inner, 'header h1')).toMatch(/font-size:\s*2rem\s*;/);
      expect(blockForSelector(inner, '\\.results-header')).toMatch(/flex-direction:\s*column\s*;/);
      expect(blockForSelector(inner, '\\.results-actions')).toMatch(/justify-content:\s*stretch\s*;/);
      const searchInput = blockForSelector(inner, '\\.search-input');
      expect(searchInput).toMatch(/min-width:\s*auto\s*;/);
      expect(searchInput).toMatch(/flex:\s*1\s*;/);
      expect(blockForSelector(inner, '\\.table-container')).toMatch(/font-size:\s*0\.9rem\s*;/);
      expect(blockForSelector(inner, 'th, td')).toMatch(/padding:\s*0\.5rem\s*;/);
    });
  });

  describe("Hidden utility", () => {
    test("[hidden] is display:none \\!important", () => {
      const b = blockForSelector(CSS, '\\[hidden\\]');
      expect(b).toMatch(/display:\s*none\s*\!important\s*;/);
    });
  });

  describe("Error/success messages", () => {
    test(".error-message and .success-message blocks exist with key color refs", () => {
      const err = blockForSelector(CSS, '\\.error-message');
      expect(err).toMatch(/background:\s*#fef2f2\s*;/);
      expect(err).toMatch(/color:\s*var\(--error-color\)\s*;/);

      const ok = blockForSelector(CSS, '\\.success-message');
      expect(ok).toMatch(/background:\s*#f0fdf4\s*;/);
      expect(ok).toMatch(/color:\s*var\(--success-color\)\s*;/);
    });
  });
});