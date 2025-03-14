/**
 * 图片格式转换器功能实现
 * 处理PNG与JPG图片格式互相转换
 */
document.addEventListener('DOMContentLoaded', function() {
    // 页面元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const resultArea = document.getElementById('resultArea');
    const totalFilesEl = document.getElementById('totalFiles');
    const convertedFilesEl = document.getElementById('convertedFiles');
    const totalSizeEl = document.getElementById('totalSize');
    const logArea = document.getElementById('logArea');
    const downloadZipButton = document.getElementById('downloadZipButton');
    const downloadBtnText = document.getElementById('downloadBtnText');
    const downloadBtnDots = document.getElementById('downloadBtnDots');
    const convertedImagesContainer = document.getElementById('convertedImages');
    const clearWorkspaceButton = document.getElementById('clearWorkspaceButton');
    
    // 转换设置元素
    const modeOptions = document.querySelectorAll('.mode-option');
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const jpgQualitySlider = document.getElementById('jpg-quality');
    const jpgQualityValue = document.querySelector('.quality-value');
    const backgroundColorPicker = document.getElementById('background-color');
    const colorValueInput = document.getElementById('color-value-input');
    const preserveMetadataJpg = document.getElementById('preserve-metadata-jpg');
    const preserveMetadataPng = document.getElementById('preserve-metadata-png');
    const pngToJpgSettings = document.querySelector('.png-to-jpg-settings');
    const jpgToPngSettings = document.querySelector('.jpg-to-png-settings');
    const commonSettings = document.querySelector('.common-settings');
    const filenameSelect = document.getElementById('filename-mode');
    const resetSettingsButton = document.getElementById('reset-settings');
    
    // 全局变量
    let convertedImages = [];
    let zip = null;
    let currentMode = 'png-to-jpg'; // 默认转换模式
    let filenameMode = 'duplicate-counter'; // 默认文件命名模式
    let fileNameCounter = new Map(); // 用于记录每个基本文件名的计数，处理同名不同大小的文件
    let fileSequenceCounter = 1; // 用于数字序号命名
    
    // 初始化上传区域事件
    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 文件命名模式选择
    filenameSelect.addEventListener('change', function() {
        filenameMode = this.value;
        addLogEntry(`${LanguageManager.getText('filenameMode')}: ${this.options[this.selectedIndex].textContent}`);
    });
    
    // 初始化转换模式选择
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            // 如果模式改变了，清空结果区域
            if (currentMode !== this.value) {
                clearResults();
                // 重置文件输入，确保即使选择相同文件也会触发change事件
                fileInput.value = '';
            }
            
            currentMode = this.value;
            updateModeSelection();
            updateFileInputAcceptType();
        });
    });
    
    // 更新模式选择状态
    function updateModeSelection() {
        modeOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio.checked) {
                option.classList.add('active');
                
                // 显示相应设置面板
                if (radio.value === 'png-to-jpg') {
                    pngToJpgSettings.style.display = 'block';
                    jpgToPngSettings.style.display = 'none';
                } else {
                    pngToJpgSettings.style.display = 'none';
                    jpgToPngSettings.style.display = 'block';
                }
            } else {
                option.classList.remove('active');
            }
        });
        
        // 通用设置始终显示
        commonSettings.style.display = 'block';
    }
    
    // 清空结果区域的函数
    function clearResults() {
        convertedImages = [];
        fileNameCounter.clear(); // 清空文件名计数器
        fileSequenceCounter = 1; // 重置序号计数器
        convertedImagesContainer.innerHTML = '';
        logArea.innerHTML = '';
        resultArea.style.display = 'none';
        totalFilesEl.textContent = '0';
        convertedFilesEl.textContent = '0';
        totalSizeEl.textContent = '0 KB';
        zip = null;
    }
    
    // 更新文件输入接受类型
    function updateFileInputAcceptType() {
        if (currentMode === 'png-to-jpg') {
            fileInput.accept = '.png';
        } else {
            fileInput.accept = '.jpg,.jpeg';
        }
    }
    
    // 质量滑块更新
    jpgQualitySlider.addEventListener('input', function() {
        jpgQualityValue.textContent = this.value;
    });
    
    // 颜色选择器和十六进制输入框的双向绑定
    
    // 颜色选择器更新时更新输入框
    backgroundColorPicker.addEventListener('input', function() {
        colorValueInput.value = this.value;
        colorValueInput.classList.remove('invalid');
    });
    
    // 十六进制输入框更新时更新颜色选择器
    colorValueInput.addEventListener('input', function() {
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        const value = this.value;
        
        // 添加 # 前缀（如果用户没有输入）
        if (value.length > 0 && value[0] !== '#') {
            this.value = '#' + value;
        }
        
        // 验证十六进制颜色格式
        if (this.value.match(hexColorRegex)) {
            backgroundColorPicker.value = this.value;
            this.classList.remove('invalid');
        } else {
            this.classList.add('invalid');
        }
    });
    
    // 十六进制输入框失焦时进行格式矫正
    colorValueInput.addEventListener('blur', function() {
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        
        // 如果格式不正确，回退到颜色选择器的值
        if (!this.value.match(hexColorRegex)) {
            this.value = backgroundColorPicker.value;
            this.classList.remove('invalid');
        } 
        // 将3位十六进制转换为6位（如 #abc 转为 #aabbcc）
        else if (this.value.length === 4) {
            const r = this.value[1];
            const g = this.value[2];
            const b = this.value[3];
            this.value = `#${r}${r}${g}${g}${b}${b}`;
            backgroundColorPicker.value = this.value;
        }
    });
    
    // 重置设置按钮
    resetSettingsButton.addEventListener('click', function() {
        // 重置JPG质量
        jpgQualitySlider.value = 90;
        jpgQualityValue.textContent = '90';
        
        // 重置背景颜色
        backgroundColorPicker.value = '#ffffff';
        colorValueInput.value = '#ffffff';
        colorValueInput.classList.remove('invalid');
        
        // 重置保留元数据选项
        preserveMetadataJpg.checked = true;
        preserveMetadataPng.checked = true;
        
        // 重置数字序号命名选项
        filenameMode = 'duplicate-counter';
        filenameSelect.value = 'duplicate-counter';
    });
    
    // 文件选择事件
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            // 如果是新的上传（没有已处理的文件），才清空结果
            if (convertedImages.length === 0) {
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
            if (convertedImages.length === 0) {
                clearResults();
            }
            processFiles(e.dataTransfer.files);
        }
    });
    
    // 下载按钮事件
    downloadZipButton.addEventListener('click', function() {
        if (zip && convertedImages.length > 0) {
            downloadZip();
        }
    });
    
    // 清空工作区按钮事件
    clearWorkspaceButton.addEventListener('click', function() {
        if (convertedImages.length > 0) {
            clearResults();
            addLogEntry(LanguageManager.getText('clearWorkspace'), 'success-msg');
        }
    });
    
    // 处理上传的文件
    function processFiles(files) {
        // 检查文件格式是否符合当前模式
        const validFiles = Array.from(files).filter(file => {
            if (currentMode === 'png-to-jpg') {
                return file.type === 'image/png';
            } else {
                return file.type === 'image/jpeg';
            }
        });
        
        if (validFiles.length === 0) {
            addLogEntry(`${LanguageManager.getText('invalidFileType')} ${currentMode === 'png-to-jpg' ? 'PNG' : 'JPG/JPEG'}`, 'error-msg');
            return;
        }
        
        if (validFiles.length !== files.length) {
            addLogEntry(LanguageManager.getText('incompatibleMode'), 'error-msg');
        }
        
        // 初始化结果区域
        resultArea.style.display = 'block';
        if (!zip) {
            zip = new JSZip();
        }
        
        // 更新统计数字（总文件数增加新的有效文件数量）
        const currentTotalFiles = parseInt(totalFilesEl.textContent);
        totalFilesEl.textContent = currentTotalFiles + validFiles.length;
        
        // 获取当前设置
        const settings = {
            mode: currentMode,
            jpgQuality: parseInt(jpgQualitySlider.value) / 100,
            backgroundColor: backgroundColorPicker.value,
            preserveMetadata: currentMode === 'png-to-jpg' ? preserveMetadataJpg.checked : preserveMetadataPng.checked,
            filenameMode: filenameMode
        };
        
        // 逐个处理文件
        validFiles.forEach((file, index) => {
            convertImage(file, settings, convertedImages.length + index);
        });
    }
    
    // 转换图片
    function convertImage(file, settings, index) {
        addLogEntry(`${LanguageManager.getText('processingFile')}: ${file.name}`);
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                try {
                    // 创建画布
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 设置画布大小
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    if (settings.mode === 'png-to-jpg') {
                        // PNG转JPG
                        // 设置背景色（JPG不支持透明度）
                        ctx.fillStyle = settings.backgroundColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    // 绘制图像
                    ctx.drawImage(img, 0, 0);
                    
                    // 获取新的图像数据
                    let fileExtension, mimeType, quality;
                    let fileName = file.name.substring(0, file.name.lastIndexOf('.'));
                    
                    if (settings.mode === 'png-to-jpg') {
                        fileExtension = '.jpg';
                        mimeType = 'image/jpeg';
                        quality = settings.jpgQuality;
                    } else {
                        fileExtension = '.png';
                        mimeType = 'image/png';
                        quality = 1; // PNG使用无损压缩
                    }
                    
                    let newFileName;
                    
                    // 根据命名设置选择文件命名方式
                    switch(settings.filenameMode) {
                        case 'sequence-order':
                            // 按提交顺序命名
                            newFileName = `${fileSequenceCounter}${fileExtension}`;
                            fileSequenceCounter++;
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
                            const baseTimeFileName = `converted_${formattedDate}`;
                            if (!fileNameCounter.has(baseTimeFileName)) {
                                fileNameCounter.set(baseTimeFileName, 0);
                            }
                            const timeCount = fileNameCounter.get(baseTimeFileName);
                            fileNameCounter.set(baseTimeFileName, timeCount + 1);
                            
                            // 同一分钟内的第一个文件不加计数器，之后的文件添加计数器
                            if (timeCount === 0) {
                                newFileName = `${baseTimeFileName}${fileExtension}`;
                            } else {
                                newFileName = `${baseTimeFileName}_${timeCount}${fileExtension}`;
                            }
                            break;
                            
                        case 'duplicate-counter':
                        default:
                            // 使用原文件名 + 处理同名文件
                            if (!fileNameCounter.has(fileName)) {
                                fileNameCounter.set(fileName, 0);
                            }
                            const count = fileNameCounter.get(fileName);
                            fileNameCounter.set(fileName, count + 1);
                            
                            if (count === 0) {
                                newFileName = `${fileName}${fileExtension}`;
                            } else {
                                newFileName = `${fileName}_${count}${fileExtension}`;
                            }
                            break;
                    }
                    
                    // 转换为DataURL
                    const dataURL = canvas.toDataURL(mimeType, quality);
                    
                    // 转换为Blob
                    const binary = atob(dataURL.split(',')[1]);
                    const array = [];
                    for (let i = 0; i < binary.length; i++) {
                        array.push(binary.charCodeAt(i));
                    }
                    const blob = new Blob([new Uint8Array(array)], {type: mimeType});
                    
                    // 添加到zip
                    zip.file(newFileName, blob, {binary: true});
                    
                    // 保存转换后的图片信息
                    convertedImages.push({
                        id: index + 1,
                        originalName: file.name,
                        newName: newFileName,
                        size: blob.size,
                        preview: dataURL,
                        blob: blob
                    });
                    
                    // 更新界面
                    updateConversionUI();
                    addLogEntry(`${LanguageManager.getText('fileProcessed')}: ${newFileName}`, 'success-msg');
                    
                    // 创建图片预览
                    createImagePreview(convertedImages[convertedImages.length - 1]);
                    
                } catch (error) {
                    addLogEntry(`${LanguageManager.getText('error')}: ${error.message}`, 'error-msg');
                }
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            addLogEntry(`${LanguageManager.getText('error')}: ${file.name}`, 'error-msg');
        };
        
        reader.readAsDataURL(file);
    }
    
    // 更新转换UI
    function updateConversionUI() {
        convertedFilesEl.textContent = convertedImages.length;
        
        // 计算总大小
        let totalSize = 0;
        convertedImages.forEach(img => {
            totalSize += img.size;
        });
        
        totalSizeEl.textContent = formatSize(totalSize);
        
        // 所有文件处理完成
        if (convertedImages.length === parseInt(totalFilesEl.textContent)) {
            addLogEntry(LanguageManager.getText('allFilesProcessed'), 'success-msg');
        }
        // 始终重置文件输入，允许再次选择相同文件
        fileInput.value = '';
    }
    
    // 创建图片预览
    function createImagePreview(imageData) {
        const imageItem = document.createElement('div');
        imageItem.className = 'converted-image-item';
        
        // 图片预览
        const preview = document.createElement('img');
        preview.className = 'converted-image-preview';
        preview.src = imageData.preview;
        preview.alt = imageData.newName;
        
        // 图片信息
        const infoDiv = document.createElement('div');
        infoDiv.className = 'converted-image-info';
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'converted-image-name';
        nameSpan.textContent = imageData.newName;
        
        const sizeSpan = document.createElement('div');
        sizeSpan.className = 'converted-image-size';
        sizeSpan.textContent = formatSize(imageData.size);
        
        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(sizeSpan);
        
        // 下载按钮
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'converted-image-actions';
        
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
        
        convertedImagesContainer.appendChild(imageItem);
    }
    
    // 下载zip文件
    function downloadZip() {
        downloadBtnText.textContent = LanguageManager.getText('processing');
        downloadBtnDots.style.display = 'inline-flex';
        downloadZipButton.disabled = true;
        
        zip.generateAsync({type: 'blob'})
            .then(function(blob) {
                saveAs(blob, `converted_images_${new Date().getTime()}.zip`);
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
    
    // 初始化设置
    updateModeSelection();
    updateFileInputAcceptType();
});
