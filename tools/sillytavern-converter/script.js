/**
 * SillyTavern预设转换工具
 * 用于在Markdown格式和JSON格式之间转换SillyTavern预设
 */

// 工具ID，用于缓存管理
const TOOL_ID = 'sillytavern-converter';

// 全局变量
let mdSourceFilename = '';
let jsonSourceFilename = '';
let regexRules = []; // 存储正则表达式规则

/**
 * 保存当前设置到缓存
 */
function saveSettingsToCache() {
    // 构建设置对象
    const settings = {
        regexRules: regexRules,
        prefixMode: document.getElementById('prefixMode')?.value || 'name'
    };
    
    // 保存到缓存
    if (typeof CacheManager !== 'undefined') {
        CacheManager.setToolSettings(TOOL_ID, settings);
    }
}

/**
 * 从缓存加载设置
 */
function loadSettingsFromCache() {
    if (typeof CacheManager === 'undefined') return;
    
    // 从缓存加载设置
    const settings = CacheManager.getToolSettings(TOOL_ID);
    if (!settings) return;
    
    // 加载正则规则
    if (settings.regexRules && Array.isArray(settings.regexRules)) {
        regexRules = settings.regexRules;
        renderRegexRules();
    }
    
    // 加载前缀模式
    if (settings.prefixMode) {
        const prefixModeSelect = document.getElementById('prefixMode');
        if (prefixModeSelect) {
            prefixModeSelect.value = settings.prefixMode;
        }
    }
    
    // 加载预设配置项到表单
    loadPresetConfigFromCache();
}

/**
 * 显示选定的标签页
 * @param {string} tabId - 标签页ID
 */
