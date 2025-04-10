/**
 * 缓存管理模块
 * 提供统一的缓存接口和配置
 */
const CacheManager = (function() {
    // 缓存配置
    const CACHE_CONFIG = {
        THEME_SETTINGS: {
            key: 'theme_settings',
            version: '1.2',
            expiry: null, // 永久存储
            description: '主题设置'
        },
        LANGUAGE_SETTINGS: {
            key: 'language_settings',
            version: '1.2',
            expiry: null, // 永久存储
            description: '语言设置'
        },
        TOOL_SETTINGS: {
            key: 'tool_settings',
            version: '1.2',
            expiry: null, // 永久存储
            description: '工具设置'
        }
    };

    /**
     * 获取缓存数据
     * @param {string} cacheType - 缓存类型
     * @returns {Object|null} 缓存数据
     */
    function getCache(cacheType) {
        const config = CACHE_CONFIG[cacheType];
        if (!config) {
            console.error(`未知的缓存类型: ${cacheType}`);
            return null;
        }

        try {
            const cache = localStorage.getItem(config.key);
            if (!cache) return null;

            const { version, timestamp, data } = JSON.parse(cache);
            
            // 检查版本和过期时间
            if (version !== config.version || 
                (config.expiry && Date.now() - timestamp > config.expiry)) {
                return null;
            }

            return data;
        } catch (error) {
            console.error(`读取缓存失败 [${cacheType}]:`, error);
            return null;
        }
    }

    /**
     * 保存数据到缓存
     * @param {string} cacheType - 缓存类型
     * @param {Object} data - 要缓存的数据
     */
    function setCache(cacheType, data) {
        const config = CACHE_CONFIG[cacheType];
        if (!config) {
            console.error(`未知的缓存类型: ${cacheType}`);
            return;
        }

        try {
            const cache = {
                version: config.version,
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(config.key, JSON.stringify(cache));
        } catch (error) {
            console.error(`保存缓存失败 [${cacheType}]:`, error);
        }
    }

    /**
     * 清除指定类型的缓存
     * @param {string} cacheType - 缓存类型
     */
    function clearCache(cacheType) {
        const config = CACHE_CONFIG[cacheType];
        if (!config) {
            console.error(`未知的缓存类型: ${cacheType}`);
            return;
        }

        try {
            localStorage.removeItem(config.key);
        } catch (error) {
            console.error(`清除缓存失败 [${cacheType}]:`, error);
        }
    }

    /**
     * 清除所有缓存
     */
    function clearAllCache() {
        try {
            Object.values(CACHE_CONFIG).forEach(config => {
                localStorage.removeItem(config.key);
            });
        } catch (error) {
            console.error('清除所有缓存失败:', error);
        }
    }

    /**
     * 获取工具设置
     * @param {string} toolId - 工具ID
     * @returns {Object|null} 工具设置
     */
    function getToolSettings(toolId) {
        const allSettings = getCache('TOOL_SETTINGS') || {};
        return allSettings[toolId] || null;
    }

    /**
     * 保存工具设置
     * @param {string} toolId - 工具ID
     * @param {Object} settings - 工具设置
     */
    function setToolSettings(toolId, settings) {
        const allSettings = getCache('TOOL_SETTINGS') || {};
        allSettings[toolId] = settings;
        setCache('TOOL_SETTINGS', allSettings);
    }

    /**
     * 清除工具设置
     * @param {string} toolId - 工具ID
     */
    function clearToolSettings(toolId) {
        const allSettings = getCache('TOOL_SETTINGS') || {};
        delete allSettings[toolId];
        setCache('TOOL_SETTINGS', allSettings);
    }

    // 返回公共API
    return {
        getCache,
        setCache,
        clearCache,
        clearAllCache,
        getToolSettings,
        setToolSettings,
        clearToolSettings
    };
})(); 