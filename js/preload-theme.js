/**
 * 预加载主题脚本
 * 在页面加载过程中尽早应用主题，防止闪烁
 */
(function() {
    try {
        // 简化版的缓存读取函数
        function getThemeSettings() {
            try {
                const cacheKey = 'theme_settings';
                const cache = localStorage.getItem(cacheKey);
                if (!cache) return null;
                
                const { version, data } = JSON.parse(cache);
                return data;
            } catch (error) {
                console.error('读取主题设置失败:', error);
                return null;
            }
        }

        // 添加无过渡效果的类
        document.documentElement.classList.add('no-transition');
        
        const settings = getThemeSettings();
        
        if (settings) {
            if (settings.theme === 'dark') {
                // 直接应用暗色主题到html元素
                document.documentElement.style.colorScheme = 'dark';
                document.documentElement.setAttribute('data-theme', 'dark');
            } else if (settings.theme === 'auto') {
                // 检查系统主题
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    document.documentElement.style.colorScheme = 'dark';
                    document.documentElement.setAttribute('data-theme', 'dark');
                }
            }
        }
        
        // 页面加载后移除无过渡效果类
        window.addEventListener('load', function() {
            setTimeout(function() {
                document.documentElement.classList.remove('no-transition');
            }, 100);
        });
    } catch (e) {
        // 出错不处理，让常规流程接管
        console.error('预先应用主题失败：', e);
    }
})(); 