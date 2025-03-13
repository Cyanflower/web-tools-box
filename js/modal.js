/**
 * 模态框功能
 * 用于显示markdown内容的模态框
 */
document.addEventListener('DOMContentLoaded', function() {
    // 创建模态框元素
    const modalTemplate = `
        <div id="markdownModal" class="modal">
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <div class="modal-title" id="modalTitle"></div>
                <div class="modal-body markdown-content" id="modalBody"></div>
            </div>
        </div>
    `;
    
    // 将模态框添加到body
    document.body.insertAdjacentHTML('beforeend', modalTemplate);
    
    // 获取模态框元素
    const modal = document.getElementById('markdownModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeBtn = document.querySelector('.modal-close');
    
    // 绑定关闭按钮事件
    closeBtn.addEventListener('click', closeModal);
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // 按ESC键关闭模态框
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
    
    // 设置页脚链接点击事件
    const aboutLink = document.getElementById('aboutLink');
    const licenseLink = document.getElementById('licenseLink');
    
    if (aboutLink) {
        aboutLink.addEventListener('click', function(e) {
            e.preventDefault();
            showMarkdownModal('readme', LanguageManager.getText('about'));
        });
    }
    
    if (licenseLink) {
        licenseLink.addEventListener('click', function(e) {
            e.preventDefault();
            showMarkdownModal('license', LanguageManager.getText('license'));
        });
    }
    
    /**
     * 显示markdown内容的模态框
     * @param {string} markdownBaseName - markdown文件的基础名称（不含扩展名和语言后缀）
     * @param {string} title - 模态框标题
     */
    function showMarkdownModal(markdownBaseName, title) {
        modalTitle.textContent = title;
        modalBody.innerHTML = '<div class="loading-message">' + LanguageManager.getText('loading') + '...</div>';
        
        // 显示模态框
        modal.classList.add('show');
        
        // 禁止背景滚动
        document.body.style.overflow = 'hidden';
        
        // 构建绝对路径
        let basePath = '';
        
        // 获取base标签中的href值
        const baseTag = document.querySelector('base');
        if (baseTag && baseTag.getAttribute('href')) {
            basePath = baseTag.getAttribute('href');
            
            // 确保路径格式正确
            if (!basePath.startsWith('/')) {
                basePath = '/' + basePath;
            }
            if (!basePath.endsWith('/')) {
                basePath += '/';
            }
            
            // 移除多余的斜杠
            basePath = basePath.replace(/\/+/g, '/');
        }
        
        // 获取原始URL，移除协议、主机和端口部分的路径
        const origin = window.location.origin;
        
        // 获取当前语言
        const currentLang = LanguageManager.getCurrentLanguage();
        
        // 根据当前语言决定加载哪个文件
        let markdownFile = '';
        if (currentLang === 'en') {
            markdownFile = markdownBaseName + '.en.md';
        } else {
            markdownFile = markdownBaseName + '.md';
        }
        
        // 构建完整的URL绝对路径
        const fullPath = origin + basePath + markdownFile;
        console.log('Loading markdown from:', fullPath);
        
        // 获取markdown文件内容
        fetch(fullPath)
            .then(response => {
                if (!response.ok) {
                    // 如果找不到语言特定的文件，尝试使用默认文件
                    if (currentLang === 'en') {
                        console.log('Fallback to default markdown file:', origin + basePath + markdownBaseName + '.md');
                        return fetch(origin + basePath + markdownBaseName + '.md')
                            .then(fallbackResponse => {
                                if (!fallbackResponse.ok) {
                                    throw new Error('网络响应异常');
                                }
                                return fallbackResponse.text();
                            });
                    }
                    throw new Error('网络响应异常');
                }
                return response.text();
            })
            .then(markdownText => {
                // 使用marked解析markdown
                try {
                    if (typeof marked === 'undefined') {
                        throw new Error('marked is not defined');
                    }
                    
                    // 尝试直接使用新版API
                    modalBody.innerHTML = marked.parse(markdownText);
                } catch (error) {
                    modalBody.innerHTML = '<div class="error-message">' + 
                        LanguageManager.getText('loadError') + ': ' + error.message + '</div>';
                    console.error('Marked解析错误:', error);
                }
            })
            .catch(error => {
                modalBody.innerHTML = '<div class="error-message">' + 
                    LanguageManager.getText('loadError') + ': ' + error.message + '</div>';
            });
    }
    
    /**
     * 关闭模态框
     */
    function closeModal() {
        modal.classList.remove('show');
        
        // 延迟清空内容，等待动画结束
        setTimeout(() => {
            modalBody.innerHTML = '';
            // 恢复背景滚动
            document.body.style.overflow = '';
        }, 300);
    }
    
    // 公开API
    window.ModalManager = {
        showMarkdownModal: showMarkdownModal,
        closeModal: closeModal
    };
}); 