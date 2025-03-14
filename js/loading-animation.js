/**
 * 页面加载动画管理
 * 处理页面加载过程中的动画显示、资源加载进度和工具可用性检查
 */
const LoadingManager = (function() {
    // 常量
    const MIN_DISPLAY_TIME = 300; // 最小显示时间（毫秒）
    const RESOURCES_WEIGHT = {
        DOM: 20,
        TRANSLATIONS: 50,
        SCRIPTS: 15,
        STYLES: 15
    };
    const REQUEST_TIMEOUT = 3000; // 请求超时时间（毫秒）
    
    // 状态变量
    let startTime = Date.now();
    let loadingOverlay = null;
    let progressBar = null;
    let loadingMessage = null;
    let resourcesLoaded = {
        DOM: false,
        TRANSLATIONS: false,
        SCRIPTS: false,
        STYLES: false
    };
    let toolAvailabilityCheckPending = false;
    
    /**
     * 找到加载遮罩层并保存引用
     */
    function findLoadingElements() {
        loadingOverlay = document.getElementById('page-loading-overlay');
        if (loadingOverlay) {
            progressBar = loadingOverlay.querySelector('.loading-progress-bar');
            loadingMessage = loadingOverlay.querySelector('.loading-message');
        }
    }
    
    /**
     * 更新加载进度
     */
    function updateProgress() {
        let totalProgress = 0;
        let totalWeight = 0;
        
        // 计算加权进度
        for (const [resource, loaded] of Object.entries(resourcesLoaded)) {
            const weight = RESOURCES_WEIGHT[resource];
            totalWeight += weight;
            if (loaded) {
                totalProgress += weight;
            }
        }
        
        // 计算百分比
        const progressPercent = Math.round((totalProgress / totalWeight) * 100);
        
        // 更新进度条
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }
        
        // 更新加载消息
        if (loadingMessage) {
            if (progressPercent < 30) {
                loadingMessage.textContent = '正在加载资源...';
            } else if (progressPercent < 60) {
                loadingMessage.textContent = '正在处理翻译...';
            } else if (progressPercent < 90) {
                loadingMessage.textContent = '正在检查工具可用性...';
            } else {
                loadingMessage.textContent = '准备就绪!';
            }
        }
        
        // 检查是否所有资源都已加载
        const allLoaded = Object.values(resourcesLoaded).every(loaded => loaded);
        if (allLoaded) {
            // 确保至少显示最小时间
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);
            
            setTimeout(() => {
                hideLoadingOverlay();
            }, remainingTime);
        }
    }
    
    /**
     * 隐藏加载动画
     */
    function hideLoadingOverlay() {
        if (loadingOverlay) {
            // 添加淡出类
            loadingOverlay.classList.add('hidden');
            
            // 移除body加载类
            document.body.classList.remove('loading-active');
            document.body.classList.add('loading-complete');
            
            // 添加内容淡入类
            const fadeElements = document.querySelectorAll('.fade-in-target');
            fadeElements.forEach((el, index) => {
                el.classList.add('fade-in');
                if (index > 0) {
                    el.classList.add(`delay-${Math.min(index, 5)}`);
                }
            });
            
            // 完全移除元素
            setTimeout(() => {
                loadingOverlay.remove();
            }, 500); // 等待过渡动画完成
        }
    }
    
    /**
     * 标记资源为已加载
     * @param {string} resource - 资源类型
     */
    function setResourceLoaded(resource) {
        if (resource in resourcesLoaded) {
            resourcesLoaded[resource] = true;
            updateProgress();
        }
    }
    
    /**
     * 检查URL是否存在（文件是否存在）
     * @param {string} url - 要检查的URL
     * @returns {Promise<boolean>} - 如果URL存在返回true，否则返回false
     */
    function checkUrlExists(url) {
        // 创建一个超时Promise
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(false), REQUEST_TIMEOUT);
        });
        
        // 创建实际的请求Promise
        const fetchPromise = fetch(url, { 
            method: 'HEAD',
            // 确保不使用缓存
            headers: { 'Cache-Control': 'no-cache' },
            cache: 'no-store'
        })
        .then(response => {
            return response.status === 200;
        })
        .catch(() => {
            console.warn(`请求${url}失败，标记为不可用`);
            return false;
        });
        
        // 使用Promise.race，哪个先完成就返回哪个结果
        return Promise.race([fetchPromise, timeoutPromise]);
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
     * 从localStorage直接读取工具可用性缓存
     * 用于在CacheManager未完全初始化时的紧急处理
     * @returns {Object|null} 缓存数据或null
     */
    function getToolAvailabilityDirectly() {
        try {
            const cacheKey = 'tool_availability_cache';
            const cache = localStorage.getItem(cacheKey);
            if (!cache) return null;
            
            const cacheData = JSON.parse(cache);
            const { version, timestamp, data } = cacheData;
            
            // 检查版本和过期时间(24小时)
            const expiry = 24 * 60 * 60 * 1000; // 24小时
            if (version !== '1.0' || (Date.now() - timestamp > expiry)) {
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('直接读取工具可用性缓存失败:', error);
            return null;
        }
    }
    
    /**
     * 检查工具可用性
     * @returns {Promise<void>}
     */
    async function checkToolAvailability() {
        // 防止重复执行
        if (toolAvailabilityCheckPending) return;
        toolAvailabilityCheckPending = true;
        
        console.log('开始检查工具可用性...');
        
        try {
            // 获取所有工具卡片
            const cards = document.querySelectorAll('.tool-card');
            
            // 没有卡片就不需要继续处理
            if (!cards || cards.length === 0) {
                setResourceLoaded('SCRIPTS');
                toolAvailabilityCheckPending = false;
                return;
            }
            
            // 先尝试使用CacheManager获取缓存
            let cachedData = null;
            
            // 确保CacheManager已初始化
            if (window.CacheManager && typeof CacheManager.getCache === 'function') {
                cachedData = CacheManager.getCache('TOOL_AVAILABILITY');
            }
            
            // 如果CacheManager未能获取缓存，尝试直接从localStorage读取
            if (!cachedData) {
                cachedData = getToolAvailabilityDirectly();
            }
            
            if (cachedData) {
                console.log('使用缓存的工具可用性数据:', cachedData);
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
                
                // 标记脚本加载完成
                setResourceLoaded('SCRIPTS');
                toolAvailabilityCheckPending = false;
                return;
            }

            console.log('没有找到工具可用性缓存，进行实时检查');
            
            // 收集所有唯一的工具URL
            const availabilityData = {};
            const uniqueUrls = new Set();
            const urlToCardMap = new Map();
            
            // 收集所有唯一的工具URL和对应的卡片
            cards.forEach(card => {
                const onclickAttr = card.getAttribute('onclick') || '';
                const urlMatch = onclickAttr.match(/window\.location\.href=['"](.*?)['"]/);
                if (urlMatch && urlMatch[1]) {
                    const toolUrl = urlMatch[1];
                    uniqueUrls.add(toolUrl);
                    urlToCardMap.set(toolUrl, card);
                }
            });
            
            console.log(`检查${uniqueUrls.size}个工具URL...`);
            
            // 使用Promise.all并行检查所有URL
            const checkPromises = Array.from(uniqueUrls).map(async (toolUrl) => {
                try {
                    console.log(`开始检查: ${toolUrl}`);
                    const exists = await checkUrlExists(toolUrl);
                    console.log(`检查结果: ${toolUrl} ${exists ? '可用' : '不可用'}`);
                    
                    availabilityData[toolUrl] = exists;
                    
                    // 如果URL不存在，禁用对应的卡片
                    if (!exists && urlToCardMap.has(toolUrl)) {
                        disableToolCard(urlToCardMap.get(toolUrl));
                    }
                    
                    return { toolUrl, exists };
                } catch (error) {
                    console.error(`检查工具可用性出错 ${toolUrl}:`, error);
                    availabilityData[toolUrl] = false;
                    
                    // 发生错误时也禁用卡片
                    if (urlToCardMap.has(toolUrl)) {
                        disableToolCard(urlToCardMap.get(toolUrl));
                    }
                    
                    return { toolUrl, exists: false };
                }
            });
            
            // 等待所有检查完成
            await Promise.all(checkPromises);
            
            console.log('所有URL检查完成，保存结果');
            
            // 保存检查结果到localStorage(直接保存和通过CacheManager保存)
            try {
                const cacheKey = 'tool_availability_cache';
                const cache = {
                    version: '1.0',
                    timestamp: Date.now(),
                    data: availabilityData
                };
                localStorage.setItem(cacheKey, JSON.stringify(cache));
                
                // 如果CacheManager可用，也通过它保存一份
                if (window.CacheManager && typeof CacheManager.setCache === 'function') {
                    CacheManager.setCache('TOOL_AVAILABILITY', availabilityData);
                }
            } catch (error) {
                console.error('保存工具可用性缓存失败:', error);
            }
        } catch (err) {
            console.error('工具可用性检查过程中发生错误:', err);
        } finally {
            // 确保在任何情况下都标记为加载完成并重置状态
            setResourceLoaded('SCRIPTS');
            toolAvailabilityCheckPending = false;
            console.log('工具可用性检查完成');
        }
    }
    
    /**
     * 初始化加载动画
     */
    function init() {
        // 查找已存在的加载动画元素
        findLoadingElements();
        
        // 如果没有找到加载动画元素，说明已经被移除或未正确设置
        if (!loadingOverlay) {
            console.warn('加载动画元素不存在，无法初始化加载管理器');
            return;
        }
        
        // 标记body为加载状态
        document.body.classList.add('loading-active');
        
        // DOM加载完成
        window.addEventListener('DOMContentLoaded', () => {
            setResourceLoaded('DOM');
        });
        
        // 页面完全加载
        window.addEventListener('load', () => {
            setResourceLoaded('STYLES');
        });
        
        // 监听翻译加载完成事件
        document.addEventListener('translationsLoaded', () => {
            setResourceLoaded('TRANSLATIONS');
            
            // 在翻译加载完成后初始化工具可用性检查
            setTimeout(() => {
                checkToolAvailability();
            }, 100); // 添加小延迟确保CacheManager已初始化
        });
    }
    
    /**
     * 手动标记翻译已加载
     */
    function translationsLoaded() {
        setResourceLoaded('TRANSLATIONS');
    }
    
    /**
     * 手动标记脚本已加载
     */
    function scriptsLoaded() {
        setResourceLoaded('SCRIPTS');
    }
    
    // 当DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', init);
    
    // 返回公共API
    return {
        translationsLoaded,
        scriptsLoaded,
        checkToolAvailability
    };
})(); 