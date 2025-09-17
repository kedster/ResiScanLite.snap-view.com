# Resume Link Scanner

A client-side JavaScript application that scans resume documents for links and displays them in a searchable, exportable table.

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

## How to Use

1. **Upload Files**: 
   - Click the upload area or drag and drop files
   - Supported formats: PDF, DOC, DOCX, TXT
   - Multiple files can be processed at once

2. **View Results**: 
   - Links are displayed in a table with columns:
     - Link Text
     - URL (clickable)
     - Context Snippet
     - Source File

3. **Search & Filter**: 
   - Use the search box to filter results
   - Search works across all columns

4. **Export Data**: 
   - Export CSV: Download as comma-separated values
   - Export Markdown: Download as formatted Markdown table

5. **Clear Results**: 
   - Click "Clear" to reset and upload new files

## Demo

![Initial Interface](https://github.com/user-attachments/assets/ec6c4ee6-5435-4fd2-a4d9-cb6a5d5533ff)

![Results with Search](https://github.com/user-attachments/assets/5cc1ce6a-5d9b-440f-b3cc-8e39ceff3f29)

## Technical Implementation

- **Frontend**: Pure HTML, CSS, and JavaScript (no frameworks)
- **File Processing**: Client-side text extraction and parsing
  - **DOCX**: mammoth.js for semantic text extraction
  - **PDF**: pdfjs-dist for reliable text parsing (when available)
  - **TXT**: Direct FileReader API
- **Link Detection**: Regular expressions for various URL formats
- **Export**: Blob API for file downloads
- **Responsive**: Mobile-friendly design

## Getting Started

1. Clone this repository
2. Open `index.html` in a web browser
3. No build process or server required!

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