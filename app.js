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

        // Export functionality
        exportCsvBtn.addEventListener('click', () => this.exportResults('csv'));
        exportMarkdownBtn.addEventListener('click', () => this.exportResults('markdown'));
        clearResultsBtn.addEventListener('click', this.clearResults.bind(this));
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
                // For demo purposes, show message about PDF processing
                this.showError(`PDF processing requires additional libraries. For demo purposes, please upload a text file (.txt) containing URLs like "https://linkedin.com/in/johndoe" or email addresses.`);
                return;
            } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
                // For demo purposes, show message about Word processing
                this.showError(`Word document processing requires additional libraries. For demo purposes, please upload a text file (.txt) containing URLs and links.`);
                return;
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
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ResumeLinkScanner();
});