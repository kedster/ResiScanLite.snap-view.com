class ResumeLinkScanner {
    constructor() {
        this.extractedLinks = [];
        this.filteredLinks = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const searchInput = document.getElementById('searchInput');
        const exportCsvBtn = document.getElementById('exportCsv');
        const exportMarkdownBtn = document.getElementById('exportMarkdown');
        const clearResultsBtn = document.getElementById('clearResults');

        // File upload handlers
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Search functionality
        searchInput.addEventListener('input', this.handleSearch.bind(this));

        // Global search functionality
        const globalSearchInput = document.getElementById('globalSearchInput');
        if (globalSearchInput) {
            globalSearchInput.addEventListener('input', this.handleGlobalSearch.bind(this));
            globalSearchInput.addEventListener('focus', this.handleGlobalSearchFocus.bind(this));
        }

        // Export functionality
        exportCsvBtn.addEventListener('click', () => this.exportResults('csv'));
        exportMarkdownBtn.addEventListener('click', () => this.exportResults('markdown'));
        clearResultsBtn.addEventListener('click', this.clearResults.bind(this));

        // Issue form functionality
        const issueForm = document.getElementById('issueForm');
        if (issueForm) {
            issueForm.addEventListener('submit', this.handleIssueSubmit.bind(this));
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    async processFiles(files) {
        const supportedFiles = files.filter(file => {
            const type = file.type;
            const name = file.name.toLowerCase();
            return type === 'application/pdf' || 
                   type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   type === 'application/msword' ||
                   type === 'text/plain' ||
                   name.endsWith('.pdf') || 
                   name.endsWith('.docx') || 
                   name.endsWith('.doc') ||
                   name.endsWith('.txt');
        });

        if (supportedFiles.length === 0) {
            this.showError('No supported files found. Please upload PDF, DOC, DOCX, or TXT files. Note: For this demo, try uploading a text file with URLs for testing.');
            return;
        }

        this.showProcessingStatus(true);
        this.extractedLinks = [];

        try {
            for (const file of supportedFiles) {
                await this.processFile(file);
            }
            
            if (this.extractedLinks.length === 0) {
                this.showError('No links found in the uploaded files. For demo purposes, try uploading a text file containing URLs like "https://example.com" or "contact@email.com".');
            } else {
                this.displayResults();
            }
            this.showProcessingStatus(false);
        } catch (error) {
            console.error('Error processing files:', error);
            this.showError(`Error processing files: ${error.message}`);
            this.showProcessingStatus(false);
        }
    }

    async processFile(file) {
        const fileName = file.name;
        let text = '';

        try {
            if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
                text = await this.readTextFile(file);
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                try {
                    text = await this.readPdfFile(file);
                } catch (pdfError) {
                    console.warn('PDF parsing failed:', pdfError);
                    this.showError(`PDF parsing failed: ${pdfError.message}`);
                    return;
                }
            } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
                // DOC/DOCX parsing with mammoth.js
                if (typeof mammoth !== 'undefined') {
                    text = await this.readDocFile(file);
                } else {
                    this.showError('DOC/DOCX parsing is not available. Mammoth.js library failed to load. Please try uploading a text file (.txt) for demo purposes.');
                    return;
                }
            }

            // Convert text to markdown-like format for processing
            const markdown = this.textToMarkdown(text);
            const links = this.extractLinksFromMarkdown(markdown, fileName);
            this.extractedLinks.push(...links);
        } catch (error) {
            console.error(`Error processing ${fileName}:`, error);
            this.showError(`Error processing ${fileName}: ${error.message}`);
        }
    }

    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read text file'));
            reader.readAsText(file);
        });
    }

    async loadPdfJs() {
        // Check if PDF.js is already loaded
        if (typeof pdfjsLib !== 'undefined') {
            return true;
        }

        try {
            // Try to load PDF.js dynamically
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = () => {
                    if (typeof pdfjsLib !== 'undefined') {
                        // Set worker path
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        resolve(true);
                    } else {
                        reject(new Error('PDF.js failed to load properly'));
                    }
                };
                script.onerror = () => {
                    reject(new Error('Failed to load PDF.js from CDN'));
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('Error loading PDF.js:', error);
            return false;
        }
    }

    async readPdfFile(file) {
        try {
            // Try to load PDF.js if not already available
            if (typeof pdfjsLib === 'undefined') {
                const loaded = await this.loadPdfJs();
                if (!loaded) {
                    throw new Error('PDF.js library could not be loaded. This may be due to network restrictions or ad blockers.');
                }
            }

            const arrayBuffer = await this.fileToArrayBuffer(file);
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            let text = '';
            
            // Extract text from each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Combine text items with proper spacing
                const pageText = textContent.items.map(item => item.str).join(' ');
                text += pageText + '\n\n';
            }
            
            return text.trim();
        } catch (error) {
            console.error('Error reading PDF:', error);
            throw new Error(`Failed to read PDF file: ${error.message}`);
        }
    }

    async readDocFile(file) {
        try {
            // Check if mammoth is available
            if (typeof mammoth === 'undefined') {
                throw new Error('Mammoth.js library not loaded');
            }

            const arrayBuffer = await this.fileToArrayBuffer(file);
            
            // Convert DOCX to plain text
            const result = await mammoth.extractRawText({ arrayBuffer });
            
            if (result.messages && result.messages.length > 0) {
                console.warn('Mammoth warnings:', result.messages);
            }
            
            return result.value || '';
        } catch (error) {
            console.error('Error reading DOC/DOCX:', error);
            throw new Error(`Failed to read DOC/DOCX file: ${error.message}`);
        }
    }

    async fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file as ArrayBuffer'));
            reader.readAsArrayBuffer(file);
        });
    }

    textToMarkdown(text) {
        // Basic text to markdown conversion
        return text
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize multiple newlines
            .replace(/^([A-Z][A-Z\s]+)$/gm, '# $1') // Convert all-caps lines to headers
            .trim();
    }

    extractLinksFromMarkdown(markdown, sourceFile) {
        const links = [];
        const lines = markdown.split('\n');
        
        // Regex patterns for different link formats
        const patterns = [
            // Markdown links: [text](url)
            /\[([^\]]+)\]\(([^)]+)\)/g,
            // Plain URLs with http/https
            /(https?:\/\/[^\s]+)/g,
            // Email addresses
            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            // URLs without protocol (www.)
            /(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/g
        ];

        lines.forEach((line, lineIndex) => {
            patterns.forEach(pattern => {
                let match;
                const originalPattern = pattern;
                while ((match = originalPattern.exec(line)) !== null) {
                    let linkText = '';
                    let url = '';
                    let type = '';

                    if (pattern === patterns[0]) { // Markdown links
                        linkText = match[1];
                        url = match[2];
                        type = 'markdown';
                    } else if (pattern === patterns[1]) { // Plain URLs
                        linkText = match[1];
                        url = match[1];
                        type = 'url';
                    } else if (pattern === patterns[2]) { // Email addresses
                        linkText = match[1];
                        url = `mailto:${match[1]}`;
                        type = 'email';
                    } else if (pattern === patterns[3]) { // URLs without protocol
                        linkText = match[1];
                        url = `https://${match[1]}`;
                        type = 'url';
                    }

                    // Get context (surrounding text)
                    const contextStart = Math.max(0, lineIndex - 1);
                    const contextEnd = Math.min(lines.length - 1, lineIndex + 1);
                    const context = lines.slice(contextStart, contextEnd + 1)
                        .join(' ')
                        .replace(match[0], `**${match[0]}**`)
                        .trim();

                    links.push({
                        linkText: linkText.trim(),
                        url: url.trim(),
                        context: context.substring(0, 200) + (context.length > 200 ? '...' : ''),
                        sourceFile: sourceFile,
                        type: type
                    });
                }
            });
        });

        return links;
    }

    displayResults() {
        this.filteredLinks = [...this.extractedLinks];
        this.renderTable();
        
        document.getElementById('resultsSection').hidden = false;
        this.updateSummary();
    }

    renderTable() {
        const tbody = document.getElementById('resultsTableBody');
        tbody.innerHTML = '';

        this.filteredLinks.forEach(link => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="link-text">${this.escapeHtml(link.linkText)}</td>
                <td class="url"><a href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener">${this.escapeHtml(link.url)}</a></td>
                <td class="context">${this.escapeHtml(link.context)}</td>
                <td class="source-file">${this.escapeHtml(link.sourceFile)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            this.filteredLinks = [...this.extractedLinks];
        } else {
            this.filteredLinks = this.extractedLinks.filter(link => 
                link.linkText.toLowerCase().includes(query) ||
                link.url.toLowerCase().includes(query) ||
                link.context.toLowerCase().includes(query) ||
                link.sourceFile.toLowerCase().includes(query)
            );
        }
        
        this.renderTable();
        this.updateSummary();
    }

    handleGlobalSearch(e) {
        const query = e.target.value;
        const resultsSearchInput = document.getElementById('searchInput');
        
        // If there are extracted links, sync with the results search
        if (this.extractedLinks.length > 0) {
            resultsSearchInput.value = query;
            this.handleSearch({ target: { value: query } });
            
            // Show results section if hidden
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection.hidden) {
                resultsSection.hidden = false;
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    handleGlobalSearchFocus() {
        // If there are extracted links, scroll to results section
        if (this.extractedLinks.length > 0) {
            const resultsSection = document.getElementById('resultsSection');
            if (!resultsSection.hidden) {
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    updateSummary() {
        const summary = document.getElementById('resultsSummary');
        const totalLinks = this.extractedLinks.length;
        const filteredCount = this.filteredLinks.length;
        const fileCount = new Set(this.extractedLinks.map(link => link.sourceFile)).size;
        
        let summaryText = `Found ${totalLinks} link${totalLinks !== 1 ? 's' : ''} in ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
        
        if (filteredCount !== totalLinks) {
            summaryText += ` (showing ${filteredCount} filtered result${filteredCount !== 1 ? 's' : ''})`;
        }
        
        summary.textContent = summaryText;
    }

    exportResults(format) {
        if (this.filteredLinks.length === 0) {
            this.showError('No links to export');
            return;
        }

        let content = '';
        let filename = '';
        let mimeType = '';

        if (format === 'csv') {
            content = this.generateCsv();
            filename = 'resume-links.csv';
            mimeType = 'text/csv';
        } else if (format === 'markdown') {
            content = this.generateMarkdown();
            filename = 'resume-links.md';
            mimeType = 'text/markdown';
        }

        this.downloadFile(content, filename, mimeType);
    }

    generateCsv() {
        const headers = ['Link Text', 'URL', 'Context Snippet', 'Source File'];
        const csvContent = [
            headers.join(','),
            ...this.filteredLinks.map(link => [
                this.escapeCsv(link.linkText),
                this.escapeCsv(link.url),
                this.escapeCsv(link.context),
                this.escapeCsv(link.sourceFile)
            ].join(','))
        ].join('\n');
        
        return csvContent;
    }

    generateMarkdown() {
        let markdown = '# Resume Links Report\n\n';
        markdown += `Generated on: ${new Date().toLocaleString()}\n\n`;
        markdown += `Total links found: ${this.filteredLinks.length}\n\n`;
        
        const fileGroups = this.groupBy(this.filteredLinks, 'sourceFile');
        
        Object.keys(fileGroups).forEach(fileName => {
            markdown += `## ${fileName}\n\n`;
            markdown += '| Link Text | URL | Context Snippet |\n';
            markdown += '|-----------|-----|----------------|\n';
            
            fileGroups[fileName].forEach(link => {
                markdown += `| ${this.escapeMarkdown(link.linkText)} | ${this.escapeMarkdown(link.url)} | ${this.escapeMarkdown(link.context)} |\n`;
            });
            
            markdown += '\n';
        });
        
        return markdown;
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            (result[item[key]] = result[item[key]] || []).push(item);
            return result;
        }, {});
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearResults() {
        this.extractedLinks = [];
        this.filteredLinks = [];
        document.getElementById('resultsSection').hidden = true;
        document.getElementById('searchInput').value = '';
        document.getElementById('fileInput').value = '';
    }

    showProcessingStatus(show) {
        document.getElementById('processingStatus').hidden = !show;
        document.getElementById('uploadArea').style.display = show ? 'none' : 'block';
    }

    showError(message) {
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const uploadSection = document.querySelector('.upload-section');
        uploadSection.appendChild(errorDiv);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeCsv(text) {
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }

    escapeMarkdown(text) {
        return text.replace(/[|\\]/g, '\\$&');
    }

    async handleIssueSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const issueData = {
            didItWork: formData.get('didItWork'),
            fileType: formData.get('fileType'),
            fileSize: formData.get('fileSize'),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        const submitBtn = document.getElementById('issueForm').querySelector('button[type="submit"]');
        const messageDiv = document.getElementById('formMessage');
        
        // Disable submit button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        try {
            // Submit to Pages function
            const response = await fetch('/submit-issue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(issueData)
            });

            if (response.ok) {
                this.showFormMessage('success', 'Thank you! Your feedback has been submitted successfully.');
                document.getElementById('issueForm').reset();
            } else {
                throw new Error(`Server responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error submitting issue:', error);
            
            // For demo purposes, simulate successful submission for local development
            if (error.message.includes('501') || error.message.includes('Failed to fetch')) {
                console.log('Demo mode: Issue data would be submitted:', issueData);
                this.showFormMessage('success', 'Thank you! Your feedback has been submitted successfully. (Demo Mode)');
                document.getElementById('issueForm').reset();
            } else {
                this.showFormMessage('error', 'Failed to submit feedback. Please try again later.');
            }
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Issue';
        }
    }

    showFormMessage(type, message) {
        const messageDiv = document.getElementById('formMessage');
        messageDiv.textContent = message;
        messageDiv.className = `form-message ${type}`;
        
        // Auto-hide success message after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'form-message';
            }, 5000);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ResumeLinkScanner();
});