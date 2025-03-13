/**
 * 预加载主题脚本
 * 在页面加载过程中尽早应用主题，防止闪烁
 */
(function() {
    try {
        // 简化版的cookie读取函数
        function getCookie(name) {
            const cookieName = name + "=";
            const decodedCookie = decodeURIComponent(document.cookie);
            const cookieArray = decodedCookie.split(';');
            
            for (let i = 0; i < cookieArray.length; i++) {
                let cookie = cookieArray[i];
                while (cookie.charAt(0) === ' ') {
                    cookie = cookie.substring(1);
                }
                if (cookie.indexOf(cookieName) === 0) {
                    return cookie.substring(cookieName.length, cookie.length);
                }
            }
            return null;
        }

        // 添加无过渡效果的类
        document.documentElement.classList.add('no-transition');
        
        const savedTheme = getCookie('web_tools_theme');
        
        if (savedTheme === 'dark') {
            // 直接应用暗色主题到html元素
            document.documentElement.style.colorScheme = 'dark';
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (savedTheme === 'auto') {
            // 检查系统主题
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.style.colorScheme = 'dark';
                document.documentElement.setAttribute('data-theme', 'dark');
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