/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

function findResumeLinkScannerFile() {
  const candidates = [
    'src/app.js',
    'public/app.js',
    'app.js',
    'assets/app.js',
    'web/app.js'
  ];
  for (const c of candidates) {
    const p = path.resolve(process.cwd(), c);
    if (fs.existsSync(p)) return p;
  }

  // Fall back to a lightweight recursive search (skip heavy folders)
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'out', '.next', '.turbo', 'tests']);
  function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return null;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP.has(ent.name)) continue;
        const found = walk(p);
        if (found) return found;
      } else if (ent.isFile() && p.endsWith('.js')) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          if (/class\s+ResumeLinkScanner\b/.test(content)) return p;
        } catch {}
      }
    }
    return null;
  }

  return walk(process.cwd());
}

const APP_FILE = findResumeLinkScannerFile();
if (!APP_FILE) {
  throw new Error('Could not locate the source file defining class ResumeLinkScanner. Ensure the file is present.');
}

function setupDOM() {
  document.body.innerHTML = `
    <div class="upload-section">
      <div id="uploadArea"></div>
      <input id="fileInput" type="file" />
      <input id="searchInput" type="text" />
      <button id="exportCsv">Export CSV</button>
      <button id="exportMarkdown">Export MD</button>
      <button id="clearResults">Clear</button>
    </div>
    <section id="resultsSection" hidden>
      <div id="processingStatus" hidden></div>
      <table>
        <tbody id="resultsTableBody"></tbody>
      </table>
      <div id="resultsSummary"></div>
    </section>
  `;
}

