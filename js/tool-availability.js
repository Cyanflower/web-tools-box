/**
 * 工具可用性检测模块
 * 检测工具页面是否存在并禁用不可用的工具按钮
 */
const ToolAvailabilityManager = (function() {
    /**
     * 检查URL是否存在（文件是否存在）
     * @param {string} url - 要检查的URL
     * @returns {Promise<boolean>} - 如果URL存在返回true，否则返回false
     */
    function checkUrlExists(url) {
        return fetch(url, { method: 'HEAD' })
            .then(response => {
                return response.status === 200;
            })
            .catch(() => {
                return false;
            });
    }
    
    /**
     * 禁用工具卡片
     * @param {Element} cardElement - 工具卡片DOM元素
     */
    function disableToolCard(cardElement) {
        // 移除点击事件
        cardElement.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        
        // 添加禁用样式类
        cardElement.classList.add('tool-card-disabled');
        
        // 修改描述元素，显示"开发中"/"Coming Soon"
        const descElement = cardElement.querySelector('p');
        if (descElement) {
            // 将描述元素的data-i18n属性更改为toolInDevelopment
            descElement.setAttribute('data-i18n', 'toolInDevelopment');
            
            // 立即应用当前语言的翻译
            if (window.LanguageManager && typeof LanguageManager.getText === 'function') {
                const currentText = LanguageManager.getText('toolInDevelopment');
                descElement.textContent = currentText;
            }
            
            // 添加状态标签样式
            descElement.classList.add('tool-status-label');
        }
        
        // 隐藏卡片操作覆盖层
        const cardOverlay = cardElement.querySelector('.card-overlay');
        if (cardOverlay) {
            cardOverlay.style.display = 'none';
        }
    }
    
    /**
     * 初始化工具可用性检测
     */
    async function init() {
        // 获取所有工具卡片
        const cards = document.querySelectorAll('.tool-card');
        
        // 尝试从缓存获取数据
        const cachedData = CacheManager.getCache('TOOL_AVAILABILITY');
        if (cachedData) {
            // 使用缓存数据更新UI
            cards.forEach(card => {
                const onclickAttr = card.getAttribute('onclick') || '';
                const urlMatch = onclickAttr.match(/window\.location\.href=['"](.*?)['"]/);
                if (urlMatch && urlMatch[1]) {
                    const toolUrl = urlMatch[1];
                    if (!cachedData[toolUrl]) {
                        disableToolCard(card);
                    }
                }
            });
            return;
        }

        // 如果没有缓存，进行实时检查
        const availabilityData = {};
        
        // 处理每个工具卡片
        for (const card of cards) {
            const onclickAttr = card.getAttribute('onclick') || '';
            const urlMatch = onclickAttr.match(/window\.location\.href=['"](.*?)['"]/);
            
            if (urlMatch && urlMatch[1]) {
                const toolUrl = urlMatch[1];
                
                try {
                    // 检查工具页面是否存在
                    const exists = await checkUrlExists(toolUrl);
                    availabilityData[toolUrl] = exists;
                    
                    if (!exists) {
                        disableToolCard(card);
                    }
                } catch (error) {
                    console.error(`Error checking tool availability for ${toolUrl}:`, error);
                    availabilityData[toolUrl] = false;
                    disableToolCard(card);
                }
            }
        }

        // 保存检查结果到缓存
        CacheManager.setCache('TOOL_AVAILABILITY', availabilityData);
    }
    
    // 当文档和翻译加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        // 等待翻译加载完成
        document.addEventListener('translationsLoaded', init);
        
        // 如果翻译已经加载完成，直接初始化
        if (document.readyState === 'complete' && 
            window.LanguageManager && 
            LanguageManager.isInitialized()) {
            init();
        }
    });
    
    // 公开API
    return {
        init: init
    };
})(); 