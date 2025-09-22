/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Setup DOM for testing
function setupDOM() {
  document.body.innerHTML = `
    <section class="upload-section">
      <div class="upload-area" id="uploadArea">
        <input type="file" id="fileInput" hidden>
      </div>
    </section>
    <section class="processing-section" id="processingStatus" hidden></section>
    <section class="results-section" id="resultsSection" hidden>
      <div class="results-actions">
        <input type="text" id="searchInput" placeholder="Search links..." class="search-input">
        <button id="exportCsv" class="btn btn-secondary">Export CSV</button>
        <button id="exportMarkdown" class="btn btn-secondary">Export Markdown</button>
        <button id="clearResults" class="btn btn-outline">Clear</button>
      </div>
      <table id="resultsTable">
        <thead>
          <tr>
            <th>Link Text</th>
            <th>URL</th>
            <th>Context Snippet</th>
            <th>Source File</th>
            <th>Bookmark</th>
          </tr>
        </thead>
        <tbody id="resultsTableBody">
        </tbody>
      </table>
      <div class="results-summary" id="resultsSummary"></div>
    </section>
    <section class="bookmarks-section" id="bookmarksSection" hidden>
      <div class="bookmarks-header">
        <h2>Bookmarked Links</h2>
        <div class="bookmarks-actions">
          <button id="exportBookmarksCSV" class="btn btn-secondary">Export Bookmarks CSV</button>
          <button id="exportBookmarksMarkdown" class="btn btn-secondary">Export Bookmarks Markdown</button>
          <button id="clearAllBookmarks" class="btn btn-outline">Clear All Bookmarks</button>
        </div>
      </div>
      <div class="table-container">
        <table id="bookmarksTable">
          <thead>
            <tr>
              <th>Link Text</th>
              <th>URL</th>
              <th>Context Snippet</th>
              <th>Source File</th>
              <th>Bookmark</th>
            </tr>
          </thead>
          <tbody id="bookmarksTableBody">
          </tbody>
        </table>
      </div>
      <div class="results-summary" id="bookmarksSummary"></div>
    </section>
    <form id="issueForm"></form>
    <input type="text" id="globalSearchInput">
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
    .replace(/document\.addEventListener\(\s*['"']DOMContentLoaded['"']\s*,\s*\([^)]*\)\s*=>\s*\{\s*new\s+ResumeLinkScanner\(\)\s*;\s*\}\s*\)\s*;\s*$/m, '');

  // Expose class to the window for tests
  const patched = `${cleaned}\n;window.ResumeLinkScanner = ResumeLinkScanner;`;

  const script = document.createElement('script');
  script.textContent = patched;
  document.head.appendChild(script);
  return window.ResumeLinkScanner;
}

describe('Bookmark functionality', () => {
  let ResumeLinkScanner;
  let scanner;

  beforeAll(() => {
    ResumeLinkScanner = loadScannerClass();
    
    // Mock localStorage
    const localStorageMock = (() => {
      let store = {};
      return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => store[key] = value),
        clear: jest.fn(() => store = {}),
        removeItem: jest.fn(key => delete store[key]),
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  beforeEach(() => {
    setupDOM();
    scanner = new ResumeLinkScanner();
    
    // Add some test data
    scanner.extractedLinks = [
      { linkText: 'Test Link 1', url: 'https://example1.com', context: 'Context 1', sourceFile: 'file1.txt', type: 'url' },
      { linkText: 'Test Link 2', url: 'https://example2.com', context: 'Context 2', sourceFile: 'file2.txt', type: 'url' },
    ];
    scanner.filteredLinks = [...scanner.extractedLinks];
    
    // Mock methods that might not work in test environment
    scanner.downloadFile = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('generateLinkId creates unique IDs for links', () => {
    const link1 = { linkText: 'Test', url: 'https://example.com', sourceFile: 'file1.txt' };
    const link2 = { linkText: 'Test', url: 'https://example.com', sourceFile: 'file2.txt' };
    
    const id1 = scanner.generateLinkId(link1);
    const id2 = scanner.generateLinkId(link2);
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2); // Different source files should generate different IDs
  });

  test('toggleBookmark adds and removes bookmarks correctly', () => {
    const link = scanner.extractedLinks[0];
    const linkId = scanner.generateLinkId(link);
    
    // Create a mock button element
    const button = document.createElement('button');
    button.setAttribute('data-link-id', linkId);
    button.classList.add('bookmark-btn');
    
    const event = { target: button };
    
    // Initially no bookmarks
    expect(scanner.bookmarkedLinks.size).toBe(0);
    expect(button.classList.contains('bookmarked')).toBe(false);
    
    // Add bookmark
    scanner.toggleBookmark(event);
    expect(scanner.bookmarkedLinks.size).toBe(1);
    expect(scanner.bookmarkedLinks.has(linkId)).toBe(true);
    expect(button.classList.contains('bookmarked')).toBe(true);
    expect(button.innerHTML).toBe('★');
    
    // Remove bookmark
    scanner.toggleBookmark(event);
    expect(scanner.bookmarkedLinks.size).toBe(0);
    expect(scanner.bookmarkedLinks.has(linkId)).toBe(false);
    expect(button.classList.contains('bookmarked')).toBe(false);
    expect(button.innerHTML).toBe('☆');
  });

  test('saveBookmarks and loadBookmarks work with localStorage', () => {
    const link = scanner.extractedLinks[0];
    const linkId = scanner.generateLinkId(link);
    
    // Add a bookmark
    scanner.bookmarkedLinks.add(linkId);
    scanner.saveBookmarks();
    
    // Create a new scanner instance and load bookmarks
    const newScanner = new ResumeLinkScanner();
    expect(newScanner.bookmarkedLinks.has(linkId)).toBe(true);
  });

  test('getBookmarkedLinks returns only bookmarked links', () => {
    const link1 = scanner.extractedLinks[0];
    const link2 = scanner.extractedLinks[1];
    const linkId1 = scanner.generateLinkId(link1);
    
    // Bookmark only the first link
    scanner.bookmarkedLinks.add(linkId1);
    
    const bookmarked = scanner.getBookmarkedLinks();
    expect(bookmarked).toHaveLength(1);
    expect(bookmarked[0]).toBe(link1);
  });

  test('exportBookmarks generates correct CSV format', () => {
    const link = scanner.extractedLinks[0];
    const linkId = scanner.generateLinkId(link);
    scanner.bookmarkedLinks.add(linkId);
    
    scanner.exportBookmarks('csv');
    
    expect(scanner.downloadFile).toHaveBeenCalledWith(
      expect.stringContaining('Link Text,URL,Context Snippet,Source File'),
      'bookmarked-links.csv',
      'text/csv'
    );
  });

  test('exportBookmarks generates correct Markdown format', () => {
    const link = scanner.extractedLinks[0];
    const linkId = scanner.generateLinkId(link);
    scanner.bookmarkedLinks.add(linkId);
    
    scanner.exportBookmarks('markdown');
    
    expect(scanner.downloadFile).toHaveBeenCalledWith(
      expect.stringContaining('# Bookmarked Links Report'),
      'bookmarked-links.md',
      'text/markdown'
    );
  });

  test('clearAllBookmarks removes all bookmarks after confirmation', () => {
    // Add bookmarks
    const link1Id = scanner.generateLinkId(scanner.extractedLinks[0]);
    const link2Id = scanner.generateLinkId(scanner.extractedLinks[1]);
    scanner.bookmarkedLinks.add(link1Id);
    scanner.bookmarkedLinks.add(link2Id);
    
    // Mock confirm to return true
    window.confirm = jest.fn(() => true);
    
    scanner.clearAllBookmarks();
    
    expect(scanner.bookmarkedLinks.size).toBe(0);
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to clear all 2 bookmarks?')
    );
  });

  test('clearAllBookmarks does nothing when user cancels', () => {
    // Add a bookmark
    const linkId = scanner.generateLinkId(scanner.extractedLinks[0]);
    scanner.bookmarkedLinks.add(linkId);
    
    // Mock confirm to return false
    window.confirm = jest.fn(() => false);
    
    scanner.clearAllBookmarks();
    
    expect(scanner.bookmarkedLinks.size).toBe(1);
  });

  test('updateBookmarksSummary shows/hides bookmarks section correctly', () => {
    const bookmarksSection = document.getElementById('bookmarksSection');
    
    // Initially no bookmarks
    scanner.updateBookmarksSummary();
    expect(bookmarksSection.hidden).toBe(true);
    
    // Add a bookmark
    const linkId = scanner.generateLinkId(scanner.extractedLinks[0]);
    scanner.bookmarkedLinks.add(linkId);
    
    scanner.updateBookmarksSummary();
    expect(bookmarksSection.hidden).toBe(false);
  });

  test('renderTable includes bookmark buttons', () => {
    scanner.renderTable();
    
    const tbody = document.getElementById('resultsTableBody');
    const bookmarkButtons = tbody.querySelectorAll('.bookmark-btn');
    
    expect(bookmarkButtons).toHaveLength(2); // One for each link
    expect(bookmarkButtons[0].innerHTML.trim()).toBe('☆'); // Not bookmarked initially
  });
});