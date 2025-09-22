/**
 * Tests: SEO and Meta Tags (index.html)
 * Framework: Jest/Vitest-compatible (describe/test/expect). No new deps; Node fs + RegExp only.
 * Focus: Verification of SEO improvements including meta tags, Open Graph, Twitter Cards, etc.
 */

const fs = require('fs');
const path = require('path');

const candidatePaths = [
  path.join(process.cwd(), 'index.html'),
  path.join(process.cwd(), 'public', 'index.html'),
  path.join(process.cwd(), 'src', 'index.html'),
];

function readHtml() {
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch (_) {}
  }
  return null;
}

function expectOne(regex, content, msg) {
  const m = content.match(regex);
  if (!m) {
    // Provide a more helpful failure message
    throw new Error('Expected to find: ' + (msg || regex));
  }
  return m;
}

describe('ResiScanLite SEO and Meta Tags (index.html)', () => {
  let html;

  beforeAll(() => {
    html = readHtml();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(100);
  });

  test('has comprehensive basic meta tags', () => {
    expectOne(/<meta\s+name=["']description["']\s+content=["'][^"']+["'][^>]*>/i, html, 'description meta tag');
    expectOne(/<meta\s+name=["']keywords["']\s+content=["'][^"']+["'][^>]*>/i, html, 'keywords meta tag');
    expectOne(/<meta\s+name=["']author["']\s+content=["'][^"']+["'][^>]*>/i, html, 'author meta tag');
    expectOne(/<meta\s+name=["']robots["']\s+content=["'][^"']+["'][^>]*>/i, html, 'robots meta tag');
    expectOne(/<meta\s+name=["']language["']\s+content=["'][^"']+["'][^>]*>/i, html, 'language meta tag');
  });

  test('has Open Graph (Facebook) meta tags', () => {
    expectOne(/<meta\s+property=["']og:type["']\s+content=["'][^"']+["'][^>]*>/i, html, 'og:type meta tag');
    expectOne(/<meta\s+property=["']og:url["']\s+content=["'][^"']+["'][^>]*>/i, html, 'og:url meta tag');
    expectOne(/<meta\s+property=["']og:title["']\s+content=["'][^"']+["'][^>]*>/i, html, 'og:title meta tag');
    expectOne(/<meta\s+property=["']og:description["']\s+content=["'][^"']+["'][^>]*>/i, html, 'og:description meta tag');
    expectOne(/<meta\s+property=["']og:image["']\s+content=["'][^"']+["'][^>]*>/i, html, 'og:image meta tag');
    expectOne(/<meta\s+property=["']og:site_name["']\s+content=["'][^"']*ResiScanLite[^"']*["'][^>]*>/i, html, 'og:site_name meta tag');
  });

  test('has Twitter Card meta tags', () => {
    expectOne(/<meta\s+property=["']twitter:card["']\s+content=["'][^"']+["'][^>]*>/i, html, 'twitter:card meta tag');
    expectOne(/<meta\s+property=["']twitter:url["']\s+content=["'][^"']+["'][^>]*>/i, html, 'twitter:url meta tag');
    expectOne(/<meta\s+property=["']twitter:title["']\s+content=["'][^"']+["'][^>]*>/i, html, 'twitter:title meta tag');
    expectOne(/<meta\s+property=["']twitter:description["']\s+content=["'][^"']+["'][^>]*>/i, html, 'twitter:description meta tag');
    expectOne(/<meta\s+property=["']twitter:image["']\s+content=["'][^"']+["'][^>]*>/i, html, 'twitter:image meta tag');
    expectOne(/<meta\s+property=["']twitter:creator["']\s+content=["'][^"']+["'][^>]*>/i, html, 'twitter:creator meta tag');
  });

  test('has mobile and theme meta tags', () => {
    expectOne(/<meta\s+name=["']theme-color["']\s+content=["'][^"']+["'][^>]*>/i, html, 'theme-color meta tag');
    expectOne(/<meta\s+name=["']apple-mobile-web-app-capable["']\s+content=["'][^"']+["'][^>]*>/i, html, 'apple-mobile-web-app-capable meta tag');
    expectOne(/<meta\s+name=["']apple-mobile-web-app-status-bar-style["']\s+content=["'][^"']+["'][^>]*>/i, html, 'apple-mobile-web-app-status-bar-style meta tag');
    expectOne(/<meta\s+name=["']apple-mobile-web-app-title["']\s+content=["'][^"']*ResiScanLite[^"']*["'][^>]*>/i, html, 'apple-mobile-web-app-title meta tag');
  });

  test('has structured data (JSON-LD)', () => {
    expectOne(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i, html, 'JSON-LD structured data script');
    
    // Extract and validate JSON-LD content
    const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    expect(jsonLdMatch).toBeTruthy();
    
    const jsonLdContent = jsonLdMatch[1].trim();
    expect(() => JSON.parse(jsonLdContent)).not.toThrow();
    
    const structuredData = JSON.parse(jsonLdContent);
    expect(structuredData['@context']).toBe('https://schema.org');
    expect(structuredData['@type']).toBe('WebApplication');
    expect(structuredData.name).toBe('ResiScanLite');
    expect(structuredData.description).toBeDefined();
    expect(structuredData.author).toBeDefined();
    expect(structuredData.featureList).toBeDefined();
    expect(Array.isArray(structuredData.featureList)).toBe(true);
  });

  test('title is descriptive and SEO-friendly', () => {
    const titleMatch = expectOne(/<title>([^<]+)<\/title>/i, html, 'title tag');
    const titleContent = titleMatch[1];
    
    expect(titleContent).toContain('ResiScanLite');
    expect(titleContent.length).toBeGreaterThan(20); // Descriptive title should be longer than just "ResiScanLite"
    expect(titleContent.length).toBeLessThan(70); // Should not be too long for SEO
  });

  test('description meta tag content is meaningful', () => {
    const descMatch = expectOne(/<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i, html, 'description meta tag');
    const descContent = descMatch[1];
    
    expect(descContent.length).toBeGreaterThan(50); // Should be descriptive
    expect(descContent.length).toBeLessThan(200); // Should not be too long for SEO
    expect(descContent).toContain('link'); // Should mention core functionality
    expect(descContent).toContain('document'); // Should mention core functionality
  });

  test('keywords meta tag contains relevant terms', () => {
    const keywordsMatch = expectOne(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["'][^>]*>/i, html, 'keywords meta tag');
    const keywordsContent = keywordsMatch[1].toLowerCase();
    
    expect(keywordsContent).toContain('document');
    expect(keywordsContent).toContain('scanner');
    expect(keywordsContent).toContain('link');
    expect(keywordsContent).toContain('pdf');
  });

  test('accessibility improvements are present', () => {
    expectOne(/<div[^>]*class=["'][^"']*upload-icon[^"']*["'][^>]*role=["']img["'][^>]*aria-label=["'][^"']+["'][^>]*>/i, html, 'upload icon with accessibility attributes');
    expectOne(/<nav[^>]*class=["'][^"']*header-nav[^"']*["'][^>]*role=["']navigation["'][^>]*aria-label=["'][^"']+["'][^>]*>/i, html, 'navigation with accessibility attributes');
  });
});