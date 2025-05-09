/**
 * 语言管理模块
 * 处理网站的多语言功能，支持中英文切换和自动语言检测
 */
const LanguageManager = (function() {
    // 语言常量
    const LANG_EN = 'en';
    const LANG_ZH = 'zh';
    
    // 缓存的翻译数据
    let translations = {
        en: {},
        zh: {}
    };
    
    // 获取当前页面的路径信息
    const pathParts = window.location.pathname.split('/');
    const currentPath = pathParts[pathParts.length - 2] || '';
    const currentTool = pathParts[pathParts.length - 3] || '';
    
    // 当前语言
    let currentLanguage = LANG_EN;
    
    // 是否已经初始化
    let initialized = false;
    
    /**
     * 加载JSON文件
     * @param {string} url - JSON文件的URL
     * @returns {Promise<Object>} - 解析后的JSON对象
     */
    function loadJSON(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error(`Error loading translations from ${url}:`, error);
                return { en: {}, zh: {} }; // 返回空对象以防止进一步错误
            });
    }
    
    /**
     * 加载所有需要的翻译
     * @returns {Promise<void>}
     */
    async function loadTranslations() {
        try {
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
            
            // 构建完整的URL路径
            const commonJsonPath = origin + basePath + 'js/i18n/common.json';
            const toolsJsonPath = origin + basePath + 'js/i18n/tools.json';
            
            console.log('Loading common translations from:', commonJsonPath);
            console.log('Loading tools translations from:', toolsJsonPath);
            
            // 加载通用翻译
            const commonTranslations = await loadJSON(commonJsonPath);
            
            // 合并通用翻译
            translations.en = { ...translations.en, ...commonTranslations.en };
            translations.zh = { ...translations.zh, ...commonTranslations.zh };
            
            // 加载工具列表翻译
            const toolsTranslations = await loadJSON(toolsJsonPath);
            
            // 合并工具列表翻译
            translations.en = { ...translations.en, ...toolsTranslations.en };
            translations.zh = { ...translations.zh, ...toolsTranslations.zh };
            
            // 如果当前在工具页面，加载特定工具的翻译
            if (currentTool && currentPath) {
                const toolJsonPath = origin + basePath + `tools/${currentPath}/translations.json`;
                console.log('Loading tool-specific translations from:', toolJsonPath);
                
                const toolTranslations = await loadJSON(toolJsonPath);
                
                // 合并工具特定翻译
                translations.en = { ...translations.en, ...toolTranslations.en };
                translations.zh = { ...translations.zh, ...toolTranslations.zh };
            }
            
            // 通知翻译加载完成
            if (window.LoadingManager) {
                window.LoadingManager.translationsLoaded();
            }
            
            // 触发自定义事件
            document.dispatchEvent(new CustomEvent('translationsLoaded'));
            
        } catch (error) {
            console.error('Error loading translations:', error);
            
            // 即使出错也通知加载完成
            if (window.LoadingManager) {
                window.LoadingManager.translationsLoaded();
            }
        }
    }
    
    /**
     * 设置语言指示器文本和图标
     * @param {string} lang - 语言代码 ('en' 或 'zh')
     */
    function updateLanguageIndicator(lang) {
        const indicator = document.querySelector('.lang-indicator');
        const langButton = document.getElementById('language-button');
        
        if (indicator) {
            indicator.textContent = lang.toUpperCase();
        }
        
        if (langButton) {
            // 移除现有类
            langButton.classList.remove('lang-en', 'lang-zh');
            // 添加新类
            langButton.classList.add(`lang-${lang}`);
            
            // 更新图标（如果需要）
            const icon = langButton.querySelector('i');
            if (icon) {
                if (lang === LANG_EN) {
                    icon.className = 'fas fa-language';
                } else {
                    icon.className = 'fas fa-language';
                }
            }
        }
    }
    
    /**
     * 应用翻译到当前页面
     * @param {string} lang - 语言代码 ('en' 或 'zh')
     */
    function applyTranslations(lang) {
        if (!translations[lang]) {
            console.error(`Translations for language "${lang}" not found.`);
            return;
        }
        
        // 应用翻译到所有带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
            } else {
                console.warn(`Translation for key "${key}" not found in language "${lang}".`);
            }
        });
        
        // 应用翻译到所有带有 data-i18n-placeholder 属性的元素
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (translations[lang][key]) {
                element.placeholder = translations[lang][key];
            } else {
                console.warn(`Translation for placeholder key "${key}" not found in language "${lang}".`);
            }
        });
        
        // 更新 HTML 语言属性
        document.documentElement.lang = lang;
        
        // 更新语言指示器
        updateLanguageIndicator(lang);
        
        // 更新当前语言
        currentLanguage = lang;
    }
    
    /**
     * 获取语言设置
     * @returns {string|null} 语言设置
     */
    function getLanguageSettings() {
        return CacheManager.getCache('LANGUAGE_SETTINGS');
    }
    
    /**
     * 保存语言设置
     * @param {string} lang - 语言代码
     */
    function saveLanguageSettings(lang) {
        CacheManager.setCache('LANGUAGE_SETTINGS', lang);
    }
    
    /**
     * 设置语言并保存设置
     * @param {string} lang - 语言代码 ('en' 或 'zh')
     */
    function setLanguage(lang) {
        if (lang !== LANG_EN && lang !== LANG_ZH) {
            lang = LANG_EN; // 默认为英文
        }
        
        // 保存语言设置
        saveLanguageSettings(lang);
        
        // 应用翻译
        applyTranslations(lang);
        
        // 触发语言切换事件
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }
    
    /**
     * 切换语言
     */
    function toggleLanguage() {
        const newLang = currentLanguage === LANG_EN ? LANG_ZH : LANG_EN;
        setLanguage(newLang);
    }
    
    /**
     * 根据设置或浏览器首选项应用语言
     */
    function applyLanguageFromSettings() {
        try {
            // 从缓存获取保存的语言设置
            const savedLang = getLanguageSettings();
            
            if (savedLang && (savedLang === LANG_EN || savedLang === LANG_ZH)) {
                applyTranslations(savedLang);
            } else {
                // 获取浏览器语言
                const browserLang = navigator.language || navigator.userLanguage;
                const isZhBrowser = browserLang.toLowerCase().startsWith('zh');
                
                // 应用相应的语言
                const detectedLang = isZhBrowser ? LANG_ZH : LANG_EN;
                applyTranslations(detectedLang);
                
                // 保存自动检测到的语言设置
                saveLanguageSettings(detectedLang);
            }
        } catch (error) {
            console.error('Error applying language settings:', error);
            // 应用默认语言
            applyTranslations(LANG_EN);
        }
    }
    
    /**
     * 设置事件监听器
     */
    function setupEventListeners() {
        const langButton = document.getElementById('language-button');
        if (langButton) {
            langButton.addEventListener('click', toggleLanguage);
        }
    }
    
    /**
     * 获取翻译文本
     * @param {string} key - 翻译键
     * @param {Object} params - 替换参数
     * @returns {string} 翻译后的文本
     */
    function getText(key, params = {}) {
        if (!translations[currentLanguage] || !translations[currentLanguage][key]) {
            console.warn(`Translation for key "${key}" not found in language "${currentLanguage}".`);
            return key;
        }
        
        let text = translations[currentLanguage][key];
        Object.entries(params).forEach(([key, value]) => {
            text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        
        return text;
    }
    
    /**
     * 获取当前语言
     * @returns {string} 当前语言代码
     */
    function getCurrentLanguage() {
        return currentLanguage;
    }
    
    /**
     * 检查是否已初始化
     * @returns {boolean} 是否已初始化
     */
    function isInitialized() {
        return initialized;
    }
    
    /**
     * 初始化语言管理器
     */
    async function init() {
        if (initialized) return;
        
        // 设置事件监听器
        setupEventListeners();
        
        // 加载翻译
        await loadTranslations();
        
        // 应用语言设置
        applyLanguageFromSettings();
        
        // 标记为已初始化
        initialized = true;
    }
    
    // 当DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', init);
    
    // 返回公共API
    return {
        init,
        getText,
        getCurrentLanguage,
        isInitialized
    };
})();