function showTab(tabId) {
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 取消激活所有标签
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 激活选定的标签和内容
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab[onclick="showTab('${tabId}')"]`).classList.add('active');
    
    // 根据选项卡显示相应的使用指南
    const presetGuide = document.querySelector('.description-toggle.preset-guide');
    const logGuide = document.querySelector('.description-toggle.log-guide');
    
    if (tabId === 'jsonl-to-txt') {
        // 当选择JSONL到TXT选项卡时，显示LOG相关使用指南，隐藏预设相关使用指南
        presetGuide.style.display = 'none';
        logGuide.style.display = 'flex';
    } else {
        // 当选择其他选项卡时，显示预设相关使用指南，隐藏LOG相关使用指南
        presetGuide.style.display = 'flex';
        logGuide.style.display = 'none';
    }
}

/**
 * 从Markdown转换到SillyTavern预设JSON的工具
 * @param {string} mdContent - MD文件内容
 * @returns {string} - 生成的JSON字符串
 */
function convertMdToSillyTavernPreset(mdContent) {
    // 首先移除折叠格式中的@@@标记
    mdContent = convertFromRegionFolding(mdContent);
    
    // 基础预设模板
    const presetTemplate = {
        chat_completion_source: "claude",
        openai_model: "gpt-4o-latest",
        claude_model: "claude-3-7-sonnet-20250219",
        windowai_model: "",
        openrouter_model: "OR_Website",
        openrouter_use_fallback: false,
        openrouter_group_models: false,
        openrouter_sort_models: "alphabetically",
        openrouter_providers: [],
        openrouter_allow_fallbacks: true,
        openrouter_middleout: "on",
        ai21_model: "jamba-1.5-large",
        mistralai_model: "mistral-medium",
        cohere_model: "command-r",
        perplexity_model: "llama-3-70b-instruct",
        groq_model: "llama3-70b-8192",
        zerooneai_model: "yi-large",
        blockentropy_model: "be-70b-base-llama3.1",
        custom_model: "claude-3-7-sonnet-20250219",
        custom_prompt_post_processing: "strict",
        google_model: "gemini-1.5-pro-exp-0801",
        temperature: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 0.95,
        top_k: 0,
        top_a: 1,
        min_p: 0,
        repetition_penalty: 1,
        openai_max_context: 128000,
        openai_max_tokens: 8192,
        wrap_in_quotes: false,
        names_behavior: -1,
        send_if_empty: "",
        jailbreak_system: false,
        impersonation_prompt: "[Write your next reply from the point of view of {{user}}, using the preceding context so far as references.]",
        new_chat_prompt: "",
        new_group_chat_prompt: "[Start a new group chat. Group members: {{group}}]",
        new_example_chat_prompt: "[Chat Example Start Point]",
        continue_nudge_prompt: "[Continue the story. Do not include ANY parts of the original message. Use capitalization and punctuation as if your reply is a part of the original message: {{lastChatMessage}}]",
        bias_preset_selected: "Default (none)",
        max_context_unlocked: true,
        wi_format: "{0}\n",
        scenario_format: "[Circumstances: {{scenario}}]",
        personality_format: "[{{char}}'s personality: {{personality}}]",
        group_nudge_prompt: "[Write the next reply only as {{char}}.]",
        stream_openai: true,
        prompts: [],
        prompt_order: [
            {
                character_id: 100001,
                order: []
            }
        ],
        api_url_scale: "",
        show_external_models: true,
        assistant_prefill: "",
        assistant_impersonation: "I will pause other tasks and generate a 50-word logical plot from the perspective of {{user}}:\n",
        claude_use_sysprompt: true,
        use_makersuite_sysprompt: true,
        use_alt_scale: false,
        squash_system_messages: true,
        image_inlining: false,
        inline_image_quality: "low",
        bypass_status_check: false,
        continue_prefill: true,
        continue_postfix: "\n",
        function_calling: false,
        show_thoughts: true,
        reasoning_effort: "low",
        seed: -1,
        n: 1
    };
    
    // 特殊标识符集，需要特殊处理的identifier
    const specialIdentifiers = [
        "main", "nsfw", "dialogueExamples", "chatHistory", "worldInfoAfter", 
        "worldInfoBefore", "charDescription", "charPersonality", "scenario", 
        "personaDescription", "enhanceDefinitions", "jailbreak"
    ];
    
    // 定义marker类型标识符集合
    const markerIdentifiers = [
        "dialogueExamples", "chatHistory", "worldInfoAfter", "worldInfoBefore", 
        "charDescription", "charPersonality", "scenario", "personaDescription"
    ];
    
    // 定义系统提示词但不是marker的标识符
    const systemNonMarkerIdentifiers = [
        "main", "enhanceDefinitions", "jailbreak", "nsfw"
    ];
    
    // 用于跟踪已使用的特殊标识符
    const usedSpecialIdentifiers = new Set();
    
    // 标准化换行符
    mdContent = mdContent.replace(/\r\n/g, '\n');
    
    // 分割文本，查找以§§§开头的行作为分隔符
    const sections = mdContent.split(/(?=^§§§\s)/m);
    
    // 排除空部分
    const validSections = sections.filter(section => section.trim().length > 0);
    
    // 处理提示词部分
    validSections.forEach((section, index) => {
        const lines = section.split('\n');
        const headerLine = lines[0].trim();
        
        // 跳过不符合格式的部分
        if (!headerLine.startsWith('§§§')) {
            return;
        }
        
        // 解析头部信息: §§§ 名称|角色|STR(可选) (禁用)(可选)
        let headerContent = headerLine.substring(3).trim();
        
        // 检查是否有禁用标记，同时支持有空格和无空格的格式
        const isEnabled = !headerContent.includes('(禁用)');
        if (!isEnabled) {
            // 同时处理有空格和无空格的情况
            headerContent = headerContent.replace(/\s*\(禁用\)/, '').trim();
        }
        
        const headerParts = headerContent.split('|').map(part => part.trim());
        
        const name = headerParts[0] || `提示词${index + 1}`;
        const role = headerParts[1] || "system";
        const str = headerParts[2] || "";
        
        // 设置内容 (跳过头部行)
        const contentLines = lines.slice(1);
        // 原始连接的内容
        const rawJoinedContent = contentLines.join('\n');

        // 处理内容：调整结尾换行符，保留开头空白
        let finalContent = rawJoinedContent; // <<< 不再使用 trimStart()，保留开头空白
        // 如果移除 @@@ 后内容以换行符结尾，则移除末尾的一个换行符
        if (finalContent.endsWith('\n')) {
            finalContent = finalContent.slice(0, -1);
        }
        // 如果 finalContent 为空字符串，则保持为空
        
        // 初始化基本参数
        const prompt = {
            name: name,
            role: role,
            content: finalContent, // <<< 使用调整后的 finalContent
            injection_position: 0,
            injection_depth: 4,
            forbid_overrides: false
        };
        
        // 处理标识符
        if (str) {
            if (/^\d+$/.test(str)) {  // 如果STR是数字
                // 纯数字标识符的处理，仅影响injection_position和injection_depth
                // identifier仍然使用索引
                const numPrompt = {
                    identifier: `${index + 1}`,
                    name: name,
                    role: role,
                    content: finalContent, // <<< 确保这里也使用 finalContent
                    injection_position: 1,
                    injection_depth: parseInt(str),
                    forbid_overrides: false,
                    marker: false,
                    system_prompt: false
                };
                // 用新对象替换原来的prompt
                Object.keys(prompt).forEach(key => delete prompt[key]);
                Object.assign(prompt, numPrompt);
            } else {  // 如果STR是字符串
                // 检查是否为特殊标识符，以及是否已被使用
                if (specialIdentifiers.includes(str) && !usedSpecialIdentifiers.has(str)) {
                    // 标记此特殊标识符已被使用
                    usedSpecialIdentifiers.add(str);
                    
                    prompt.identifier = str;
                    
                    // 处理特殊标识符
                    if (markerIdentifiers.includes(str)) {
                        // 纯marker类型，只保留4个基本属性
                        // 创建一个新的对象，只包含必要的4个属性
                        const markerPrompt = {
                            identifier: str,
                            name: name,
                            system_prompt: true,
                            marker: true
                        };
                        // 用新对象替换原来的prompt
                        Object.keys(prompt).forEach(key => delete prompt[key]);
                        Object.assign(prompt, markerPrompt);
                    } else if (systemNonMarkerIdentifiers.includes(str)) {
                        // 系统提示词但不是marker
                        prompt.marker = false;
                        prompt.system_prompt = true;
                        
                        // 特殊处理main的forbid_overrides
                        if (str === "main") {
                            prompt.forbid_overrides = true;
                        }
                    } else {
                        // 其他标识符（如UUID或其他自定义标识符）
                        prompt.marker = false;
                        prompt.system_prompt = false;
                    }
                } else {
                    // 如果是已使用过的特殊标识符或非特殊标识符，使用数字标识符
                    const defaultPrompt = {
                        identifier: `${index + 1}`,
                        name: name,
                        role: role,
                        content: finalContent,
                        injection_position: 0,
                        injection_depth: 4,
                        forbid_overrides: false,
                        marker: false,
                        system_prompt: false
                    };
                    // 用新对象替换原来的prompt
                    Object.keys(prompt).forEach(key => delete prompt[key]);
                    Object.assign(prompt, defaultPrompt);
                }
            }
        } else {
            // 没有STR，使用索引作为标识符
            const defaultPrompt = {
                identifier: `${index + 1}`,
                name: name,
                role: role,
                content: finalContent, // <<< 确保这里也使用 finalContent
                injection_position: 0,
                injection_depth: 4,
                forbid_overrides: false,
                marker: false,
                system_prompt: false
            };
            // 用新对象替换原来的prompt
            Object.keys(prompt).forEach(key => delete prompt[key]);
            Object.assign(prompt, defaultPrompt);
        }
        
        presetTemplate.prompts.push(prompt);
        
        // 添加到顺序
        presetTemplate.prompt_order[0].order.push({
            identifier: prompt.identifier,
            enabled: isEnabled
        });
    });
    
    return JSON.stringify(presetTemplate, null, 2);
}

/**
 * 从SillyTavern预设JSON转换为Markdown格式
 * @param {string} jsonContent - JSON内容
 * @returns {string} - 生成的Markdown字符串
 */
function convertJsonToMarkdownFormat(jsonContent) {
    try {
        const jsonData = JSON.parse(jsonContent);
        let mdContent = '';
        
        // 检查必要的字段
        if (!jsonData.prompts || !jsonData.prompt_order || !jsonData.prompt_order[0] || !jsonData.prompt_order[0].order) {
            throw new Error('JSON格式无效：缺少必要的字段');
        }
        
        // 获取排序信息和启用状态
        const orderMap = {};
        jsonData.prompt_order[0].order.forEach((item, index) => {
            orderMap[item.identifier] = {
                index: index,
                enabled: item.enabled !== false // 默认为true
            };
        });
        
        // 特殊标识符集
        const specialIdentifiers = [
            "main", "nsfw", "dialogueExamples", "chatHistory", "worldInfoAfter", 
            "worldInfoBefore", "charDescription", "charPersonality", "scenario", 
            "personaDescription", "enhanceDefinitions", "jailbreak"
        ];
        
        // 定义marker类型标识符集合
        const markerIdentifiers = [
            "dialogueExamples", "chatHistory", "worldInfoAfter", "worldInfoBefore", 
            "charDescription", "charPersonality", "scenario", "personaDescription"
        ];
        
        // 按照order排序prompts
        const sortedPrompts = [...jsonData.prompts].sort((a, b) => {
            const orderA = orderMap[a.identifier]?.index ?? 999;
            const orderB = orderMap[b.identifier]?.index ?? 999;
            return orderA - orderB;
        });
        
        // 转换每个prompt
        sortedPrompts.forEach((prompt, index) => {
            // 获取启用状态
            const isEnabled = orderMap[prompt.identifier]?.enabled ?? true;
            
            // 确定角色
            let role = "undefined";
            if (!markerIdentifiers.includes(prompt.identifier) && prompt.role) {
                role = prompt.role;
            }
            
            // 构建头行 (使用§§§)
            let header = `§§§ ${prompt.name}|${role}|`;
            
            // 处理第三个参数
            if (specialIdentifiers.includes(prompt.identifier)) {
                // 如果是特殊标识符，直接添加
                header += prompt.identifier;
            } else if (prompt.injection_position === 1 && typeof prompt.injection_depth === 'number') {
                // 如果有自定义注入深度，添加深度值
                header += prompt.injection_depth;
            }
            
            // 禁用状态作为单独的标记添加到行末
            if (!isEnabled) {
                header += '(禁用)';
            }
            
            // 添加到文本内容，确保在每个提示词之间只有一个换行
            if (index > 0) {
                mdContent += '\n';
            }
            
            // 对于marker类型，不添加content
            if (markerIdentifiers.includes(prompt.identifier)) {
                mdContent += header + '\n';
            } else {
                // 获取内容并确保保留结尾的换行符
                let content = prompt.content || '';
                
                // 添加到内容中
                mdContent += header + '\n' + content;
            }
        });
        
        return mdContent;
    } catch (error) {
        console.error('转换失败:', error);
        return '转换失败: ' + error.message;
    }
}

/**
 * 从JSON中提取核心配置项并保存到缓存
 * @param {Object} jsonObj - 解析后的JSON对象
 */
function savePresetConfigToCache(jsonObj) {
    // 核心配置项列表
    const coreConfigKeys = [
        'chat_completion_source', 'custom_prompt_post_processing', 
        'temperature', 'frequency_penalty', 'presence_penalty', 
        'top_p', 'top_k', 'top_a', 'min_p', 'repetition_penalty', 
        'openai_max_context', 'openai_max_tokens', 'wrap_in_quotes', 
        'names_behavior', 'send_if_empty', 'impersonation_prompt', 
        'new_chat_prompt', 'new_group_chat_prompt', 'new_example_chat_prompt', 
        'continue_nudge_prompt', 'max_context_unlocked', 'wi_format', 
        'scenario_format', 'personality_format', 'group_nudge_prompt', 
        'stream_openai', 'show_external_models', 'assistant_prefill', 
        'assistant_impersonation', 'claude_use_sysprompt', 'use_makersuite_sysprompt', 
        'use_alt_scale', 'squash_system_messages', 'image_inlining', 
        'inline_image_quality', 'bypass_status_check', 'continue_prefill', 
        'continue_postfix', 'function_calling', 'show_thoughts', 'reasoning_effort'
    ];
    
    // 提取核心配置项
    const coreConfig = {};
    coreConfigKeys.forEach(key => {
        if (key in jsonObj) {
            coreConfig[key] = jsonObj[key];
        }
    });
    
    // 保存到缓存
    if (typeof CacheManager !== 'undefined') {
        const settings = CacheManager.getToolSettings(TOOL_ID) || {};
        settings.presetConfig = coreConfig;
        CacheManager.setToolSettings(TOOL_ID, settings);
    }
}

/**
 * 从缓存加载核心配置项到表单
 */
function loadPresetConfigFromCache() {
    if (typeof CacheManager === 'undefined') return;
    
    // 从缓存加载设置
    const settings = CacheManager.getToolSettings(TOOL_ID);
    if (!settings || !settings.presetConfig) return;
    
    const config = settings.presetConfig;
    
    // 将配置应用到表单
    Object.keys(config).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = config[key];
            } else if (element.type === 'select-one') {
                element.value = config[key];
            } else {
                element.value = config[key];
            }
        }
    });
}

/**
 * 从表单中获取核心配置参数
 * @returns {Object} - 配置参数对象
 */
function getPresetConfigFromForm() {
    const config = {};
    
    // 从表单中获取所有输入值
    // 文本输入和选择框
    document.querySelectorAll('#presetConfigContent input[type="text"], #presetConfigContent input[type="number"], #presetConfigContent select, #presetConfigContent textarea').forEach(input => {
        if (input.id) {
            // 数字字段需要转换为数字
            if (input.type === 'number') {
                config[input.id] = parseFloat(input.value);
            } else {
                config[input.id] = input.value;
            }
        }
    });
    
    // 复选框
    document.querySelectorAll('#presetConfigContent input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.id) {
            config[checkbox.id] = checkbox.checked;
        }
    });
    
    return config;
}

/**
 * MD转JSON功能
 */
function convertMdToJson() {
    const inputArea = document.getElementById('inputAreaMd');
    const resultArea = document.getElementById('resultAreaJson');
    
    const mdContent = inputArea.value;
    if (!mdContent.trim()) {
        alert(LanguageManager.getText('noMdContent'));
        return;
    }
    
    // 获取表单中的核心配置参数
    const formConfig = getPresetConfigFromForm();
    
    // 转换MD到JSON
    let jsonResult = convertMdToSillyTavernPreset(mdContent);
    
    try {
        // 将表单配置应用到转换结果
        const jsonObj = JSON.parse(jsonResult);
        Object.keys(formConfig).forEach(key => {
            jsonObj[key] = formConfig[key];
        });
        jsonResult = JSON.stringify(jsonObj, null, 4);
    } catch (e) {
        console.error('应用预设配置失败:', e);
        // 继续使用原始转换结果
    }
    
    resultArea.value = jsonResult;
}

/**
 * JSON转MD功能
 */
function convertJsonToMd() {
    const inputArea = document.getElementById('inputAreaJson');
    const resultArea = document.getElementById('resultAreaMd');
    
    const jsonContent = inputArea.value;
    if (!jsonContent.trim()) {
        alert(LanguageManager.getText('noJsonContent'));
        return;
    }
    
    try {
        // 保存核心配置到缓存
        const jsonObj = JSON.parse(jsonContent);
        savePresetConfigToCache(jsonObj);
        
        // 立即加载配置到UI
        loadPresetConfigFromCache();
    } catch (e) {
        console.error('保存预设配置失败:', e);
        // 继续执行转换，不中断流程
    }
    
    let mdResult = convertJsonToMarkdownFormat(jsonContent);
    
    // 检查是否需要转换为折叠格式
    const useFolding = document.getElementById('useFoldingFormat').checked;
    if (useFolding) {
        mdResult = convertToRegionFolding(mdResult);
    }
    
    resultArea.value = mdResult;
}

/**
 * 复制到剪贴板
 * @param {string} elementId - 要复制的元素ID
 */
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    alert(LanguageManager.getText('copied'));
}

/**
 * 保存为文件
 * @param {string} elementId - 内容所在元素的ID
 * @param {string} fileType - 文件类型 ('json' 或 'md' 或 'txt')
 */
function saveToFile(elementId, fileType) {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('找不到元素:', elementId);
            return;
        }
        
        const content = element.value;
        
        if (!content || !content.trim()) {
            const noContentText = LanguageManager.getText('noContent');
            alert(noContentText);
            return;
        }
        
        // 使用源文件名作为基础（如果有的话）
        let defaultName;
        if (fileType === 'json' && mdSourceFilename) {
            defaultName = mdSourceFilename + '.json';
        } else if (fileType === 'md' && jsonSourceFilename) {
            defaultName = jsonSourceFilename + '.md';
        } else if (fileType === 'txt') {
            const jsonlFilenameEl = document.getElementById('jsonlFilename');
            if (jsonlFilenameEl && jsonlFilenameEl.textContent) {
                defaultName = jsonlFilenameEl.textContent.replace(/\.[^/.]+$/, "") + '.txt';
            } else {
                defaultName = 'chat_export.txt';
            }
        } else {
            defaultName = fileType === 'json' ? 'silly_tavern_preset.json' : 
                          fileType === 'md' ? 'silly_tavern_preset.md' : 'chat_export.txt';
        }
        
        const promptText = LanguageManager.getText('enterFilename');
        const filename = prompt(promptText, defaultName);
        
        if (filename) {
            const mimeType = fileType === 'json' ? 'application/json' : 
                              fileType === 'md' ? 'text/markdown' : 'text/plain';
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            
            try {
                a.click();
            } catch (e) {
                console.error('点击下载链接时出错:', e);
                // 尝试备用方法
                window.open(url, '_blank');
            }
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    } catch (error) {
        alert('保存文件失败: ' + error.message);
    }
}

/**
 * 将§§§格式转换为@@@折叠格式
 * @param {string} mdContent - 原始MD文件内容（§§§格式）
 * @returns {string} - 转换后的MD文件内容（§§§...@@@格式）
 */
function convertToRegionFolding(mdContent) {
    // 标准化换行符
    mdContent = mdContent.replace(/\r\n/g, '\n');
    
    // 先移除所有可能已存在的@@@标记
    mdContent = convertFromRegionFolding(mdContent);
    
    // 分割文本，查找以§§§开头的行作为分隔符
    const sections = mdContent.split(/(?=^§§§\s)/m);
    
    // 处理每个部分
    const processedSections = sections.map((section, index) => {
        if (section.trim().length === 0) return '';
        
        // 添加@@@结尾标记
        if (section.startsWith('§§§')) {
            // 确保内容末尾有一个换行符，然后添加@@@
            if (section.endsWith('\n')) {
                return section + '@@@';
            } else {
                return section + '\n@@@';
            }
        }
        
        return section;
    });
    
    // 将处理后的部分组合起来，每个部分之间添加一个换行符
    let result = processedSections.filter(s => s.length > 0).join('\n');
    
    return result;
}

/**
 * 将@@@折叠格式转换回§§§格式
 * @param {string} mdContent - 原始MD文件内容（§§§...@@@格式）
 * @returns {string} - 转换后的MD文件内容（§§§格式）
 */
function convertFromRegionFolding(mdContent) {
    // 标准化换行符
    mdContent = mdContent.replace(/\r\n/g, '\n');
    
    // 特殊处理@@@标记
    // 这里的关键点是保留@@@前的所有内容（包括换行符）
    const lines = mdContent.split('\n');
    const resultLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        // 如果这行只有@@@或@@@加一些空格，就跳过这行
        if (/^\s*@@@\s*$/.test(lines[i])) {
            continue;
        }
        
        // 如果这行末尾有@@@标记
        if (lines[i].includes('@@@')) {
            // 移除行末的@@@和前面可能的空格
            const cleanedLine = lines[i].replace(/\s*@@@\s*$/, '');
            if (cleanedLine.trim().length > 0) {
                resultLines.push(cleanedLine);
            }
        } else {
            resultLines.push(lines[i]);
        }
    }
    
    return resultLines.join('\n');
}

/**
 * 切换扩展说明区域的显示/隐藏状态
 * @param {string} type - 指南类型('preset'、'log'或'preset-config')
 */
function toggleExtendedDesc(type) {
    let toggle, content;
    
    if (type === 'log') {
        toggle = document.querySelector('.description-toggle.log-guide');
        content = document.getElementById('logGuideContent');
    } else if (type === 'preset-config') {
        toggle = document.querySelector('.description-toggle[onclick="toggleExtendedDesc(\'preset-config\')"]');
        content = document.getElementById('presetConfigContent');
    } else {
        toggle = document.querySelector('.description-toggle.preset-guide');
        content = document.getElementById('presetGuideContent');
    }
    
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        toggle.classList.remove('active');
    } else {
        content.classList.add('active');
        toggle.classList.add('active');
    }
}

/**
 * 使用安全方法解析正则表达式字符串为RegExp对象
 * @param {string} regexStr - 正则表达式字符串(已经是/pattern/flags格式)
 * @returns {RegExp} - 生成的正则表达式对象
 */
function parseRegex(regexStr) {
    if (!regexStr) return new RegExp('');
    
    // 确保输入是/pattern/flags格式
    regexStr = formatRegex(regexStr);
    
    // 解析/pattern/flags格式
    const regexMatch = /^\/(.*)\/([gimsuyd]*)$/.exec(regexStr);
    
    if (regexMatch) {
        const [, pattern, flags] = regexMatch;
        return new RegExp(pattern, flags);
    } else {
        // 理论上不应该到达这里，因为formatRegex已经处理了格式
        return new RegExp(regexStr, 'gs');
    }
}

/**
 * 格式化正则表达式为统一的/pattern/flags格式
 * @param {string} regexStr - 正则表达式字符串
 * @returns {string} - 格式化后的正则表达式字符串
 */
function formatRegex(regexStr) {
    if (!regexStr) return "";
    
    // 检查是否已经是/pattern/flags格式
    const regexMatch = /^\/(.*)\/([gimsuyd]*)$/.exec(regexStr);
    
    if (regexMatch) {
        // 已经是/pattern/flags格式，直接返回
        return regexStr;
    } else {
        // 纯pattern格式，添加/和/gs标志
        return `/${regexStr}/gs`;
    }
}

/**
 * 从JSONL文件转换为TXT文本对话格式
 * @param {string} jsonlContent - JSONL文件内容
 * @param {string} prefixMode - 前缀模式（'name', 'human-assistant', 'user-model', 'none'）
 * @returns {string} - 生成的TXT对话内容
 */
function convertJsonlToTxtFormat(jsonlContent, prefixMode = 'name') {
    try {
        // 分割成单独的JSON行
        const lines = jsonlContent.split('\n').filter(line => line.trim() !== '');
        let txtContent = '';
        
        // 处理每个JSON对象
        lines.forEach((line, index) => {
            try {
                const jsonObj = JSON.parse(line);
                
                // 提取name和mes字段
                if (jsonObj.mes) {
                    let mesContent = jsonObj.mes;
                    
                    // 应用正则表达式处理
                    if (regexRules.length > 0) {
                        regexRules.forEach(rule => {
                            // 检查是否应该应用此规则
                            const isUser = jsonObj.is_user === true;
                            const shouldApply = 
                                !rule.placement || // 没有placement则应用于所有消息
                                rule.placement.length === 0 || // 空数组也应用于所有消息
                                (isUser && rule.placement.includes(1)) || // 用户消息且规则包含1
                                (!isUser && rule.placement.includes(2)); // 非用户消息且规则包含2
                            
                            if (shouldApply && !rule.disabled) {
                                try {
                                    let regexStr = rule.findRegex;
                                    if (typeof regexStr === 'string') {
                                        const regex = parseRegex(regexStr);
                                        
                                        // 执行替换
                                        mesContent = mesContent.replace(regex, rule.replaceString || '');
                                    }
                                } catch (regexError) {
                                    console.error('正则表达式处理错误:', regexError, rule.findRegex);
                                    // 在控制台显示错误但继续处理下一条规则
                                }
                            }
                        });
                    }
                    
                    // 根据prefixMode确定前缀
                    let prefix = '';
                    const isUser = jsonObj.is_user === true;
                    
                    switch (prefixMode) {
                        case 'name':
                            // 使用角色名称作为前缀（默认模式）
                            prefix = jsonObj.name || (isUser ? 'User' : 'Assistant');
                            break;
                        case 'human-assistant':
                            // 用户消息使用"Human"，其他使用"Assistant"
                            prefix = isUser ? 'Human' : 'Assistant';
                            break;
                        case 'user-model':
                            // 用户消息使用"user"，其他使用"model"
                            prefix = isUser ? 'user' : 'model';
                            break;
                        case 'none':
                            // 无前缀
                            prefix = '';
                            break;
                        default:
                            // 默认使用角色名称
                            prefix = jsonObj.name || (isUser ? 'User' : 'Assistant');
                    }
                    
                    // 格式化为带前缀的消息
                    let formattedLine;
                    if (prefixMode === 'none') {
                        formattedLine = mesContent;
                    } else {
                        formattedLine = `${prefix}: ${mesContent}`;
                    }
                    
                    // 第一个项目前不添加换行符
                    if (index > 0) {
                        txtContent += '\n\n';
                    }
                    
                    txtContent += formattedLine;
                }
            } catch (lineError) {
                console.error('解析JSON行失败:', lineError, line);
                // 继续处理下一行
            }
        });
        
        return txtContent;
    } catch (error) {
        console.error('转换失败:', error);
        return '转换失败: ' + error.message;
    }
}

/**
 * JSONL转TXT功能
 */
function convertJsonlToTxt() {
    const inputArea = document.getElementById('inputAreaJsonl');
    const resultArea = document.getElementById('resultAreaTxt');
    const prefixMode = document.getElementById('prefixMode').value;
    
    const jsonlContent = inputArea.value;
    if (!jsonlContent.trim()) {
        alert(LanguageManager.getText('noJsonlContent'));
        return;
    }
    
    const txtResult = convertJsonlToTxtFormat(jsonlContent, prefixMode);
    resultArea.value = txtResult;
}

/**
 * 添加默认正则表达式规则
 */
function addDefaultRegex() {
    // 清空现有规则
    regexRules = [];
    
    // 添加默认规则
    regexRules.push({
        id: generateUUID(),
        scriptName: "强制移除思维链",
        findRegex: "/(.*?<\\/think(ing)?>(\\n)?)|((.*?)<theatre>(\\n)?)/gsi",
        replaceString: "",
        placement: [],
        disabled: false
    });
    
    regexRules.push({
        id: generateUUID(),
        scriptName: "移除免责声明和标签",
        findRegex: "/(<disclaimer>.*?<\\/disclaimer>)|(<!-- State(.*?)d(.*?) -->(\\n)?)|(<!-- consider: (.*?) -->(\\n)?)|(<!-- sequential characters behaviors deductions: (.*?) -->(\\n)?)|((\\n)?<(\\/)?content>(\\n)?)/gs",
        replaceString: "",
        placement: [],
        disabled: false
    });
    
    regexRules.push({
        id: generateUUID(),
        scriptName: "移除摘要总结",
        findRegex: "/(<details><summary>\\s*(摘要|总结)?<\\/summary>.*?<\\/details>)|(<This_round_events>.*?<\\/This_round_events>)|(<[Aa]bstract>.*?<\\/[Aa]bstract>)|(<tableEdit>.*?<\\/tableEdit>)/gs",
        replaceString: "",
        placement: [],
        disabled: false
    });
    
    regexRules.push({
        id: generateUUID(),
        scriptName: "移除状态栏",
        findRegex: "/<status(blocks?)?>.*?<\\/status(blocks?)?>/gsi",
        replaceString: "",
        placement: [],
        disabled: false
    });
    
    // 更新UI
    renderRegexRules();
    
    // 保存到缓存
    saveSettingsToCache();
}

/**
 * 添加新的正则表达式规则
 */
function addNewRegex() {
    // 获取当前正则数量，用于给新正则命名
    const regexCount = regexRules.length + 1;
    
    // 创建新的正则表达式规则
    const newRule = {
        id: generateUUID(),
        scriptName: `新建正则${regexCount}`,
        findRegex: "",
        replaceString: "",
        placement: [],
        disabled: false
    };
    
    // 添加到规则列表
    regexRules.push(newRule);
    
    // 更新UI
    renderRegexRules();
    
    // 自动滚动到新添加的规则
    setTimeout(() => {
        const regexList = document.getElementById('regexList');
        regexList.scrollTop = regexList.scrollHeight;
    }, 100);
    
    // 保存到缓存
    saveSettingsToCache();
}

/**
 * 渲染正则表达式规则列表
 */
function renderRegexRules() {
    const regexList = document.getElementById('regexList');
    regexList.innerHTML = '';
    
    if (regexRules.length === 0) {
        regexList.innerHTML = '<div class="no-regex">没有正则表达式规则</div>';
        return;
    }
    
    regexRules.forEach((rule, index) => {
        const regexItem = document.createElement('div');
        regexItem.className = 'regex-item';
        regexItem.dataset.id = rule.id;
        
        // 创建标题和移除按钮
        const header = document.createElement('div');
        header.className = 'regex-header';
        
        const name = document.createElement('div');
        name.className = 'regex-name';
        name.textContent = rule.scriptName || `规则 ${index + 1}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-regex-btn';
        removeBtn.textContent = '删除';
        removeBtn.onclick = () => removeRegex(rule.id);
        
        header.appendChild(name);
        header.appendChild(removeBtn);
        
        // 创建字段
        const fields = document.createElement('div');
        fields.className = 'regex-fields';
        
        // 正则字段
        const regexField = document.createElement('div');
        regexField.className = 'regex-field';
        
        const regexLabel = document.createElement('label');
        regexLabel.textContent = '匹配:';
        
        // 创建可编辑的文本域，并显示完整的/pattern/flags格式
        const regexInput = document.createElement('textarea');
        regexInput.className = 'regex-input';
        regexInput.value = formatRegex(rule.findRegex);
        regexInput.placeholder = '例如: /pattern/flags 或直接输入pattern';
        regexInput.onchange = (e) => updateRegexRule(rule.id, 'findRegex', formatRegex(e.target.value));
        
        regexField.appendChild(regexLabel);
        regexField.appendChild(regexInput);
        
        // 替换字段
        const replaceField = document.createElement('div');
        replaceField.className = 'regex-field';
        
        const replaceLabel = document.createElement('label');
        replaceLabel.textContent = '替换为:';
        
        const replaceInput = document.createElement('input');
        replaceInput.type = 'text';
        replaceInput.value = rule.replaceString || '';
        replaceInput.onchange = (e) => updateRegexRule(rule.id, 'replaceString', e.target.value);
        
        replaceField.appendChild(replaceLabel);
        replaceField.appendChild(replaceInput);
        
        // 应用目标
        const targetField = document.createElement('div');
        targetField.className = 'regex-field regex-target';
        
        const targetLabel = document.createElement('label');
        targetLabel.textContent = '应用于:';
        
        const allWrapper = document.createElement('div');
        allWrapper.className = 'checkbox-wrapper';
        
        const allCheckbox = document.createElement('input');
        allCheckbox.type = 'checkbox';
        allCheckbox.id = `all-${rule.id}`;
        allCheckbox.checked = !rule.placement || rule.placement.length === 0;
        allCheckbox.onchange = () => {
            if (allCheckbox.checked) {
                updateRegexRule(rule.id, 'placement', []);
                userCheckbox.checked = false;
                aiCheckbox.checked = false;
            } else if (!userCheckbox.checked && !aiCheckbox.checked) {
                // 如果没有选中任何选项，则默认选中"全部"
                allCheckbox.checked = true;
            }
            renderRegexRules();
        };
        
        const allLabel = document.createElement('label');
        allLabel.htmlFor = `all-${rule.id}`;
        allLabel.textContent = '全部';
        
        allWrapper.appendChild(allCheckbox);
        allWrapper.appendChild(allLabel);
        
        // 用户消息选项
        const userWrapper = document.createElement('div');
        userWrapper.className = 'checkbox-wrapper';
        
        const userCheckbox = document.createElement('input');
        userCheckbox.type = 'checkbox';
        userCheckbox.id = `user-${rule.id}`;
        userCheckbox.checked = rule.placement && rule.placement.includes(1);
        userCheckbox.onchange = () => {
            let placement = rule.placement || [];
            if (userCheckbox.checked) {
                if (!placement.includes(1)) {
                    placement.push(1);
                }
                allCheckbox.checked = false;
            } else {
                placement = placement.filter(p => p !== 1);
            }
            updateRegexRule(rule.id, 'placement', placement);
            renderRegexRules();
        };
        
        const userLabel = document.createElement('label');
        userLabel.htmlFor = `user-${rule.id}`;
        userLabel.textContent = '用户消息';
        
        userWrapper.appendChild(userCheckbox);
        userWrapper.appendChild(userLabel);
        
        // AI消息选项
        const aiWrapper = document.createElement('div');
        aiWrapper.className = 'checkbox-wrapper';
        
        const aiCheckbox = document.createElement('input');
        aiCheckbox.type = 'checkbox';
        aiCheckbox.id = `ai-${rule.id}`;
        aiCheckbox.checked = rule.placement && rule.placement.includes(2);
        aiCheckbox.onchange = () => {
            let placement = rule.placement || [];
            if (aiCheckbox.checked) {
                if (!placement.includes(2)) {
                    placement.push(2);
                }
                allCheckbox.checked = false;
            } else {
                placement = placement.filter(p => p !== 2);
            }
            updateRegexRule(rule.id, 'placement', placement);
            renderRegexRules();
        };
        
        const aiLabel = document.createElement('label');
        aiLabel.htmlFor = `ai-${rule.id}`;
        aiLabel.textContent = 'AI消息';
        
        aiWrapper.appendChild(aiCheckbox);
        aiWrapper.appendChild(aiLabel);
        
        // 启用/禁用选项
        const disabledWrapper = document.createElement('div');
        disabledWrapper.className = 'checkbox-wrapper';
        
        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.id = `enabled-${rule.id}`;
        enabledCheckbox.checked = !rule.disabled;
        enabledCheckbox.onchange = () => {
            updateRegexRule(rule.id, 'disabled', !enabledCheckbox.checked);
        };
        
        const enabledLabel = document.createElement('label');
        enabledLabel.htmlFor = `enabled-${rule.id}`;
        enabledLabel.textContent = '启用';
        
        disabledWrapper.appendChild(enabledCheckbox);
        disabledWrapper.appendChild(enabledLabel);
        
        targetField.appendChild(targetLabel);
        targetField.appendChild(allWrapper);
        targetField.appendChild(userWrapper);
        targetField.appendChild(aiWrapper);
        targetField.appendChild(disabledWrapper);
        
        fields.appendChild(regexField);
        fields.appendChild(replaceField);
        fields.appendChild(targetField);
        
        regexItem.appendChild(header);
        regexItem.appendChild(fields);
        
        regexList.appendChild(regexItem);
    });
}

