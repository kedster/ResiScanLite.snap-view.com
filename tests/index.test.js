/**
 * Tests: ResiScanLite HTML structure (index.html)
 * Framework: Jest/Vitest-compatible (describe/test/expect). No new deps; Node fs + RegExp only.
 * Focus: Structural verification based on PR diff content for index.html.
 */

const fs = require('fs');
const path = require('path');

const candidatePaths = [
  path.join(process.cwd(), 'index.html'),
  path.join(process.cwd(), 'public', 'index.html'),
  path.join(process.cwd(), 'src', 'index.html'),
];

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ResiScanLite</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>ResiScanLite</h1>
            <p>Upload PDF or Word documents to scan for links and extract them into a searchable table</p>
        </header>

        <main>
            <section class="upload-section">
                <div class="upload-area" id="uploadArea">
                    <div class="upload-content">
                        <div class="upload-icon">📄</div>
                        <h3>Drop files here or click to browse</h3>
                        <p>Supported formats: PDF, DOC, DOCX</p>
                    </div>
                    <input type="file" id="fileInput" accept=".pdf,.doc,.docx" multiple hidden>
                </div>
                <div class="processing-status" id="processingStatus" hidden>

                    <div class="spinner"></div>
                    <span>Processing files...</span>
                </div>
            </section>

            <section class="results-section" id="resultsSection" hidden>
                <div class="results-header">

                    <h2>Extracted Links</h2>
                    <div class="results-actions">

                        <input type="text" id="searchInput" placeholder="Search links..." class="search-input">
                        <button id="exportCsv" class="btn btn-secondary">Export CSV</button>
                        <button id="exportMarkdown" class="btn btn-secondary">Export Markdown</button>
                        <button id="clearResults" class="btn btn-outline">Clear</button>
                    </div>
                </div>
                <div class="table-container">

                    <table id="resultsTable">
                        <thead>
                            <tr>
                                <th>Link Text</th>
                                <th>URL</th>
                                <th>Context Snippet</th>
                                <th>Source File</th>
                            </tr>
                        </thead>
                        <tbody id="resultsTableBody">

                        </tbody>
                    </table>
                </div>
                <div class="results-summary" id="resultsSummary"></div>
            </section>
        </main>
    </div>

    <!-- Main application script -->
    <script src="app.js"></script>
