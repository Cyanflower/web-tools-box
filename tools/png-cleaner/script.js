/**
 * PNG清理工具功能实现
 * 处理PNG文件中非必要数据块的清理
 */
document.addEventListener('DOMContentLoaded', function() {
    // 页面元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const resultArea = document.getElementById('resultArea');
    const totalFilesEl = document.getElementById('totalFiles');
    const cleanedFilesEl = document.getElementById('cleanedFiles');
    const sizeSavedEl = document.getElementById('sizeSaved');
    const logArea = document.getElementById('logArea');
    const downloadZipButton = document.getElementById('downloadZipButton');
    const downloadBtnText = document.getElementById('downloadBtnText');
    const downloadBtnDots = document.getElementById('downloadBtnDots');
    const cleanedImagesContainer = document.getElementById('cleanedImages');
    const clearWorkspaceButton = document.getElementById('clearWorkspaceButton');
    const filenameSelect = document.getElementById('filename-mode');
    
    // 清理设置元素
    const modeOptions = document.querySelectorAll('.mode-option');
    const modeRadios = document.querySelectorAll('input[name="cleaner-mode"]');
    const advancedModeOptions = document.querySelector('.advanced-mode-options');
    const essentialModeInfo = document.querySelector('.essential-mode-info');
    const chunkCheckboxes = document.querySelectorAll('.chunk-selector input[type="checkbox"]');
    
    // 全局变量
    let cleanedImages = [];
    let zip = null;
    let currentMode = 'essential-only'; // 默认清理模式
    let filenameMode = 'duplicate-counter'; // 默认文件命名模式
    let processedFileIdentifiers = new Set(); // 用于存储已处理的文件标识符（文件名+大小），防止重复上传
    let fileNameCounter = new Map(); // 用于记录每个基本文件名的计数，处理同名不同大小的文件
    let sequenceCounter = 1; // 用于按提交顺序命名的计数器
    
    // 初始化上传区域事件
    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 初始化清理模式选择
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // 清空之前的结果
            if (currentMode !== this.value) {
                clearResults();
                // 重置文件输入，确保即使选择相同文件也会触发change事件
                fileInput.value = '';
            }
            
            currentMode = this.value;
            updateModeSelection();
        });
    });
    
    // 清空结果区域的函数
    function clearResults() {
        cleanedImages = [];
        processedFileIdentifiers.clear(); // 清空已处理文件标识符集合
        fileNameCounter.clear(); // 清空文件名计数器
        sequenceCounter = 1; // 重置顺序计数器
        cleanedImagesContainer.innerHTML = '';
        logArea.innerHTML = '';
        resultArea.style.display = 'none';
        totalFilesEl.textContent = '0';
        cleanedFilesEl.textContent = '0';
        sizeSavedEl.textContent = '0 KB';
        zip = null;
    }
    
    // 更新模式选择状态
    function updateModeSelection() {
        modeOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio.checked) {
                option.classList.add('active');
                
                // 显示相应设置面板
                if (radio.value === 'essential-only') {
                    essentialModeInfo.style.display = 'block';
                    advancedModeOptions.style.display = 'none';
                } else {
                    essentialModeInfo.style.display = 'none';
                    advancedModeOptions.style.display = 'block';
                }
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    // 文件选择事件
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            // 如果是新的上传（没有已处理的文件），才清空结果
            if (cleanedImages.length === 0) {
                clearResults();
            }
            processFiles(e.target.files);
        }
    });
    
    // 拖放事件
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('active');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('active');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('active');
        
        if (e.dataTransfer.files.length > 0) {
            // 如果是新的上传（没有已处理的文件），才清空结果
            if (cleanedImages.length === 0) {
                clearResults();
            }
            processFiles(e.dataTransfer.files);
        }
    });
    
    // 下载按钮事件
    downloadZipButton.addEventListener('click', function() {
        if (zip && cleanedImages.length > 0) {
            downloadZip();
        }
    });
    
    // 清空工作区按钮事件
    clearWorkspaceButton.addEventListener('click', function() {
        clearResults();
        addLogEntry(LanguageManager.getText('workspaceCleared'), 'info-msg');
    });
    
    // 文件命名模式选择
    filenameSelect.addEventListener('change', function() {
        filenameMode = this.value;
        addLogEntry(`${LanguageManager.getText('filenameMode')}: ${this.options[this.selectedIndex].textContent}`);
    });
    
    // 处理上传的文件
    function processFiles(files) {
        // 检查文件格式
        const validFiles = Array.from(files).filter(file => {
            return file.type === 'image/png';
        });
        
        if (validFiles.length === 0) {
            addLogEntry(LanguageManager.getText('invalidFileType'), 'error-msg');
            return;
        }
        
        if (validFiles.length !== files.length) {
            addLogEntry(LanguageManager.getText('invalidFileType'), 'error-msg');
        }
        
        // 初始化结果区域
        resultArea.style.display = 'block';
        if (!zip) {
            zip = new JSZip();
        }
        
        // 过滤掉重复文件 - 使用文件名+大小作为唯一标识
        const uniqueFiles = validFiles.filter(file => {
            // 创建文件唯一标识：文件名 + 文件大小
            const fileIdentifier = `${file.name}_${file.size}`;
            
            if (processedFileIdentifiers.has(fileIdentifier)) {
                // 记录日志，提示用户该文件已处理过
                addLogEntry(`${file.name} ${LanguageManager.getText('fileAlreadyProcessed')}`, 'warning-msg');
                return false;
            }
            return true;
        });
        
        // 更新统计数字（总文件数增加新的有效文件数量）
        const currentTotalFiles = parseInt(totalFilesEl.textContent);
        totalFilesEl.textContent = currentTotalFiles + uniqueFiles.length;
        
        // 获取要移除的chunk类型
        const chunksToRemove = getChunksToRemove();
        
        // 逐个处理文件
        uniqueFiles.forEach((file, index) => {
            // 将文件标识符添加到已处理集合中
            const fileIdentifier = `${file.name}_${file.size}`;
            processedFileIdentifiers.add(fileIdentifier);
            cleanPNG(file, chunksToRemove, cleanedImages.length + index);
        });
    }
    
    // 获取要移除的chunk类型
    function getChunksToRemove() {
        const chunks = [];
        
        if (currentMode === 'essential-only') {
            // 基本模式: 移除所有非必要chunk
            chunks.push('tEXt', 'zTXt', 'iTXt', 'bKGD', 'pHYs', 'sBIT', 'tIME', 'gAMA', 'cHRM', 'iCCP');
        } else {
            // 高级模式: 仅移除选择的chunk
            chunkCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    chunks.push(checkbox.id.replace('chunk-', ''));
                }
            });
        }
        
        return chunks;
    }
    
    // 清理PNG文件
    function cleanPNG(file, chunksToRemove, index) {
        addLogEntry(`${LanguageManager.getText('processingFile')}: ${file.name}`);
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const originalBuffer = e.target.result;
                const cleanedBuffer = removePNGChunks(originalBuffer, chunksToRemove);
                
                // 创建新的Blob
                const blob = new Blob([cleanedBuffer], { type: 'image/png' });
                
                // 计算文件大小变化
                const originalSize = file.size;
                const newSize = blob.size;
                const sizeReduction = originalSize - newSize;
                const reductionPercentage = ((sizeReduction / originalSize) * 100).toFixed(2);
                
                // 处理文件名 - 根据选择的命名模式
                const fileName = file.name.substring(0, file.name.lastIndexOf('.'));
                let newFileName;

                // 根据当前的文件命名模式生成文件名
                switch(filenameMode) {
                    case 'sequence-order':
                        // 按提交顺序命名
                        newFileName = `cleaned_${sequenceCounter++}.png`;
                        break;
                        
                    case 'modification-time':
                        // 直接使用文件修改时间命名
                        const timestamp = file.lastModified;
                        const date = new Date(timestamp);
                        // 格式化为 YYYYMMDD_HHMM（只精确到分钟）
                        const formattedDate = date.getFullYear() +
                            ('0' + (date.getMonth() + 1)).slice(-2) +
                            ('0' + date.getDate()).slice(-2) + '_' +
                            ('0' + date.getHours()).slice(-2) +
                            ('0' + date.getMinutes()).slice(-2);
                            
                        // 检查是否已存在相同分钟内的文件
                        const baseTimeFileName = `cleaned_${formattedDate}`;
                        if (!fileNameCounter.has(baseTimeFileName)) {
                            fileNameCounter.set(baseTimeFileName, 0);
                        }
                        const timeCount = fileNameCounter.get(baseTimeFileName);
                        fileNameCounter.set(baseTimeFileName, timeCount + 1);
                        
                        // 同一分钟内的第一个文件不加计数器，之后的文件添加计数器
                        if (timeCount === 0) {
                            newFileName = `${baseTimeFileName}.png`;
                        } else {
                            newFileName = `${baseTimeFileName}_${timeCount}.png`;
                        }
                        break;
                        
                    case 'duplicate-counter':
                    default:
                        // 默认模式：使用原文件名，重名时添加序号
                        // 使用Map跟踪每个基本文件名的使用次数
                        if (!fileNameCounter.has(fileName)) {
                            fileNameCounter.set(fileName, 0);
                        }
                        const count = fileNameCounter.get(fileName);
                        fileNameCounter.set(fileName, count + 1);
                        
                        // 如果是同名文件的第二个及以后的实例，添加序号
                        if (count === 0) {
                            newFileName = `${fileName}_cleaned.png`;
                        } else {
                            newFileName = `${fileName}_cleaned_${count}.png`;
                        }
                        break;
                }
                
                // 添加到zip
                zip.file(newFileName, blob, { binary: true });
                
                // 创建图片URL用于预览
                const imageUrl = URL.createObjectURL(blob);
                
                // 保存清理后的图片信息
                cleanedImages.push({
                    id: index + 1,
                    originalName: file.name,
                    newName: newFileName,
                    originalSize: originalSize,
                    newSize: newSize,
                    reduction: sizeReduction,
                    reductionPercentage: reductionPercentage,
                    preview: imageUrl,
                    blob: blob
                });
                
                // 更新界面
                updateCleaningUI();
                addLogEntry(`${LanguageManager.getText('fileProcessed')}: ${newFileName}`, 'success-msg');
                
                // 创建图片预览
                createImagePreview(cleanedImages[cleanedImages.length - 1]);
                
            } catch (error) {
                addLogEntry(`${LanguageManager.getText('error')}: ${error.message}`, 'error-msg');
            }
        };
        
        reader.onerror = function() {
            addLogEntry(`${LanguageManager.getText('error')}: ${file.name}`, 'error-msg');
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // 更新清理UI
    function updateCleaningUI() {
        cleanedFilesEl.textContent = cleanedImages.length;
        
        // 计算节省的总空间
        let totalSaved = 0;
        cleanedImages.forEach(img => {
            totalSaved += img.reduction;
        });
        
        sizeSavedEl.textContent = formatSize(totalSaved);
        
        // 所有文件处理完成
        if (cleanedImages.length === parseInt(totalFilesEl.textContent)) {
            addLogEntry(LanguageManager.getText('allFilesProcessed'), 'success-msg');
        }
        // 始终重置文件输入，允许再次选择相同文件
        fileInput.value = '';
    }
    
    // 创建图片预览
    function createImagePreview(imageData) {
        const imageItem = document.createElement('div');
        imageItem.className = 'cleaned-image-item';
        
        // 图片预览
        const preview = document.createElement('img');
        preview.className = 'cleaned-image-preview';
        preview.src = imageData.preview;
        preview.alt = imageData.newName;
        
        // 图片信息
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cleaned-image-info';
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'cleaned-image-name';
        nameSpan.textContent = imageData.newName;
        
        const statsDiv = document.createElement('div');
        statsDiv.className = 'cleaned-image-stats';
        
        const originalSizeDiv = document.createElement('div');
        originalSizeDiv.className = 'size-comparison';
        originalSizeDiv.innerHTML = `<span>${LanguageManager.getText('originalSize')}:</span> <span>${formatSize(imageData.originalSize)}</span>`;
        
        const newSizeDiv = document.createElement('div');
        newSizeDiv.className = 'size-comparison';
        newSizeDiv.innerHTML = `<span>${LanguageManager.getText('newSize')}:</span> <span>${formatSize(imageData.newSize)}</span>`;
        
        const reductionDiv = document.createElement('div');
        reductionDiv.className = 'size-reduction';
        reductionDiv.textContent = `${LanguageManager.getText('reduction')}: ${imageData.reductionPercentage}% (${formatSize(imageData.reduction)})`;
        
        statsDiv.appendChild(originalSizeDiv);
        statsDiv.appendChild(newSizeDiv);
        statsDiv.appendChild(reductionDiv);
        
        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(statsDiv);
        
        // 下载按钮
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'cleaned-image-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'image-download-btn';
        downloadBtn.innerHTML = `<i class="fas fa-download"></i> ${LanguageManager.getText('downloadIndividual')}`;
        downloadBtn.addEventListener('click', function() {
            saveAs(imageData.blob, imageData.newName);
        });
        
        actionsDiv.appendChild(downloadBtn);
        
        // 组合元素
        imageItem.appendChild(preview);
        imageItem.appendChild(infoDiv);
        imageItem.appendChild(actionsDiv);
        
        cleanedImagesContainer.appendChild(imageItem);
    }
    
    // 下载zip文件
    function downloadZip() {
        downloadBtnText.textContent = LanguageManager.getText('processing');
        downloadBtnDots.style.display = 'inline-flex';
        downloadZipButton.disabled = true;
        
        zip.generateAsync({type: 'blob'})
            .then(function(blob) {
                saveAs(blob, `cleaned_png_${new Date().getTime()}.zip`);
                downloadBtnText.textContent = LanguageManager.getText('downloadZip');
                downloadBtnDots.style.display = 'none';
                downloadZipButton.disabled = false;
                addLogEntry(`${LanguageManager.getText('downloadZip')} ${LanguageManager.getText('success')}`, 'success-msg');
                
                // 下载完成后重置文件输入，允许再次选择相同文件
                fileInput.value = '';
            })
            .catch(function(error) {
                downloadBtnText.textContent = LanguageManager.getText('downloadZip');
                downloadBtnDots.style.display = 'none';
                downloadZipButton.disabled = false;
                addLogEntry(`${LanguageManager.getText('error')}: ${error.message}`, 'error-msg');
            });
    }
    
    // 添加日志条目
    function addLogEntry(message, className = '') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${className}`;
        entry.textContent = message;
        logArea.appendChild(entry);
        
        // 自动滚动到底部
        logArea.scrollTop = logArea.scrollHeight;
    }
    
    // 格式化文件大小
    function formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 移除PNG文件中的指定chunks
    function removePNGChunks(buffer, chunksToRemove) {
        // PNG文件的魔数和IHDR是必须的
        const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        const ESSENTIAL_CHUNKS = ['IHDR', 'PLTE', 'IDAT', 'IEND'];
        
        // 将ArrayBuffer转换为Uint8Array以便操作
        const data = new Uint8Array(buffer);
        
        // 检查PNG签名
        for (let i = 0; i < PNG_SIGNATURE.length; i++) {
            if (data[i] !== PNG_SIGNATURE[i]) {
                throw new Error('Invalid PNG file');
            }
        }
        
        // 创建新的buffer
        const newData = [];
        
        // 先添加PNG签名
        PNG_SIGNATURE.forEach(byte => newData.push(byte));
        
        // 从第8个字节开始循环处理每个chunk
        let position = PNG_SIGNATURE.length;
        
        while (position < data.length) {
            // 每个chunk的结构: Length (4 bytes) + Chunk Type (4 bytes) + Chunk Data (Length bytes) + CRC (4 bytes)
            const chunkLength = (data[position] << 24) | (data[position + 1] << 16) | (data[position + 2] << 8) | data[position + 3];
            position += 4;
            
            // 获取chunk类型
            const chunkTypeBytes = data.slice(position, position + 4);
            const chunkType = String.fromCharCode(...chunkTypeBytes);
            
            // 检查是否要保留当前chunk
            const shouldKeep = ESSENTIAL_CHUNKS.includes(chunkType) || !chunksToRemove.includes(chunkType);
            
            if (shouldKeep) {
                // 保留该chunk，添加长度
                newData.push(
                    (chunkLength >> 24) & 0xFF,
                    (chunkLength >> 16) & 0xFF,
                    (chunkLength >> 8) & 0xFF,
                    chunkLength & 0xFF
                );
                
                // 添加chunk类型
                for (let i = 0; i < 4; i++) {
                    newData.push(chunkTypeBytes[i]);
                }
                
                // 添加chunk数据
                for (let i = 0; i < chunkLength; i++) {
                    newData.push(data[position + 4 + i]);
                }
                
                // 添加CRC
                for (let i = 0; i < 4; i++) {
                    newData.push(data[position + 4 + chunkLength + i]);
                }
            }
            
            // 移动到下一个chunk
            position += 4 + chunkLength + 4;
        }
        
        // 返回新的ArrayBuffer
        return new Uint8Array(newData).buffer;
    }
    
    // 初始化设置
    updateModeSelection();
}); 