/**
 * 更新正则表达式规则
 * @param {string} id - 规则ID
 * @param {string} field - 要更新的字段
 * @param {any} value - 新值
 */
function updateRegexRule(id, field, value) {
    const ruleIndex = regexRules.findIndex(rule => rule.id === id);
    if (ruleIndex !== -1) {
        regexRules[ruleIndex][field] = value;
        
        // 保存到缓存
        saveSettingsToCache();
    }
}

/**
 * 移除正则表达式规则
 * @param {string} id - 规则ID
 */
function removeRegex(id) {
    regexRules = regexRules.filter(rule => rule.id !== id);
    renderRegexRules();
    
    // 保存到缓存
    saveSettingsToCache();
}

/**
 * 生成UUID
 * @returns {string} - 生成的UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', function() {
    // 加载设置
    loadSettingsFromCache();
    
    // 设置默认标签页
    const initialTab = window.location.hash.substring(1) || 'json-to-md';
    showTab(initialTab);
    
    // 设置文件输入处理
    setupFileInputs();
});

/**
 * 设置文件输入处理
 */
function setupFileInputs() {
    // MD文件输入处理
    const fileInputMd = document.getElementById('fileInputMd');
    if (fileInputMd) {
        fileInputMd.addEventListener('change', function(e) {
            handleFileInput(e, 'inputAreaMd', file => {
                mdSourceFilename = file.name.replace(/\.[^/.]+$/, "");
                document.getElementById('mdFilename').textContent = file.name;
            }, convertMdToJson); // 自动转换MD到JSON
        });
    }
    
    // JSON文件输入处理
    const fileInputJson = document.getElementById('fileInputJson');
    if (fileInputJson) {
        fileInputJson.addEventListener('change', function(e) {
            handleFileInput(e, 'inputAreaJson', file => {
                jsonSourceFilename = file.name.replace(/\.[^/.]+$/, "");
                document.getElementById('jsonFilename').textContent = file.name;
            }, convertJsonToMd); // 自动转换JSON到MD
        });
    }
    
    // JSONL文件输入处理
    const fileInputJsonl = document.getElementById('fileInputJsonl');
    if (fileInputJsonl) {
        fileInputJsonl.addEventListener('change', function(e) {
            handleFileInput(e, 'inputAreaJsonl', file => {
                document.getElementById('jsonlFilename').textContent = file.name;
            }, convertJsonlToTxt); // 自动转换JSONL到TXT
        });
    }
    
    // 正则表达式文件输入处理
    const fileInputRegex = document.getElementById('fileInputRegex');
    if (fileInputRegex) {
        fileInputRegex.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    
                    // 检查是否是ST风格的正则表达式文件
                    if (Array.isArray(jsonData)) {
                        // 直接使用解析后的数组
                        regexRules = jsonData.map(rule => {
                            // 确保每个规则都有ID
                            return { ...rule, id: rule.id || generateUUID() };
                        });
                    } else if (jsonData.regex && Array.isArray(jsonData.regex)) {
                        // ST regex.json格式
                        regexRules = jsonData.regex.map(rule => {
                            return {
                                id: generateUUID(),
                                scriptName: rule.name || "导入规则",
                                findRegex: rule.find || "",
                                replaceString: rule.replace || "",
                                placement: rule.target ? [rule.target] : [1, 2],
                                disabled: false
                            };
                        });
                    } else if (jsonData.id && jsonData.scriptName && jsonData.findRegex) {
                        // 单个正则规则对象
                        regexRules.push({
                            id: jsonData.id || generateUUID(),
                            scriptName: jsonData.scriptName || "导入规则",
                            findRegex: jsonData.findRegex || "",
                            replaceString: jsonData.replaceString || "",
                            placement: Array.isArray(jsonData.placement) ? jsonData.placement : [],
                            disabled: jsonData.disabled || false
                        });
                    }
                    
                    // 重新渲染规则列表
                    renderRegexRules();
                    
                    // 保存到缓存
                    saveSettingsToCache();
                } catch (error) {
                    console.error('解析正则JSON文件失败:', error);
                    alert('解析正则JSON文件失败: ' + error.message);
                }
            };
            reader.readAsText(file);
        });
    }
}

