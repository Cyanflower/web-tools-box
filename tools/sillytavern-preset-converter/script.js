/**
 * SillyTavern预设转换工具
 * 用于在Markdown格式和JSON格式之间转换SillyTavern预设
 */

// 全局变量
let mdSourceFilename = '';
let jsonSourceFilename = '';

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
        const content = contentLines.join('\n').trim();
        
        // 初始化基本参数
        const prompt = {
            name: name,
            role: role,
            content: content,
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
                    content: content,
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
            }
        } else {
            // 没有STR，使用索引作为标识符
            const defaultPrompt = {
                identifier: `${index + 1}`,
                name: name,
                role: role,
                content: content,
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
                mdContent += header + '\n' + (prompt.content || '');
            }
        });
        
        return mdContent;
    } catch (error) {
        console.error('转换失败:', error);
        return '转换失败: ' + error.message;
    }
}

/**
 * MD转JSON功能
 */
function convertMdToJson() {
    const inputArea = document.getElementById('inputAreaMd');
    const resultArea = document.getElementById('resultAreaJson');
    
    const mdContent = inputArea.value;
    if (!mdContent.trim()) {
        alert(document.querySelector('[data-i18n="noMdContent"]').textContent);
        return;
    }
    
    const jsonResult = convertMdToSillyTavernPreset(mdContent);
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
        alert(document.querySelector('[data-i18n="noJsonContent"]').textContent);
        return;
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
    alert(document.querySelector('[data-i18n="copied"]').textContent);
}

/**
 * 保存为文件
 * @param {string} elementId - 内容所在元素的ID
 * @param {string} fileType - 文件类型 ('json' 或 'md')
 */
function saveToFile(elementId, fileType) {
    const element = document.getElementById(elementId);
    const content = element.value;
    
    if (!content.trim()) {
        alert(document.querySelector('[data-i18n="noContent"]').textContent);
        return;
    }
    
    // 使用源文件名作为基础（如果有的话）
    let defaultName;
    if (fileType === 'json' && mdSourceFilename) {
        defaultName = mdSourceFilename + '.json';
    } else if (fileType === 'md' && jsonSourceFilename) {
        defaultName = jsonSourceFilename + '.md';
    } else {
        defaultName = fileType === 'json' ? 'silly_tavern_preset.json' : 'silly_tavern_preset.md';
    }
    
    const filename = prompt(document.querySelector('[data-i18n="enterFilename"]').textContent, defaultName);
    
    if (filename) {
        const blob = new Blob([content], { type: fileType === 'json' ? 'application/json' : 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
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
            return section.trim() + '\n@@@';
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
    
    // 移除@@@结束标记（考虑可能的多种换行符情况）
    mdContent = mdContent.replace(/\n?@@@\s*\n?/g, '\n');
    
    return mdContent;
}

// 添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 文件输入变更事件处理
    document.getElementById('fileInputMd').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 显示文件名
            document.getElementById('mdFilename').textContent = file.name;
            // 保存源文件名（不带扩展名）
            mdSourceFilename = file.name.replace(/\.[^/.]+$/, "");
            
            // 自动加载并转换
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('inputAreaMd').value = e.target.result;
                convertMdToJson(); // 自动转换
            };
            reader.readAsText(file);
        }
    });
    
    document.getElementById('fileInputJson').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 显示文件名
            document.getElementById('jsonFilename').textContent = file.name;
            // 保存源文件名（不带扩展名）
            jsonSourceFilename = file.name.replace(/\.[^/.]+$/, "");
            
            // 自动加载并转换
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('inputAreaJson').value = e.target.result;
                convertJsonToMd(); // 自动转换
            };
            reader.readAsText(file);
        }
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
}); 