/**
 * 页面加载动画管理
 * 处理页面加载过程中的动画显示和资源加载进度
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
    
    // 缓存键名
    const CACHE_TYPE = 'LOADING_ANIMATION_SHOWN';
    
    /**
     * 检查是否应该显示加载动画
     * 只有在用户首次访问网站时显示
     * @returns {boolean} 是否应该显示
     */
    function shouldShowLoadingAnimation() {
        // 判断是否已经显示过加载动画
        const hasShown = !!CacheManager.getCache(CACHE_TYPE);
        
        // 如果没有显示过，则标记为已显示并返回true
        if (!hasShown) {
            CacheManager.setCache(CACHE_TYPE, true);
            return true;
        }
        
        return false;
    }
    
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
     * 立即隐藏加载动画（无动画）
     */
    function immediateHideLoadingOverlay() {
        if (loadingOverlay) {
            loadingOverlay.remove();
            document.body.classList.remove('loading-active');
            document.body.classList.add('loading-complete');
            
            // 添加内容淡入类，但不需要动画
            const fadeElements = document.querySelectorAll('.fade-in-target');
            fadeElements.forEach(el => {
                el.style.opacity = 1;
                el.style.transform = 'translateY(0)';
            });
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
     * 初始化加载动画
     */
    function init() {
        // 检查是否应该显示加载动画
        if (!shouldShowLoadingAnimation()) {
            // 如果不需要显示，立即隐藏加载遮罩
            findLoadingElements();
            immediateHideLoadingOverlay();
            return;
        }
        
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
        
        // 监听自定义事件
        document.addEventListener('translationsLoaded', () => {
            setResourceLoaded('TRANSLATIONS');
            // 在翻译加载完成后初始化工具可用性检查
            if (window.ToolAvailabilityManager) {
                ToolAvailabilityManager.init().then(() => {
                    setResourceLoaded('SCRIPTS');
                });
            } else {
                setResourceLoaded('SCRIPTS');
            }
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
    
    /**
     * 清除加载动画显示状态
     * 用于测试或重置用户体验
     */
    function clearSessionFlag() {
        CacheManager.clearCache(CACHE_TYPE);
    }
    
    // 当DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', init);
    
    // 返回公共API
    return {
        translationsLoaded,
        scriptsLoaded,
        clearSessionFlag
    };
})(); 