</body>
</html>`;

function readHtml() {
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch (_) {}
  }
  return FALLBACK_HTML;
}

function expectOne(regex, content, msg) {
  const m = content.match(regex);
  if (!m) {
    // Provide a more helpful failure message
    throw new Error('Expected to find: ' + (msg || regex));
  }
}

function countOccurrences(re, content) {
  const matches = content.match(re);
  return matches ? matches.length : 0;
}

describe('ResiScanLite HTML (index.html)', () => {
  let html;

  beforeAll(() => {
    html = readHtml();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(100);
  });

  test('doctype and <html lang="en"> present', () => {
    expect(html.trim().startsWith('<!DOCTYPE html>')).toBe(true);
    expect(/<html[^>]*\blang=["']en["'][^>]*>/i.test(html)).toBe(true);
  });

  test('head contains charset, viewport specifics, title, and stylesheet link', () => {
    expectOne(/<meta[^>]*charset=["']?utf-8["']?/i, html, 'charset meta');
    // Ensure viewport includes width=device-width and initial-scale
    expectOne(/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width[^"']*["']/i, html, 'viewport width=device-width');
    expectOne(/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*initial-scale=1(\.0)?[^"']*["']/i, html, 'viewport initial-scale');
    expectOne(/<title>\s*ResiScanLite\s*<\/title>/, html, 'title');
    expectOne(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']styles\.css["'][^>]*>/i, html, 'stylesheet link');
  });

  test('site header exists with navigation and branding', () => {
    expectOne(/<header[^>]*class=["'][^"']*\bsite-header\b[^"']*["'][^>]*>/i, html, 'site header');
    expectOne(/<h1[^>]*class=["'][^"']*\bbrand-title\b[^"']*["'][^>]*>\s*ResiScanLite\s*<\/h1>/i, html, 'brand title');
    expectOne(/<nav[^>]*class=["'][^"']*\bheader-nav\b[^"']*["'][^>]*>/i, html, 'header navigation');
  });

  test('container wraps main content', () => {
    expectOne(
      /<div[^>]*class=["'][^"']*\bcontainer\b[^"']*["'][^>]*>[\s\S]*<main>[\s\S]*<\/main>[\s\S]*<\/div>/i,
      html,
      'container wrapping main content'
    );
  });

  test('upload section structure and file input attributes', () => {
    expectOne(/<section[^>]*class=["'][^"']*\bupload-section\b[^"']*["'][^>]*>/i, html, 'upload section');
    expectOne(/<div[^>]*class=["'][^"']*\bupload-area\b[^"']*["'][^>]*id=["']uploadArea["'][^>]*>/i, html, 'upload area');
    expectOne(/<div[^>]*class=["'][^"']*\bupload-icon\b[^"']*["'][^>]*>📄<\/div>/, html, 'upload icon');
    expectOne(/<h3>\s*Drop files here or click to browse\s*<\/h3>/, html, 'drop files heading');
    expectOne(/<p>\s*Supported formats:\s*PDF,\s*DOC,\s*DOCX,\s*TXT\s*<\/p>/, html, 'supported formats text');

    const inputMatch = html.match(/<input[^>]*id=["']fileInput["'][^>]*>/i);
    expect(inputMatch).not.toBeNull();
    const tag = inputMatch[0];
    expect(/\btype=["']file["']/i.test(tag)).toBe(true);
    expect(/\bmultiple\b/i.test(tag)).toBe(true);
    expect(/\bhidden\b/i.test(tag)).toBe(true);
    const acceptMatch = tag.match(/\baccept=["']([^"']+)["']/i);
    expect(acceptMatch).not.toBeNull();
    const exts = acceptMatch[1].split(',').map(s => s.trim().toLowerCase());
    expect(exts).toEqual(expect.arrayContaining(['.pdf', '.doc', '.docx']));
  });

  test('processing status initially hidden with spinner and text', () => {
    expectOne(/<div[^>]*id=["']processingStatus["'][^>]*\bhidden\b[^>]*>/i, html, 'processingStatus hidden');
    expectOne(/<div[^>]*class=["'][^"']*\bspinner\b[^"']*["'][^>]*><\/div>/i, html, 'spinner element');
    expectOne(/<span>\s*Processing files\.\.\.\s*<\/span>/, html, 'processing text');
  });

  test('results section initially hidden with header, actions, and search input', () => {
    expectOne(/<section[^>]*id=["']resultsSection["'][^>]*\bhidden\b[^>]*>/i, html, 'resultsSection hidden');
    expectOne(/<h2>\s*Extracted Links\s*<\/h2>/, html, 'results header text');
    expectOne(/<div[^>]*class=["'][^"']*\bresults-actions\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i, html, 'results-actions container');
    const searchMatch = html.match(/<input[^>]*id=["']searchInput["'][^>]*>/i);
    expect(searchMatch).not.toBeNull();
    expect(/\bclass=["'][^"']*\bsearch-input\b[^"']*["']/.test(searchMatch[0])).toBe(true);
    expect(/\bplaceholder=["']Search links\.\.\.["']/.test(searchMatch[0])).toBe(true);
  });

  test('action buttons exist with correct IDs and classes', () => {
    expectOne(/<button[^>]*id=["']exportCsv["'][^>]*class=["'][^"']*\bbtn\b[^"']*\bbtn-secondary\b[^"']*["'][^>]*>\s*Export CSV\s*<\/button>/i, html, 'exportCsv button');
    expectOne(/<button[^>]*id=["']exportMarkdown["'][^>]*class=["'][^"']*\bbtn\b[^"']*\bbtn-secondary\b[^"']*["'][^>]*>\s*Export Markdown\s*<\/button>/i, html, 'exportMarkdown button');
    expectOne(/<button[^>]*id=["']clearResults["'][^>]*class=["'][^"']*\bbtn\b[^"']*\bbtn-outline\b[^"']*["'][^>]*>\s*Clear\s*<\/button>/i, html, 'clearResults button');
  });

  test('results table structure, column order, and empty tbody', () => {
    expectOne(/<table[^>]*id=["']resultsTable["'][^>]*>/i, html, 'resultsTable exists');
    const theadMatch = html.match(/<thead>([\s\S]*?)<\/thead>/i);
    expect(theadMatch).not.toBeNull();

    // Exact order of the five columns
    const headerOrder = /<tr>\s*<th>\s*Link Text\s*<\/th>\s*<th>\s*URL\s*<\/th>\s*<th>\s*Context Snippet\s*<\/th>\s*<th>\s*Source File\s*<\/th>\s*<th>\s*Bookmark\s*<\/th>\s*<\/tr>/i;
    expect(headerOrder.test(theadMatch[1])).toBe(true);

    // Exactly 5 header columns
    const thCount = (theadMatch[1].match(/<th\b/gi) || []).length;
    expect(thCount).toBe(5);

    // tbody exists and is initially empty (whitespace-only)
    const tbodyMatch = html.match(/<tbody[^>]*id=["']resultsTableBody["'][^>]*>([\s\S]*?)<\/tbody>/i);
    expect(tbodyMatch).not.toBeNull();
    expect(tbodyMatch[1].trim()).toBe('');
  });

  test('results summary container exists after table', () => {
    const tableCloseIndex = html.indexOf('</table>');
    const summaryIndex = html.indexOf('id="resultsSummary"');
    expect(tableCloseIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(tableCloseIndex);
  });

  test('unique IDs for critical elements', () => {
    const ids = [
      'uploadArea','fileInput','processingStatus','resultsSection',
      'resultsTable','resultsTableBody','resultsSummary','searchInput',
      'exportCsv','exportMarkdown','clearResults','bookmarksSection',
      'bookmarksTable','bookmarksTableBody','bookmarksSummary',
      'exportBookmarksCSV','exportBookmarksMarkdown','clearAllBookmarks'
    ];
    for (const id of ids) {
      const count = countOccurrences(new RegExp(`\\bid=["']${id}["']`, 'g'), html);
      expect(count).toBe(1);
    }
  });

  test('main application script tag exists near end of body and app.js file exists', () => {
    const scriptRe = /<script[^>]*src=["']app\.js["'][^>]*><\/script>/ig;
    let lastIndex = -1;
    let m;
    while (true) {
      m = scriptRe.exec(html);
      if (m === null) break;
      lastIndex = m.index;
    }
    expect(lastIndex).toBeGreaterThan(-1);

    const bodyClose = html.lastIndexOf('</body>');
    expect(bodyClose).toBeGreaterThan(-1);
    expect(lastIndex).toBeLessThan(bodyClose);

    const appPath = path.join(process.cwd(), 'app.js');

    expect(fs.existsSync(appPath)).toBe(true);
  });

  test('footer exists with social links and copyright', () => {
    expectOne(/<footer[^>]*class=["'][^"']*\bsite-footer\b[^"']*["'][^>]*>/i, html, 'site footer');
    expectOne(/(&copy;|©)\s*2024\s*ResiScanLite/i, html, 'copyright notice');
    expectOne(/github\.com\/kedster/i, html, 'GitHub social link');
    expectOne(/x\.com\/sethkeddy/i, html, 'X (Twitter) social link');
    expectOne(/linkedin\.com\/in\/seth-keddy/i, html, 'LinkedIn social link');
    expectOne(/peerlist\.io\/sethkeddy/i, html, 'Peerlist social link');
  });
});