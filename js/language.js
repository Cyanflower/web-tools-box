/**
 * Language management utility
 * Handles language switching and translations
 */
const LanguageManager = {
    // Language constants
    LANG_COOKIE: 'web_tools_language',
    LANG_EN: 'en',
    LANG_ZH: 'zh',
    
    // Translation dictionary
    translations: {
        en: {
            theme: 'Theme',
            auto: 'Auto',
            tool1: 'Markdown Image Extractor',
            tool1Desc: 'Extract base64 images from markdown files',
            tool2: 'Tool 2',
            tool2Desc: 'Tool 2 Description',
            tool3: 'Tool 3',
            tool3Desc: 'Tool 3 Description',
            tool4: 'Tool 4',
            tool4Desc: 'Tool 4 Description',
            tool5: 'Tool 5',
            tool5Desc: 'Tool 5 Description',
            tool6: 'Tool 6',
            tool6Desc: 'Tool 6 Description',
            heroTitle: 'Simple & Efficient Online Tools',
            heroDesc: 'Providing convenient online tools for your daily work and life, making complex tasks simple.',
            useNow: 'Use Now',
            footerDesc: 'Boost your efficiency with convenient online tools',
            about: 'About Us',
            contact: 'Contact',
            feedback: 'Feedback',
            // Markdown Image Extractor translations
            mdImageExtractor: 'Markdown Image Extractor',
            mdImageExtractorDesc: 'Extract base64 images from markdown files',
            mdImageExtractorLongDesc: 'This tool extracts base64 encoded images from Markdown files, converts them to JPG format, and packages them into a ZIP file for download. Perfect for handling Markdown notes or documents with embedded images.',
            uploadMdFile: 'Upload Markdown File',
            dragOrClick: 'Drag file here or click to select',
            selectFile: 'Select File',
            extractionResults: 'Extraction Results',
            totalImages: 'Total Images',
            extractedImages: 'Extracted Images',
            zipSize: 'ZIP Size',
            downloadZip: 'Download Image Package',
            backToHome: 'Back to Home'
        },
        zh: {
            theme: '主题',
            auto: '自动',
            tool1: 'Markdown图片提取器',
            tool1Desc: '提取Markdown文件中的Base64图片',
            tool2: '工具 2',
            tool2Desc: '工具 2 描述',
            tool3: '工具 3',
            tool3Desc: '工具 3 描述',
            tool4: '工具 4',
            tool4Desc: '工具 4 描述',
            tool5: '工具 5',
            tool5Desc: '工具 5 描述',
            tool6: '工具 6',
            tool6Desc: '工具 6 描述',
            heroTitle: '简单高效的在线工具集合',
            heroDesc: '为您的日常工作和生活提供便捷的在线工具，让复杂任务变得简单。',
            useNow: '立即使用',
            footerDesc: '使用便捷的在线工具提高效率',
            about: '关于我们',
            contact: '联系我们',
            feedback: '意见反馈',
            // Markdown图片提取器翻译
            mdImageExtractor: 'Markdown图片提取器',
            mdImageExtractorDesc: '提取Markdown文件中的Base64图片',
            mdImageExtractorLongDesc: '这个工具可以从Markdown文件中提取Base64编码的图片，将它们转换为JPG图片文件，并打包为ZIP压缩包供下载。非常适合处理包含内嵌图片的Markdown笔记或文档。',
            uploadMdFile: '上传Markdown文件',
            dragOrClick: '拖放文件到这里或点击选择文件',
            selectFile: '选择文件',
            extractionResults: '处理结果',
            totalImages: '总图片数',
            extractedImages: '已提取图片',
            zipSize: '压缩包大小',
            downloadZip: '下载图片压缩包',
            backToHome: '返回首页'
        }
    },
    
    /**
     * Initialize the language system
     */
    init: function() {
        this.setupEventListeners();
        this.applyLanguageFromSettings();
    },
    
    /**
     * Set up event listeners for language button
     */
    setupEventListeners: function() {
        const langButton = document.getElementById('language-button');
        if (langButton) {
            langButton.addEventListener('click', () => {
                const currentLang = this.getCurrentLanguage();
                const newLang = currentLang === this.LANG_EN ? this.LANG_ZH : this.LANG_EN;
                this.setLanguage(newLang);
            });
        }
    },
    
    /**
     * Apply language based on settings or browser preference
     */
    applyLanguageFromSettings: function() {
        const savedLang = CookieManager.getCookie(this.LANG_COOKIE);
        if (savedLang) {
            this.applyLanguage(savedLang);
        } else {
            // Check browser language preference
            const browserLang = navigator.language || navigator.userLanguage;
            const isZhBrowser = browserLang.toLowerCase().startsWith('zh');
            this.applyLanguage(isZhBrowser ? this.LANG_ZH : this.LANG_EN);
        }
    },
    
    /**
     * Set language and save preference
     * @param {string} lang - Language code ('en' or 'zh')
     */
    setLanguage: function(lang) {
        this.applyLanguage(lang);
        CookieManager.setCookie(this.LANG_COOKIE, lang);
    },
    
    /**
     * Apply language to the UI
     * @param {string} lang - Language code ('en' or 'zh')
     */
    applyLanguage: function(lang) {
        if (lang !== this.LANG_EN && lang !== this.LANG_ZH) {
            lang = this.LANG_EN; // Default to English for unsupported languages
        }
        
        // Apply translations to all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (this.translations[lang] && this.translations[lang][key]) {
                element.textContent = this.translations[lang][key];
            }
        });
        
        // Update page language attribute
        document.documentElement.lang = lang;
    },
    
    /**
     * Get current language
     * @returns {string} - Current language code ('en' or 'zh')
     */
    getCurrentLanguage: function() {
        return document.documentElement.lang === this.LANG_ZH ? 
            this.LANG_ZH : this.LANG_EN;
    }
};

// 当DOM加载完成后初始化语言管理器
document.addEventListener('DOMContentLoaded', function() {
    LanguageManager.init();
});