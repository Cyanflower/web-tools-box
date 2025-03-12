/**
 * 主题管理器
 * 处理亮色/暗色主题切换、自动主题检测和用户偏好保存
 */
const ThemeManager = {
    // 主题类型常量
    THEME_LIGHT: 'light',
    THEME_DARK: 'dark',
    THEME_AUTO: 'auto',
    
    // cookie 名称常量
    COOKIE_THEME: 'web_tools_theme',
    
    // DOM 元素引用
    elements: {
        themeButton: null,
        themeMenu: null,
        themeSwitch: null,
        autoThemeSwitch: null,
        body: null,
        html: null,
        themeSwitchLabel: null
    },
    
    // 媒体查询匹配器
    prefersDarkScheme: null,
    
    /**
     * 初始化主题管理器
     */
    init: function() {
        // 获取DOM元素
        this.elements.themeButton = document.getElementById('theme-button');
        this.elements.themeMenu = document.querySelector('.theme-menu');
        this.elements.themeSwitch = document.getElementById('theme-switch');
        this.elements.autoThemeSwitch = document.getElementById('auto-theme');
        this.elements.body = document.body;
        this.elements.html = document.documentElement;
        this.elements.themeSwitchLabel = this.elements.themeSwitch.closest('.switch');
        
        // 创建媒体查询监听器
        this.prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        
        // 初始化事件监听器
        this.setupEventListeners();
        
        // 应用初始主题
        this.applyInitialTheme();
    },
    
    /**
     * 设置所有事件监听器
     */
    setupEventListeners: function() {
        // 主题按钮点击事件
        this.elements.themeButton.addEventListener('click', () => {
            this.elements.themeMenu.classList.toggle('active');
        });
        
        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!this.elements.themeButton.contains(e.target) && 
                !this.elements.themeMenu.contains(e.target)) {
                this.elements.themeMenu.classList.remove('active');
            }
        });
        
        // 主题切换开关事件
        this.elements.themeSwitch.addEventListener('change', () => {
            const theme = this.elements.themeSwitch.checked ? this.THEME_DARK : this.THEME_LIGHT;
            this.setTheme(theme);
            
            // 手动切换主题时，关闭自动模式
            this.elements.autoThemeSwitch.checked = false;
            CookieManager.setCookie(this.COOKIE_THEME, theme);
        });
        
        // 自动主题开关事件
        this.elements.autoThemeSwitch.addEventListener('change', () => {
            if (this.elements.autoThemeSwitch.checked) {
                // 启用自动模式
                CookieManager.setCookie(this.COOKIE_THEME, this.THEME_AUTO);
                this.applyAutoTheme();
                
                // 禁用主题切换开关
                this.disableThemeSwitch();
            } else {
                // 禁用自动模式时，使用当前主题状态
                const theme = this.elements.themeSwitch.checked ? this.THEME_DARK : this.THEME_LIGHT;
                CookieManager.setCookie(this.COOKIE_THEME, theme);
                
                // 启用主题切换开关
                this.enableThemeSwitch();
            }
        });
        
        // 监听系统主题变化
        this.prefersDarkScheme.addEventListener('change', (e) => {
            // 只在自动模式下响应系统主题变化
            if (CookieManager.getCookie(this.COOKIE_THEME) === this.THEME_AUTO) {
                this.applyAutoTheme();
            }
        });
    },
    
    /**
     * 应用初始主题
     */
    applyInitialTheme: function() {
        // 在切换主题之前，添加一个无过渡效果的类，避免页面加载时的闪烁
        this.elements.body.classList.add('no-transition');
        
        const savedTheme = CookieManager.getCookie(this.COOKIE_THEME);
        
        if (savedTheme === this.THEME_DARK) {
            // 暗色主题
            this.setTheme(this.THEME_DARK);
            this.elements.themeSwitch.checked = true;
            this.elements.autoThemeSwitch.checked = false;
            this.enableThemeSwitch();
        } else if (savedTheme === this.THEME_LIGHT) {
            // 亮色主题
            this.setTheme(this.THEME_LIGHT);
            this.elements.themeSwitch.checked = false;
            this.elements.autoThemeSwitch.checked = false;
            this.enableThemeSwitch();
        } else if (savedTheme === this.THEME_AUTO) {
            // 自动主题
            this.elements.autoThemeSwitch.checked = true;
            this.applyAutoTheme();
            this.disableThemeSwitch();
        } else {
            // 默认：没有保存的设置，使用自动模式
            this.applyAutoTheme();
            CookieManager.setCookie(this.COOKIE_THEME, this.THEME_AUTO);
            this.elements.autoThemeSwitch.checked = true;
            this.disableThemeSwitch();
        }
        
        // 移除无过渡效果的类
        setTimeout(() => {
            this.elements.body.classList.remove('no-transition');
        }, 100);
    },
    
    /**
     * 应用自动主题（根据系统设置）
     */
    applyAutoTheme: function() {
        if (this.prefersDarkScheme.matches) {
            // 系统使用暗色主题
            this.setTheme(this.THEME_DARK);
            this.elements.themeSwitch.checked = true;
        } else {
            // 系统使用亮色主题或无法检测
            this.setTheme(this.THEME_LIGHT);
            this.elements.themeSwitch.checked = false;
        }
    },
    
    /**
     * 设置主题
     * @param {string} theme - 主题类型 (light/dark)
     */
    setTheme: function(theme) {
        if (theme === this.THEME_DARK) {
            // 在html元素上设置主题属性
            this.elements.html.setAttribute('data-theme', 'dark');
            // 添加color-scheme属性以提高系统级交互体验（如滚动条）
            this.elements.html.style.colorScheme = 'dark';
        } else {
            // 移除主题属性
            this.elements.html.removeAttribute('data-theme');
            // 恢复默认color-scheme
            this.elements.html.style.colorScheme = 'light';
        }
    },

    /**
     * 禁用主题切换开关
     */
    disableThemeSwitch: function() {
        this.elements.themeSwitch.disabled = true;
        this.elements.themeSwitchLabel.classList.add('disabled');
    },

    /**
     * 启用主题切换开关
     */
    enableThemeSwitch: function() {
        this.elements.themeSwitch.disabled = false;
        this.elements.themeSwitchLabel.classList.remove('disabled');
    }
};

// 当DOM加载完成后初始化主题管理器
document.addEventListener('DOMContentLoaded', function() {
    ThemeManager.init();
});

// 提供一个函数用于提前应用主题，防止页面切换时闪烁
function applyThemeEarly() {
    try {
        // 读取cookie获取保存的主题
        const getCookieValue = function(name) {
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
        };

        const savedTheme = getCookieValue('web_tools_theme');
        
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
        // 对于亮色主题或无主题设置，使用默认值（不需要特殊处理）
    } catch (e) {
        // 出错时不做任何处理，让常规初始化流程接管
        console.error('提前应用主题时出错：', e);
    }
}

// 导出提前应用主题函数
window.applyThemeEarly = applyThemeEarly;
