/**
 * Main application initialization
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme manager
    ThemeManager.init();
    
    // Initialize language manager
    LanguageManager.init();
    
    // 直接添加主题按钮点击事件处理
    const themeButton = document.getElementById('theme-button');
    const themeMenu = document.querySelector('.theme-menu');
    
    if (themeButton && themeMenu) {
        themeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            themeMenu.classList.toggle('active');
            console.log('Theme button clicked, menu toggled');
        });
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', function() {
            if (themeMenu.classList.contains('active')) {
                themeMenu.classList.remove('active');
            }
        });
        
        // 防止点击菜单内部时关闭菜单
        themeMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // 清理缓存按钮事件
    const clearCacheLink = document.getElementById('clearCacheLink');
    if (clearCacheLink) {
        clearCacheLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm(LanguageManager.getText('confirmClearCache') || '确定要清除所有缓存吗？这将重置所有设置。')) {
                // 清除所有缓存（包括会话缓存）
                CacheManager.clearAllCache(true);
                
                // 显示成功消息
                alert(LanguageManager.getText('cacheCleared') || '缓存已清除，页面将刷新。');
                
                // 刷新页面以应用更改
                window.location.reload();
            }
        });
    }
    
    // 添加淡入动画类
    document.querySelectorAll('header, .hero-section, .tools-grid, footer').forEach(el => {
        el.classList.add('fade-in-target');
    });
    
    // 标记脚本已加载
    if (window.LoadingManager) {
        window.LoadingManager.scriptsLoaded();
    }
    
    // 触发自定义事件
    document.dispatchEvent(new CustomEvent('scriptsLoaded'));
    
    console.log('Web Tools application initialized');
});