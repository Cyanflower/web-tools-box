/**
 * Markdown图片提取器功能实现
 * 处理Markdown文件中的Base64图片提取与压缩包生成
 */
document.addEventListener('DOMContentLoaded', function() {
    // 页面元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const resultArea = document.getElementById('resultArea');
    const totalImagesEl = document.getElementById('totalImages');
    const extractedImagesEl = document.getElementById('extractedImages');
    const totalSizeEl = document.getElementById('totalSize');
    const logArea = document.getElementById('logArea');
    const downloadZipButton = document.getElementById('downloadZipButton');
    const downloadBtnText = document.getElementById('downloadBtnText');
    const downloadBtnDots = document.getElementById('downloadBtnDots');
    
    // 全局变量
    let extractedImages = [];
    let zip = null;
    
    // 初始化上传区域事件
    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 文件选择事件
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
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
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt')) {
                processFile(file);
            } else {
                addLogEntry('请上传 .md, .markdown 或 .txt 文件', 'error-msg');
            }
        }
    });
    
    // 下载按钮事件
    downloadZipButton.addEventListener('click', function() {
        if (zip) {
            downloadZip();
        }
    });
    
    // 处理上传的文件
    function processFile(file) {
        // 重置
        resultArea.style.display = 'none';
        extractedImages = [];
        logArea.innerHTML = '';
        zip = new JSZip();
        
        addLogEntry(`开始处理文件: ${file.name}`);
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            extractImagesFromMarkdown(content, file.name);
        };
        
        reader.onerror = function() {
            addLogEntry('读取文件时出错', 'error-msg');
        };
        
        reader.readAsText(file);
    }
    
    // 从Markdown内容中提取图片
    function extractImagesFromMarkdown(content, fileName) {
        // 查找所有base64图片
        const pattern = /\[image\d+\]:\s*<data:image\/([a-z]+);base64,([^>]+)>/g;
        let matches;
        let count = 0;
        
        // 创建一个images文件夹在zip中
        const imagesFolder = zip.folder('images');
        
        // 使用循环查找所有匹配项
        while ((matches = pattern.exec(content)) !== null) {
            count++;
            const imageType = matches[1]; // 图片类型 (jpeg, png等)
            const base64Data = matches[2]; // base64数据
            
            try {
                // 将base64转换为二进制数据
                const binaryData = atob(base64Data);
                const array = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                    array[i] = binaryData.charCodeAt(i);
                }
                
                // 创建一个blob对象
                const blob = new Blob([array], {type: `image/${imageType}`});
                
                // 添加到zip
                imagesFolder.file(`image_${count}.jpg`, blob, {binary: true});
                
                // 保存提取的图片信息
                extractedImages.push({
                    id: count,
                    type: imageType,
                    size: formatSize(blob.size)
                });
                
                addLogEntry(`已提取图片 ${count}: image_${count}.jpg (${formatSize(blob.size)})`);
            } catch (error) {
                addLogEntry(`处理图片 ${count} 时出错: ${error.message}`, 'error-msg');
            }
        }
        
        if (count === 0) {
            addLogEntry('未在文件中找到base64编码的图片', 'error-msg');
            return;
        }
        
        // 更新界面
        totalImagesEl.textContent = count;
        extractedImagesEl.textContent = extractedImages.length;
        
        // 生成替换后的markdown
        generateUpdatedMarkdown(content, fileName);
        
        // 显示结果区域
        resultArea.style.display = 'block';
        
        // 生成zip并更新大小
        zip.generateAsync({type: 'blob'})
            .then(function(blob) {
                zipSizeEl.textContent = formatSize(blob.size);
            });
    }
    
    // 生成替换后的markdown文件并添加到zip
    function generateUpdatedMarkdown(content, fileName) {
        let updatedContent = content;
        
        // 替换所有base64图片引用
        extractedImages.forEach(img => {
            const pattern = new RegExp(`\\[image${img.id}\\]:\\s*<data:image\\/[a-z]+;base64,[^>]+>`, 'g');
            updatedContent = updatedContent.replace(pattern, `[image${img.id}]: images/image_${img.id}.jpg`);
        });
        
        // 获取文件名（不含扩展名）
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        
        // 添加到zip
        zip.file(`${baseName}_updated.md`, updatedContent);
        
        addLogEntry(`已生成更新后的Markdown文件: ${baseName}_updated.md`);
    }
    
    // 下载zip文件
    function downloadZip() {
        downloadBtnText.textContent = LanguageManager.getText('processing');
        downloadBtnDots.style.display = 'inline-flex';
        downloadZipButton.disabled = true;
        
        zip.generateAsync({type: 'blob'})
            .then(function(blob) {
                saveAs(blob, 'markdown_images.zip');
                downloadBtnText.textContent = LanguageManager.getText('downloadZip');
                downloadBtnDots.style.display = 'none';
                downloadZipButton.disabled = false;
                addLogEntry(LanguageManager.getText('zipDownloadSuccess'), 'success-msg');
            })
            .catch(function(error) {
                downloadBtnText.textContent = LanguageManager.getText('downloadZip');
                downloadBtnDots.style.display = 'none';
                downloadZipButton.disabled = false;
                addLogEntry(LanguageManager.getText('zipDownloadError') + ': ' + error.message, 'error-msg');
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
}); 