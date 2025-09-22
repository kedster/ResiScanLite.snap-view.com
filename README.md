# ResiScanLite

A powerful client-side JavaScript application that scans resume documents for links and displays them in a searchable, exportable table. Extract and organize links from your documents quickly and securely without uploading to external servers.

## Table of Contents
- [Features](#features)
- [Getting Started](#getting-started)
- [Complete Workflow Guide](#complete-workflow-guide) 
- [Practical Examples](#practical-examples)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)
- [Technical Implementation](#technical-implementation)
- [Browser Compatibility](#browser-compatibility)
- [Future Enhancements](#future-enhancements)

## Features

- **File Upload**: Support for PDF, Word documents (.doc, .docx), and text files
- **Client-Side Processing**: All processing happens in the browser (no server required)
- **Real Document Parsing**: 
  - **DOCX files**: Uses mammoth.js for clean text extraction with semantic meaning preservation
  - **PDF files**: Uses pdfjs-dist for reliable text extraction (when CDN accessible)
  - **Text files**: Direct text processing
- **Link Extraction**: Automatically detects and extracts:
  - URLs (http/https)
  - Email addresses
  - Markdown-style links `[text](url)`
  - URLs without protocol (www.example.com)
- **Searchable Table**: Filter results by link text, URL, context, or source file
- **Export Options**: Download results as CSV or Markdown format
- **Context Snippets**: Shows surrounding text for each extracted link
- **Clean UI**: Modern, responsive design with drag-and-drop support

## Complete Workflow Guide

### Step 1: Upload Files
![Initial Interface](https://github.com/user-attachments/assets/ec6c4ee6-5435-4fd2-a4d9-cb6a5d5533ff)

**Multiple Ways to Upload:**
- **Drag & Drop**: Simply drag files from your file manager onto the upload area
- **Click to Browse**: Click the upload area to open a file picker
- **Multiple Files**: Upload several documents at once for batch processing

**Supported Formats:**
```
✓ PDF files (.pdf) - Uses PDF.js for text extraction
✓ Word documents (.doc, .docx) - Uses Mammoth.js for clean parsing
✓ Text files (.txt, .md) - Direct text processing
```

### Step 2: Processing & Results
![Results with Search](https://github.com/user-attachments/assets/5cc1ce6a-5d9b-440f-b3cc-8e39ceff3f29)

Once uploaded, ResiScanLite will:
1. **Extract text** from your document using the appropriate parser
2. **Identify links** using advanced pattern matching
3. **Display results** in an organized, searchable table with:
   - **Link Text**: The display text or raw URL
   - **URL**: Clickable link (emails show as mailto: links)
   - **Context Snippet**: Surrounding text for context
   - **Source File**: Which document contained the link

### Step 3: Search & Filter
```
🔍 Example Searches:
• "github" - Find all GitHub links
• "email" - Find email addresses
• ".pdf" - Find all links from PDF files
• "contact" - Find contact-related links
```

### Step 4: Export Options

**CSV Export** - Perfect for spreadsheets:
```csv
Link Text,URL,Context Snippet,Source File
"John Doe",mailto:john.doe@example.com,"Contact: **john.doe@example.com**",resume.pdf
"Portfolio",https://johndoe.dev,"Visit my **https://johndoe.dev** for samples",resume.pdf
```

**Markdown Export** - Organized by source file:
```markdown
## Links from resume.pdf

| Link Text | URL | Context |
|-----------|-----|---------|
| John Doe | mailto:john.doe@example.com | Contact: **john.doe@example.com** |
| Portfolio | https://johndoe.dev | Visit my **https://johndoe.dev** for samples |
```

## Practical Examples

### Example 1: Resume Link Extraction
**Sample Resume Content:**
```
JOHN DOE
Software Developer

📧 Email: john.doe@techcorp.com
🔗 LinkedIn: https://linkedin.com/in/johndoe
🐙 GitHub: https://github.com/johndoe
🌐 Portfolio: www.johndoe-portfolio.dev

EXPERIENCE
Senior Developer at TechCorp (https://techcorp.com)
• Built scalable applications
• Visit my work samples: [Portfolio](https://johndoe-portfolio.dev)
```

**Expected Results:**
- `john.doe@techcorp.com` (Email)
- `https://linkedin.com/in/johndoe` (LinkedIn profile)
- `https://github.com/johndoe` (GitHub profile) 
- `https://www.johndoe-portfolio.dev` (Portfolio - auto-adds https://)
- `https://techcorp.com` (Company website)
- `https://johndoe-portfolio.dev` (Markdown link)

### Example 2: Academic Paper Processing
**Sample Academic Content:**
```markdown
# Research Paper: AI Applications

## References
1. OpenAI ChatGPT: https://chat.openai.com
2. Contact author: researcher@university.edu
3. Dataset available: [GitHub Repository](https://github.com/research-lab/dataset)
4. University homepage: www.university.edu
```

**ResiScanLite will extract:**
- Web URLs: `https://chat.openai.com`, `https://www.university.edu`
- Email: `researcher@university.edu` (converted to `mailto:researcher@university.edu`)
- Markdown link: `https://github.com/research-lab/dataset`

### Example 3: Business Document Scanning
Perfect for processing:
- **Cover letters** with contact information
- **Project documentation** with resource links  
- **Meeting notes** with reference URLs
- **Proposals** with client websites and contacts

## Advanced Usage

### Batch Processing Multiple Files
1. Select multiple files in the file picker (Ctrl/Cmd + click)
2. Or drag multiple files at once onto the upload area
3. ResiScanLite processes each file and combines results
4. Use the "Source File" column to identify which links came from which document

### Power Search Tips
| Search Query | What It Finds | Example Results |
|-------------|---------------|-----------------|
| `github` | All GitHub-related links | github.com/username |
| `@` | All email addresses | user@domain.com |
| `.pdf` | Links from PDF files only | All links with "Source: document.pdf" |
| `linkedin` | LinkedIn profiles | linkedin.com/in/profile |
| `portfolio` | Portfolio websites | Links containing "portfolio" |

### Integration with Other Tools
**Export to Excel/Google Sheets:**
1. Click "Export CSV"
2. Open the downloaded file in Excel or Google Sheets
3. Use spreadsheet features for advanced filtering and analysis

**Export to Documentation:**
1. Click "Export Markdown"
2. Copy contents into your documentation system
3. The markdown maintains formatting and clickable links

## Troubleshooting

### Common Issues and Solutions

**🚫 "No links found in uploaded files"**
- **Cause**: Document may not contain recognizable URLs or email addresses
- **Solution**: Try with a sample document containing `https://example.com` or `test@email.com`
- **Note**: For demo purposes, upload a text file with sample URLs

**📄 PDF files not processing correctly**
- **Cause**: PDF.js CDN may not be accessible or PDF contains scanned images
- **Solution**: 
  - Ensure internet connection for PDF.js library
  - Try converting PDF to Word format first
  - Text-based PDFs work better than scanned/image PDFs

**📝 Word documents showing errors**  
- **Cause**: Very old .doc format or corrupted file
- **Solution**: 
  - Convert to .docx format using Microsoft Word
  - Try saving as plain text (.txt) first
  - Ensure file isn't password protected

**🔍 Search not working as expected**
- **Tip**: Search works across all columns - try partial matches
- **Example**: Search "gmail" to find all Gmail addresses
- **Case**: Search is case-insensitive

**💾 Export files not downloading**
- **Cause**: Browser popup blocker or permissions
- **Solution**: Allow downloads from the current site
- **Alternative**: Right-click export button and "Save Link As"

### Performance Tips

**📈 Best Practices:**
- **File Size**: Works best with files under 10MB
- **File Format**: .docx and .txt process fastest
- **Batch Processing**: Process 5-10 files at once for optimal performance
- **Browser**: Use Chrome, Firefox, Safari, or Edge for best compatibility

**⚡ Speed Optimization:**
- Close other browser tabs to free up memory
- Use text files for fastest processing
- For large PDFs, try converting to Word format first

## Technical Implementation

- **Frontend**: Pure HTML, CSS, and JavaScript (no frameworks)
- **File Processing**: Client-side text extraction and parsing
  - **DOCX**: mammoth.js for semantic text extraction
  - **PDF**: pdfjs-dist for reliable text parsing (when available)
  - **TXT**: Direct FileReader API
- **Link Detection**: Regular expressions for various URL formats
- **Export**: Blob API for file downloads
- **Responsive**: Mobile-friendly design
- **Privacy**: All processing happens locally - no data leaves your browser

## Getting Started

### Quick Start (30 seconds!)
1. **Clone and Run** - No installation needed!
   ```bash
   git clone https://github.com/kedster/ResiScanLite.snap-view.com.git
   cd ResiScanLite.snap-view.com
   open index.html  # Or double-click the file
   ```

2. **Upload Your First Document**
   - Drag and drop any PDF, Word doc, or text file onto the upload area
   - Watch as ResiScanLite instantly extracts all links

3. **Explore Your Results**
   - Search through extracted links using the search box
   - Export your data as CSV or Markdown
   - Click any URL to visit the link

### Supported File Types
| Format | Extension | Description | Processing Method |
|--------|-----------|-------------|------------------|
| **PDF** | .pdf | Portable Document Format | PDF.js text extraction |
| **Word** | .doc, .docx | Microsoft Word documents | Mammoth.js semantic parsing |
| **Text** | .txt, .md | Plain text files | Direct text processing |

### What Links Are Detected?
ResiScanLite automatically finds and extracts:
- ✅ **Web URLs**: `https://example.com`, `http://site.org`
- ✅ **Email addresses**: `contact@company.com`, `user.name+tag@domain.co.uk`
- ✅ **Markdown links**: `[Portfolio](https://johndoe.dev)`
- ✅ **Protocol-less URLs**: `www.example.com`, `company.org`

## Browser Compatibility

- Modern browsers with ES6+ support
- File API support required
- Tested on Chrome, Firefox, Safari, Edge

## Future Enhancements

- Enhanced PDF.js integration with local worker files
- Advanced link validation and status checking
- OCR support for image-based PDFs
- Microsoft Graph API integration for enterprise document conversion
- Batch processing optimization for large files