function loadScannerClass() {
  // Return existing class if already loaded
  if (window.ResumeLinkScanner) {
    return window.ResumeLinkScanner;
  }

  const raw = fs.readFileSync(APP_FILE, 'utf8');

  // Remove auto-initialization on DOMContentLoaded to avoid hidden side-effects in tests
  const cleaned = raw
    .replace(/document\.addEventListener\(\s*['"]DOMContentLoaded['"][\s\S]*?new\s+ResumeLinkScanner\(\);[\s\S]*?\);\s*$/m, '')
    .replace(/\/\/\s*Initialize the application[\s\S]*$/m, '');

  // Expose class to the window for tests
  const patched = `${cleaned}\n;window.ResumeLinkScanner = ResumeLinkScanner;`;

  const script = document.createElement('script');
  script.textContent = patched;
  document.head.appendChild(script);
  return window.ResumeLinkScanner;
}

describe('ResumeLinkScanner (unit tests)', () => {
  let ResumeLinkScanner;
  let scanner;
  const originalFileReader = global.FileReader;

  beforeAll(() => {
    // Provide URL API stubs where jsdom may not implement fully
    if (typeof globalThis.URL === 'undefined') {
      globalThis.URL = {
        createObjectURL: jest.fn(() => 'blob:mock'),
        revokeObjectURL: jest.fn()
      };
    } else {
      if (!globalThis.URL.createObjectURL) {
        globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock');
      }
      if (!globalThis.URL.revokeObjectURL) {
        globalThis.URL.revokeObjectURL = jest.fn();
      }
    }
  });

  beforeEach(() => {
    setupDOM();
    ResumeLinkScanner = loadScannerClass();
    scanner = new ResumeLinkScanner();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalFileReader) global.FileReader = originalFileReader;
  });

  test('clicking upload area triggers hidden file input click', () => {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    fileInput.click = jest.fn();

    uploadArea.dispatchEvent(new Event('click', { bubbles: true }));
    expect(fileInput.click).toHaveBeenCalledTimes(1);
  });

  test('dragover adds and dragleave removes the dragover class', () => {
    const uploadArea = document.getElementById('uploadArea');

    uploadArea.dispatchEvent(new Event('dragover', { bubbles: true }));
    expect(uploadArea.classList.contains('dragover')).toBe(true);

    uploadArea.dispatchEvent(new Event('dragleave', { bubbles: true }));
    expect(uploadArea.classList.contains('dragover')).toBe(false);
  });

  test('processFiles shows error for unsupported file types', async () => {
    const errSpy = jest.spyOn(scanner, 'showError').mockImplementation(() => {});
    await scanner.processFiles([{ name: 'image.png', type: 'image/png' }]);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/No supported files/i));
  });

  test('processFile parses links from text (markdown link, url, email, www)', async () => {
    class FR {
      readAsText(file) {
        setTimeout(() => {
          this.onload({
            target: {
              result: `Contact:
[Portfolio](https://site.example/works)
Also visit https://example.com/path?q=1
Email: test.user+dev@example.co.uk
My homepage: www.portfolio-site.dev/work`
            }
          });
        }, 0);
      }
    }
    global.FileReader = FR;

    await scanner.processFile({ name: 'resume.txt', type: 'text/plain' });

    expect(scanner.extractedLinks).toHaveLength(4);
    const urls = scanner.extractedLinks.map(l => l.url).sort();

    expect(urls).toEqual(expect.arrayContaining([
      'https://site.example/works',
      'https://example.com/path?q=1',
      'mailto:test.user+dev@example.co.uk',
      'https://www.portfolio-site.dev/work'
    ]));

    scanner.displayResults();
    expect(document.getElementById('resultsSection').hidden).toBe(false);
    const rows = document.querySelectorAll('#resultsTableBody tr');

    expect(rows.length).toBe(4);
    expect(document.getElementById('resultsSummary').textContent).toMatch(/Found 4 links in 1 file/);
  });

  test('handleSearch filters rendered rows and updates summary', () => {
    scanner.extractedLinks = [
      { linkText: 'LinkedIn', url: 'https://linkedin.com/in/me', context: 'profile', sourceFile: 'a.txt', type: 'url' },
      { linkText: 'Portfolio', url: 'https://me.dev', context: 'portfolio', sourceFile: 'a.txt', type: 'url' }
    ];
    scanner.displayResults();

    const input = document.getElementById('searchInput');
    input.value = 'linked';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const rows = document.querySelectorAll('#resultsTableBody tr');
    expect(rows.length).toBe(1);
    expect(document.getElementById('resultsSummary').textContent).toMatch(/showing 1 filtered result/);
  });

  test('exportResults(csv) produces escaped CSV and triggers download', () => {
    scanner.filteredLinks = [
      { linkText: 'A,B "quote"', url: 'https://ex.com', context: 'Line1\nLine2', sourceFile: 'file,1.txt', type: 'url' }
    ];
    const dlSpy = jest.spyOn(scanner, 'downloadFile').mockImplementation(() => {});
    scanner.exportResults('csv');

    expect(dlSpy).toHaveBeenCalledTimes(1);
    const [content, filename, mime] = dlSpy.mock.calls[0];
    expect(filename).toBe('resume-links.csv');
    expect(mime).toBe('text/csv');

    const lines = content.split('\n');
    expect(lines[0]).toBe('Link Text,URL,Context Snippet,Source File');
    expect(lines[1]).toBe('"A,B ""quote""",https://ex.com,"Line1\nLine2","file,1.txt"');
  });

  test('exportResults(markdown) groups by file and escapes markdown reserved chars', () => {
    scanner.filteredLinks = [
      { linkText: 'A|B', url: 'https://ex.com/a|b', context: 'C\\D', sourceFile: 'f1.txt', type: 'url' },
      { linkText: 'X', url: 'https://ex.com/x', context: 'Y', sourceFile: 'f2.txt', type: 'url' }
    ];
    const dlSpy = jest.spyOn(scanner, 'downloadFile').mockImplementation(() => {});
    scanner.exportResults('markdown');

    expect(dlSpy).toHaveBeenCalledTimes(1);
    const [md, filename, mime] = dlSpy.mock.calls[0];
    expect(filename).toBe('resume-links.md');
    expect(mime).toBe('text/markdown');
    expect(md).toContain('# Resume Links Report');
    expect(md).toContain('## f1.txt');
    expect(md).toContain('## f2.txt');
    expect(md).toContain('A\\|B');
    expect(md).toContain('https://ex.com/a\\|b');
    expect(md).toContain('C\\\\D');
  });

  test('clearResults resets internal state and UI inputs', () => {
    scanner.extractedLinks = [{ linkText: 'x', url: 'u', context: 'c', sourceFile: 'f', type: 'url' }];
    scanner.filteredLinks = [{ linkText: 'x', url: 'u', context: 'c', sourceFile: 'f', type: 'url' }];
    document.getElementById('resultsSection').hidden = false;
    document.getElementById('searchInput').value = 'abc';
    document.getElementById('fileInput').value = 'file.txt';

    scanner.clearResults();

    expect(scanner.extractedLinks).toHaveLength(0);
    expect(scanner.filteredLinks).toHaveLength(0);
    expect(document.getElementById('resultsSection').hidden).toBe(true);
    expect(document.getElementById('searchInput').value).toBe('');
    expect(document.getElementById('fileInput').value).toBe('');
  });

  test('showProcessingStatus toggles visibility and layout', () => {
    const uploadArea = document.getElementById('uploadArea');
    const processing = document.getElementById('processingStatus');

    scanner.showProcessingStatus(true);
    expect(processing.hidden).toBe(false);
    expect(uploadArea.style.display).toBe('none');

    scanner.showProcessingStatus(false);
    expect(processing.hidden).toBe(true);
    expect(uploadArea.style.display).toBe('block');
  });

  test('showError renders message and auto-removes after timeout', () => {
    jest.useFakeTimers();
    scanner.showError('Oops');
    const err = document.querySelector('.error-message');
    expect(err).not.toBeNull();
    jest.advanceTimersByTime(8000);
    expect(document.querySelector('.error-message')).toBeNull();
    jest.useRealTimers();
  });

  test('processFiles catches thrown errors from processFile and reports', async () => {
    const file = { name: 'resume.txt', type: 'text/plain' };
    jest.spyOn(scanner, 'processFile').mockRejectedValue(new Error('boom'));
    const errSpy = jest.spyOn(scanner, 'showError').mockImplementation(() => {});
    await scanner.processFiles([file]);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/Error processing files: boom/));
  });

  test('processFile handles PDF and Word files properly', async () => {
    const errSpy = jest.spyOn(scanner, 'showError').mockImplementation(() => {});
    
    // Test PDF file - should attempt to load PDF.js and show error when it fails
    await scanner.processFile({ name: 'x.pdf', type: 'application/pdf' });
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/PDF parsing failed/));
    
    // Test Word file - should show error when mammoth is not available
    global.mammoth = undefined;
    await scanner.processFile({ name: 'x.doc', type: 'application/msword' });
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/DOC\/DOCX parsing is not available/));
  });

  test('readDocFile processes DOCX files with mammoth.js', async () => {
    // Mock mammoth.js
    global.mammoth = {
      extractRawText: jest.fn().mockResolvedValue({
        value: 'Test content with https://example.com link',
        messages: []
      })
    };

    const mockFile = new Blob(['fake docx content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const result = await scanner.readDocFile(mockFile);
    
    expect(result).toBe('Test content with https://example.com link');
    expect(global.mammoth.extractRawText).toHaveBeenCalled();
  });

  test('readDocFile handles mammoth.js errors', async () => {
    global.mammoth = {
      extractRawText: jest.fn().mockRejectedValue(new Error('Mammoth parsing failed'))
    };

    const mockFile = new Blob(['fake docx content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    await expect(scanner.readDocFile(mockFile)).rejects.toThrow('Failed to read DOC/DOCX file: Mammoth parsing failed');
  });

  test('fileToArrayBuffer converts file to ArrayBuffer', async () => {
    const testContent = 'test file content';
    const mockFile = new Blob([testContent], { type: 'text/plain' });
    
    const result = await scanner.fileToArrayBuffer(mockFile);
    
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(result)).toBe(testContent);
  });

  test('renderTable escapes HTML to prevent injection', () => {
    scanner.extractedLinks = [{
      linkText: '<script>alert(1)</script>',
      url: 'https://example.com/?q=<x>',
      context: '<b>bold</b>',
      sourceFile: 'f.txt',
      type: 'url'
    }];
    scanner.displayResults();
    const html = document.getElementById('resultsTableBody').innerHTML;

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('https://example.com/?q=&lt;x&gt;');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });
});