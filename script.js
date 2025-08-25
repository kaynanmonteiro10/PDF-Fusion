class PDFMerger {
    constructor() {
        this.selectedFiles = [];
        this.filePageCounts = new Map(); // Armazenar contagem de páginas
        this.initializeElements();
        this.bindEvents();
        this.initializeTheme();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.selectFilesBtn = document.getElementById('selectFilesBtn');
        this.filesList = document.getElementById('filesList');
        this.filesContainer = document.getElementById('filesContainer');
        this.clearBtn = document.getElementById('clearBtn');
        this.mergeBtn = document.getElementById('mergeBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultContainer = document.getElementById('resultContainer');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newMergeBtn = document.getElementById('newMergeBtn');
        this.outputFileName = document.getElementById('outputFileName');
        this.themeSelect = document.getElementById('themeSelect');
    }

    bindEvents() {
        // Eventos de clique - CORRIGIDO: removendo evento duplicado do uploadArea
        this.selectFilesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.clearBtn.addEventListener('click', () => this.clearFiles());
        this.mergeBtn.addEventListener('click', () => this.mergePDFs());
        this.newMergeBtn.addEventListener('click', () => this.resetApp());
        this.themeSelect.addEventListener('change', (e) => this.changeTheme(e.target.value));

        // Eventos de drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Evento de clique na área de upload apenas para drag and drop
        this.uploadArea.addEventListener('click', (e) => {
            // Só abre o seletor se não foi clicado no botão
            if (!e.target.closest('.select-files-btn')) {
                this.fileInput.click();
            }
        });
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('pdfMergerTheme') || 'blue';
        this.themeSelect.value = savedTheme;
        this.changeTheme(savedTheme);
    }

    changeTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('pdfMergerTheme', theme);
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        // Limpar o input para permitir selecionar os mesmos arquivos novamente se necessário
        e.target.value = '';
    }

    async processFiles(files) {
        const pdfFiles = files.filter(file => file.type === 'application/pdf');
        
        if (pdfFiles.length === 0) {
            alert('Por favor, selecione apenas arquivos PDF.');
            return;
        }

        if (pdfFiles.length !== files.length) {
            alert('Alguns arquivos foram ignorados por não serem PDFs.');
        }

        // Adicionar arquivos e contar páginas
        for (const file of pdfFiles) {
            this.selectedFiles.push(file);
            await this.countPagesInFile(file);
        }
        
        this.updateFilesList();
        this.updateUI();
    }

    async countPagesInFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdf.getPageCount();
            this.filePageCounts.set(file.name, pageCount);
        } catch (error) {
            console.error(`Erro ao contar páginas do arquivo ${file.name}:`, error);
            this.filePageCounts.set(file.name, '?');
        }
    }

    updateFilesList() {
        this.filesContainer.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const pageCount = this.filePageCounts.get(file.name) || 'Carregando...';
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-order">${index + 1}</div>
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${this.formatFileSize(file.size)} • ${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}</p>
                    </div>
                </div>
                <div class="file-controls">
                    <button class="move-btn" onclick="pdfMerger.moveFile(${index}, 'up')" ${index === 0 ? 'disabled' : ''}>
                        ↑
                    </button>
                    <button class="move-btn" onclick="pdfMerger.moveFile(${index}, 'down')" ${index === this.selectedFiles.length - 1 ? 'disabled' : ''}>
                        ↓
                    </button>
                    <button class="remove-file" onclick="pdfMerger.removeFile(${index})">
                        ✕
                    </button>
                </div>
            `;
            this.filesContainer.appendChild(fileItem);
        });
        
        // Adicionar resumo total
        this.updateTotalSummary();
    }

    updateTotalSummary() {
        const existingSummary = this.filesContainer.querySelector('.total-summary');
        if (existingSummary) {
            existingSummary.remove();
        }

        if (this.selectedFiles.length > 0) {
            const totalPages = Array.from(this.filePageCounts.values())
                .filter(count => typeof count === 'number')
                .reduce((sum, count) => sum + count, 0);
            
            const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
            
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'total-summary';
            summaryDiv.innerHTML = `
                <div class="summary-content">
                    <h4>📊 Resumo Total</h4>
                    <p><strong>${this.selectedFiles.length}</strong> arquivos • <strong>${totalPages}</strong> páginas • <strong>${this.formatFileSize(totalSize)}</strong></p>
                </div>
            `;
            this.filesContainer.appendChild(summaryDiv);
        }
    }

    moveFile(index, direction) {
        if (direction === 'up' && index > 0) {
            [this.selectedFiles[index], this.selectedFiles[index - 1]] = 
            [this.selectedFiles[index - 1], this.selectedFiles[index]];
        } else if (direction === 'down' && index < this.selectedFiles.length - 1) {
            [this.selectedFiles[index], this.selectedFiles[index + 1]] = 
            [this.selectedFiles[index + 1], this.selectedFiles[index]];
        }
        
        this.updateFilesList();
    }

    removeFile(index) {
        const file = this.selectedFiles[index];
        this.filePageCounts.delete(file.name);
        this.selectedFiles.splice(index, 1);
        this.updateFilesList();
        this.updateUI();
    }

    clearFiles() {
        this.selectedFiles = [];
        this.filePageCounts.clear();
        this.updateFilesList();
        this.updateUI();
    }

    updateUI() {
        if (this.selectedFiles.length > 0) {
            this.filesList.style.display = 'block';
            this.mergeBtn.disabled = this.selectedFiles.length < 2;
        } else {
            this.filesList.style.display = 'none';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getOutputFileName() {
        let fileName = this.outputFileName.value.trim();
        if (!fileName) {
            fileName = 'PDFs_Unidos';
        }
        fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
        return fileName;
    }

    async mergePDFs() {
        if (this.selectedFiles.length < 2) {
            alert('Selecione pelo menos 2 arquivos PDF para juntar.');
            return;
        }

        this.showProgress();
        
        try {
            const mergedPdf = await PDFLib.PDFDocument.create();
            
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                this.updateProgress((i / this.selectedFiles.length) * 100, `Processando ${file.name}...`);
                
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            this.updateProgress(100, 'Finalizando...');
            
            const pdfBytes = await mergedPdf.save();
            this.downloadPDF(pdfBytes);
            
            setTimeout(() => {
                this.showResult();
            }, 500);
            
        } catch (error) {
            console.error('Erro ao juntar PDFs:', error);
            alert('Erro ao processar os arquivos PDF. Verifique se todos os arquivos são válidos.');
            this.hideProgress();
        }
    }

    downloadPDF(pdfBytes) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const fileName = this.getOutputFileName();
        
        this.downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}.pdf`;
            link.click();
        };
    }

    showProgress() {
        this.filesList.style.display = 'none';
        this.progressContainer.style.display = 'block';
        this.resultContainer.style.display = 'none';
    }

    updateProgress(percentage, text) {
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = text;
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
        this.filesList.style.display = 'block';
    }

    showResult() {
        this.progressContainer.style.display = 'none';
        this.resultContainer.style.display = 'block';
    }

    resetApp() {
        this.selectedFiles = [];
        this.filePageCounts.clear();
        this.fileInput.value = '';
        this.outputFileName.value = 'PDFs_Unidos';
        this.filesList.style.display = 'none';
        this.progressContainer.style.display = 'none';
        this.resultContainer.style.display = 'none';
        this.updateFilesList();
    }
}

// Inicializar a aplicação
const pdfMerger = new PDFMerger();