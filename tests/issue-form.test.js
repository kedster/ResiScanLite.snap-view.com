/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Setup DOM for testing
function setupDOM() {
  document.body.innerHTML = `
    <div class="upload-section">
      <div id="uploadArea"></div>
      <input id="fileInput" type="file" />
      <input id="searchInput" type="text" />
      <input id="globalSearchInput" type="text" />
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
    <form id="issueForm">
      <select id="didItWork" name="didItWork" required>
        <option value="">Select...</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
        <option value="partially">Partially</option>
      </select>
      <select id="fileType" name="fileType" required>
        <option value="">Select...</option>
        <option value="pdf">PDF</option>
        <option value="doc">DOC</option>
        <option value="docx">DOCX</option>
        <option value="txt">TXT</option>
        <option value="other">Other</option>
      </select>
      <select id="fileSize" name="fileSize" required>
        <option value="">Select...</option>
        <option value="small">Small (&lt; 1MB)</option>
        <option value="medium">Medium (1-10MB)</option>
        <option value="large">Large (&gt; 10MB)</option>
      </select>
      <button type="submit">Submit Issue</button>
      <div id="formMessage" class="form-message"></div>
    </form>
  `;
}

function loadScannerClass() {
  const appFile = path.join(process.cwd(), 'app.js');
  if (!fs.existsSync(appFile)) {
    throw new Error('Could not find app.js file');
  }

  const raw = fs.readFileSync(appFile, 'utf8');
  
  // Remove auto-initialization to avoid side effects
  const cleaned = raw
    .replace(/document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*\([^)]*\)\s*=>\s*\{\s*new\s+ResumeLinkScanner\(\)\s*;\s*\}\s*\)\s*;\s*$/m, '');

  // Expose class to the window for tests
  const patched = `${cleaned}\n;window.ResumeLinkScanner = ResumeLinkScanner;`;

  const script = document.createElement('script');
  script.textContent = patched;
  document.head.appendChild(script);
  return window.ResumeLinkScanner;
}

describe('Issue Form functionality', () => {
  let ResumeLinkScanner;
  let scanner;

  beforeAll(() => {
    setupDOM();
    ResumeLinkScanner = loadScannerClass();
  });

  beforeEach(() => {
    setupDOM();
    scanner = new ResumeLinkScanner();
    
    // Mock fetch for testing
    global.fetch = jest.fn();
    
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('showFormMessage displays success message correctly', () => {
    scanner.showFormMessage('success', 'Test success message');
    
    const messageDiv = document.getElementById('formMessage');
    expect(messageDiv.textContent).toBe('Test success message');
    expect(messageDiv.className).toBe('form-message success');
  });

  test('showFormMessage displays error message correctly', () => {
    scanner.showFormMessage('error', 'Test error message');
    
    const messageDiv = document.getElementById('formMessage');
    expect(messageDiv.textContent).toBe('Test error message');
    expect(messageDiv.className).toBe('form-message error');
  });

  test('handleIssueSubmit collects form data correctly', async () => {
    // Set form values
    document.getElementById('didItWork').value = 'no';
    document.getElementById('fileType').value = 'pdf';
    document.getElementById('fileSize').value = 'large';

    // Mock a successful fetch response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, id: 'test-123' })
    });

    // Create a form submit event
    const form = document.getElementById('issueForm');
    const submitEvent = new Event('submit');
    
    // Mock the form data
    const originalFormData = global.FormData;
    global.FormData = jest.fn().mockImplementation(() => ({
      get: jest.fn((key) => {
        const values = {
          'didItWork': 'no',
          'fileType': 'pdf',
          'fileSize': 'large'
        };
        return values[key];
      })
    }));

    await scanner.handleIssueSubmit(submitEvent);

    // Verify fetch was called with correct data
    expect(global.fetch).toHaveBeenCalledWith('/submit-issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining('"didItWork":"no"')
    });

    // Restore FormData
    global.FormData = originalFormData;
  });

  test('handleIssueSubmit handles fetch errors gracefully', async () => {
    // Set form values
    document.getElementById('didItWork').value = 'yes';
    document.getElementById('fileType').value = 'txt';
    document.getElementById('fileSize').value = 'small';

    // Mock fetch to reject with a 501 error
    global.fetch.mockRejectedValueOnce(new Error('Server responded with status: 501'));

    const form = document.getElementById('issueForm');
    const submitEvent = new Event('submit');
    
    // Mock FormData
    const originalFormData = global.FormData;
    global.FormData = jest.fn().mockImplementation(() => ({
      get: jest.fn((key) => {
        const values = {
          'didItWork': 'yes',
          'fileType': 'txt',
          'fileSize': 'small'
        };
        return values[key];
      })
    }));

    await scanner.handleIssueSubmit(submitEvent);

    // Should show demo mode success message for 501 errors
    const messageDiv = document.getElementById('formMessage');
    expect(messageDiv.textContent).toBe('Thank you! Your feedback has been submitted successfully. (Demo Mode)');
    expect(messageDiv.className).toBe('form-message success');

    // Restore FormData
    global.FormData = originalFormData;
  });

  test('form has required validation attributes', () => {
    expect(document.getElementById('didItWork').hasAttribute('required')).toBe(true);
    expect(document.getElementById('fileType').hasAttribute('required')).toBe(true);
    expect(document.getElementById('fileSize').hasAttribute('required')).toBe(true);
  });
});