/**
 * 处理文件输入
 * @param {Event} e - 文件输入事件
 * @param {string} targetAreaId - 目标文本区域ID
 * @param {Function} callback - 成功读取文件后的回调函数
 * @param {Function} [autoConvert] - 自动转换函数，如果提供则在文件加载后自动调用
 */
function handleFileInput(e, targetAreaId, callback, autoConvert) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById(targetAreaId).value = e.target.result;
        if (callback) callback(file);
        // 自动执行转换
        if (autoConvert && typeof autoConvert === 'function') {
            autoConvert();
        }
    };
    reader.readAsText(file);
}

// 添加前缀模式变更事件监听
document.getElementById('prefixMode').addEventListener('change', function() {
    // 保存到缓存
    saveSettingsToCache();
});

// 初始化多语言占位符
document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translationElement = document.querySelector(`[data-i18n="${key}"]`);
    if (translationElement) {
        element.placeholder = translationElement.textContent;
    }
});

// 语言变化时更新占位符
document.addEventListener('languageChanged', function() {
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translationElement = document.querySelector(`[data-i18n="${key}"]`);
        if (translationElement) {
            element.placeholder = translationElement.textContent;
        }
    });
});

// 页面加载时初始化状态
const presetToggle = document.querySelector('.description-toggle.preset-guide');
const logToggle = document.querySelector('.description-toggle.log-guide');

// 初始状态：所有指南都处于折叠状态
if (presetToggle) {
    document.getElementById('presetGuideContent').classList.remove('active');
    presetToggle.classList.remove('active');
}

if (logToggle) {
    document.getElementById('logGuideContent').classList.remove('active');
    logToggle.classList.remove('active');
}

// 根据当前选中的选项卡设置指南显示
const activeTab = document.querySelector('.tab.active');
if (activeTab) {
    const tabId = activeTab.getAttribute('onclick').match(/'([^']+)'/)[1];
    if (tabId === 'jsonl-to-txt') {
        if (presetToggle) presetToggle.style.display = 'none';
        if (logToggle) logToggle.style.display = 'flex';
    } else {
        if (presetToggle) presetToggle.style.display = 'flex';
        if (logToggle) logToggle.style.display = 'none';
    }
}

// 如果没有正则规则（可能是首次访问），则添加默认规则
if (regexRules.length === 0) {
    addDefaultRegex();
} else {
    // 否则渲染已加载的规则
    renderRegexRules();
} 