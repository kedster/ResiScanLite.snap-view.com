class ResumeLinkScanner {
    constructor() {
        this.extractedLinks = [];
        this.filteredLinks = [];
        this.progressPercent = 0;
        this.currentStage = '';
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

    // Logging functions
    log(message, type = 'info') {
        const logOutput = document.getElementById('logOutput');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;
        
        console.log(`[${timestamp}] ${message}`);
    }

    // Progress tracking functions
    updateProgress(percent, stage, title = 'Processing files...') {
        this.progressPercent = Math.min(100, Math.max(0, percent));
        this.currentStage = stage;
        
        document.getElementById('progressPercent').textContent = `${Math.round(this.progressPercent)}%`;
        document.getElementById('progressFill').style.width = `${this.progressPercent}%`;
        document.getElementById('progressStage').textContent = stage;
        document.getElementById('progressTitle').textContent = title;
        
        this.log(`Progress: ${Math.round(this.progressPercent)}% - ${stage}`, 'progress');
    }

    showProcessingUI(show) {
        document.getElementById('processingStatus').hidden = !show;
        document.getElementById('logContainer').hidden = !show;
        document.getElementById('uploadArea').style.display = show ? 'none' : 'block';
        
        if (show) {
            // Clear previous logs
            document.getElementById('logOutput').innerHTML = '';
            this.updateProgress(0, 'Initializing...');
        }
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
            this.showError('No supported files found. Please upload PDF, DOC, DOCX, or TXT files.');
            return;
        }

        this.showProcessingUI(true);
        this.extractedLinks = [];

        this.log(`Starting processing of ${supportedFiles.length} file(s)`, 'info');
        this.updateProgress(5, 'Validating files...');

        try {
            const totalFiles = supportedFiles.length;
            let processedFiles = 0;

            for (const file of supportedFiles) {
                this.log(`Processing file: ${file.name} (${this.formatFileSize(file.size)})`, 'info');
                
                // File upload stage (0-25%)
                const baseProgress = 25 + (processedFiles / totalFiles) * 50;
                this.updateProgress(baseProgress - 15, `Reading file: ${file.name}...`);
                
                await this.processFile(file, baseProgress);
                processedFiles++;
                
                this.log(`Completed processing: ${file.name}`, 'success');
            }
            
            // Link extraction complete (75-90%)
            this.updateProgress(80, 'Analyzing extracted content...');
            await this.delay(500); // Simulate analysis time
            
            this.updateProgress(90, 'Generating results...');
            await this.delay(300);
            
            if (this.extractedLinks.length === 0) {
                this.log('No links found in the uploaded files', 'warning');
                this.log('Tips: Ensure your files contain email addresses (user@domain.com) or URLs (https://example.com)', 'info');
                this.showError('No links found in the uploaded files. Ensure your files contain email addresses or URLs.');
            } else {
                this.log(`Found ${this.extractedLinks.length} link(s) total`, 'success');
                this.updateProgress(95, 'Displaying results...');
                await this.delay(200);
                this.displayResults();
            }
            
            this.updateProgress(100, 'Processing complete!');
            await this.delay(1000);
            this.showProcessingUI(false);
            
        } catch (error) {
            console.error('Error processing files:', error);
            this.log(`Error processing files: ${error.message}`, 'error');
            this.showError(`Error processing files: ${error.message}`);
            this.showProcessingUI(false);
        }
    }

    async processFile(file, baseProgress) {
        const fileName = file.name;
        let text = '';

        try {
            this.updateProgress(baseProgress - 10, `Reading ${fileName}...`);
            
            if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
                text = await this.readTextFile(file);
                this.log(`Successfully read text file: ${fileName}`, 'success');
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                this.log(`PDF processing not fully implemented yet. For demo, please use text files.`, 'warning');
                // For demo purposes, we'll skip PDF processing
                return;
            } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
                this.log(`Word document processing not fully implemented yet. For demo, please use text files.`, 'warning');
                // For demo purposes, we'll skip Word processing
                return;
            }

            this.updateProgress(baseProgress - 5, `Parsing content from ${fileName}...`);
            await this.delay(300); // Simulate parsing time

            // Extract links from the text
            this.updateProgress(baseProgress, `Extracting links from ${fileName}...`);
            const links = this.extractLinksFromText(text, fileName);
            this.extractedLinks.push(...links);
            
            this.log(`Extracted ${links.length} link(s) from ${fileName}`, links.length > 0 ? 'success' : 'info');
            
            // Log found links
            links.forEach(link => {
                this.log(`Found ${link.type}: ${link.linkText} → ${link.url}`, 'success');
            });

        } catch (error) {
            console.error(`Error processing ${fileName}:`, error);
            this.log(`Error processing ${fileName}: ${error.message}`, 'error');
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

    extractLinksFromText(text, sourceFile) {
        const links = [];
        const lines = text.split('\n');
        
        this.log(`Analyzing ${lines.length} lines of text for links...`, 'info');
        
        // Enhanced regex patterns for different link formats
        const patterns = [
            // Markdown links: [text](url)
            { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'markdown' },
            // Plain URLs with http/https
            { regex: /(https?:\/\/[^\s\]]+)/g, type: 'url' },
            // Email addresses
            { regex: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, type: 'email' },
            // URLs without protocol (www.)
            { regex: /(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/g, type: 'url' },
            // LinkedIn profile URLs
            { regex: /(linkedin\.com\/in\/[^\s\]]+)/g, type: 'linkedin' },
            // GitHub profile URLs
            { regex: /(github\.com\/[^\s\/\]]+)/g, type: 'github' }
        ];

        lines.forEach((line, lineIndex) => {
            patterns.forEach(pattern => {
                let match;
                // Reset regex lastIndex for global patterns
                pattern.regex.lastIndex = 0;
                
                while ((match = pattern.regex.exec(line)) !== null) {
                    let linkText = '';
                    let url = '';
                    let type = pattern.type;

                    if (pattern.type === 'markdown') {
                        linkText = match[1];
                        url = match[2];
                    } else if (pattern.type === 'email') {
                        linkText = match[1];
                        url = `mailto:${match[1]}`;
                    } else if (pattern.type === 'url' || pattern.type === 'linkedin' || pattern.type === 'github') {
                        linkText = match[1];
                        url = match[1];
                        // Add https if missing
                        if (!url.startsWith('http')) {
                            url = `https://${url}`;
                        }
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
        
        this.log('Results displayed successfully', 'success');
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
        this.log(`Exported ${this.filteredLinks.length} links as ${format.toUpperCase()}`, 'success');
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
        this.log('Results cleared', 'info');
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
        
        this.log(`Error: ${message}`, 'error');
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    }

    // Utility functions
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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