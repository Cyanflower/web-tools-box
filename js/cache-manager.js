/**
 * 缓存管理模块
 * 提供统一的缓存接口和配置
 */
const CacheManager = (function() {
    // 缓存配置
    const CACHE_CONFIG = {
        TOOL_AVAILABILITY: {
            key: 'tool_availability_cache',
            version: '1.0',
            expiry: 24 * 60 * 60 * 1000, // 24小时
            description: '工具可用性检查结果'
        },
        THEME_SETTINGS: {
            key: 'theme_settings',
            version: '1.0',
            expiry: null, // 永久存储
            description: '主题设置'
        },
        LANGUAGE_SETTINGS: {
            key: 'language_settings',
            version: '1.0',
            expiry: null, // 永久存储
            description: '语言设置'
        },
        TOOL_SETTINGS: {
            key: 'tool_settings',
            version: '1.0',
            expiry: null, // 永久存储
            description: '工具设置'
        },
        // 会话级别缓存配置
        LOADING_ANIMATION_SHOWN: {
            key: 'loading_animation_shown',
            version: '1.0',
            expiry: null, // 会话级别，不需要过期时间
            description: '加载动画是否已显示',
            session: true // 标记为会话级别缓存
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
            // 根据配置选择存储类型
            const storage = config.session ? sessionStorage : localStorage;
            const cache = storage.getItem(config.key);
            if (!cache) return null;

            // 会话级别缓存直接返回
            if (config.session) {
                return JSON.parse(cache);
            }

            // 持久缓存需要检查版本和过期时间
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
            // 根据配置选择存储类型
            const storage = config.session ? sessionStorage : localStorage;
            
            // 会话级别缓存直接保存
            if (config.session) {
                storage.setItem(config.key, JSON.stringify(data));
                return;
            }
            
            // 持久缓存需要添加版本和时间戳
            const cache = {
                version: config.version,
                timestamp: Date.now(),
                data: data
            };
            storage.setItem(config.key, JSON.stringify(cache));
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
            // 根据配置选择存储类型
            const storage = config.session ? sessionStorage : localStorage;
            storage.removeItem(config.key);
        } catch (error) {
            console.error(`清除缓存失败 [${cacheType}]:`, error);
        }
    }

    /**
     * 清除所有缓存
     * @param {boolean} includeSession - 是否包括会话缓存
     */
    function clearAllCache(includeSession = true) {
        try {
            Object.values(CACHE_CONFIG).forEach(config => {
                if (includeSession || !config.session) {
                    const storage = config.session ? sessionStorage : localStorage;
                    storage.removeItem(config.key);
                }
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