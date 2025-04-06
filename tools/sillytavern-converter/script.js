/**
 * SillyTavern预设转换工具
 * 用于在Markdown格式和JSON格式之间转换SillyTavern预设
 */

// 全局变量
let mdSourceFilename = '';
let jsonSourceFilename = '';
let regexRules = []; // 存储正则表达式规则

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
        // 确保内容末尾的换行符被保留，同时去除开头的空白
        let content = contentLines.join('\n');
        
        // 去除开头的空白，保留内容
        const trimStartContent = content.trimStart();
        
        // 只在非空内容且不以换行符结尾时添加换行符，不在原内容已有换行符时额外添加
        if (trimStartContent.length > 0 && !trimStartContent.endsWith('\n')) {
            content = trimStartContent + '\n';
        } else {
            content = trimStartContent;
        }
        
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
 * @param {string} fileType - 文件类型 ('json' 或 'md' 或 'txt')
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
    } else if (fileType === 'txt' && document.getElementById('jsonlFilename').textContent) {
        defaultName = document.getElementById('jsonlFilename').textContent.replace(/\.[^/.]+$/, "") + '.txt';
    } else {
        defaultName = fileType === 'json' ? 'silly_tavern_preset.json' : 
                      fileType === 'md' ? 'silly_tavern_preset.md' : 'chat_export.txt';
    }
    
    const filename = prompt(document.querySelector('[data-i18n="enterFilename"]').textContent, defaultName);
    
    if (filename) {
        const mimeType = fileType === 'json' ? 'application/json' : 
                          fileType === 'md' ? 'text/markdown' : 'text/plain';
        const blob = new Blob([content], { type: mimeType });
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
 * @param {string} type - 指南类型('preset'或'log')
 */
function toggleExtendedDesc(type) {
    let toggle, content;
    
    if (type === 'log') {
        toggle = document.querySelector('.description-toggle.log-guide');
        content = document.getElementById('logGuideContent');
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
                                    let regex;
                                    
                                    // 正确处理用户输入的正则表达式格式
                                    if (typeof regexStr === 'string') {
                                        if (regexStr.startsWith('/') && regexStr.lastIndexOf('/') > 0) {
                                            // 处理 /pattern/flags 格式
                                            const lastSlashIndex = regexStr.lastIndexOf('/');
                                            const pattern = regexStr.substring(1, lastSlashIndex);
                                            const flags = regexStr.substring(lastSlashIndex + 1);
                                            regex = new RegExp(pattern, flags);
                                        } else {
                                            // 处理直接的pattern字符串，默认添加gs标志
                                            regex = new RegExp(regexStr, 'gs');
                                        }
                                        
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
        alert(document.querySelector('[data-i18n="noJsonlContent"]').textContent);
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
        findRegex: "(.*?<\\/think(ing)?>)(\\n)?|((.*?)<theatre>(\\n)?)",
        replaceString: "",
        placement: [],
        disabled: false
    });
    
    regexRules.push({
        id: generateUUID(),
        scriptName: "移除免责声明和标签",
        findRegex: "(<disclaimer>.*?<\\/disclaimer>)|(<!-- State(.*?)d(.*?) -->(\\n)?)|(<!-- consider: (.*?) -->(\\n)?)|(<!-- sequential characters behaviors deductions: (.*?) -->(\\n)?)|((\\n)?<(\\/)?content>(\\n)?)",
        replaceString: "",
        placement: [],
        disabled: false
    });
    
    regexRules.push({
        id: generateUUID(),
        scriptName: "移除摘要总结",
        findRegex: "(<details><summary>\\s*(摘要|总结)?<\\/summary>.*?<\\/details>)|(<This_round_events>.*?<\\/This_round_events>)|(<[Aa]bstract>.*?<\\/[Aa]bstract>)|(<tableEdit>.*?<\\/tableEdit>)",
        replaceString: "",
        placement: [],
        disabled: false
    });
    
    regexRules.push({
        id: generateUUID(),
        scriptName: "移除状态栏",
        findRegex: "/(<(status(blocks?)?>.*?<(\\/status(blocks?)?)>)/gsi",
        replaceString: "",
        placement: [],
        disabled: false
    });
    
    // 更新UI
    renderRegexRules();
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
}

/**
 * 格式化正则表达式显示
 * @param {string} regexStr - 正则表达式字符串
 * @returns {string} - 格式化后的正则表达式
 */
function formatRegexDisplay(regexStr) {
    if (!regexStr) return "";
    
    // 如果已经是/pattern/flags格式，则直接返回
    if (regexStr.startsWith('/') && regexStr.lastIndexOf('/') > 0 && 
        regexStr.lastIndexOf('/') < regexStr.length - 1) {
        return regexStr;
    }
    
    // 否则添加/和/gs标志
    return `/${regexStr}/gs`;
}

/**
 * 从显示格式解析正则表达式
 * @param {string} displayStr - 显示格式的正则表达式
 * @returns {string} - 存储格式的正则表达式
 */
function parseRegexFromDisplay(displayStr) {
    return displayStr;
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
        regexInput.value = formatRegexDisplay(rule.findRegex);
        regexInput.placeholder = '例如: /pattern/flags 或直接输入pattern';
        regexInput.onchange = (e) => updateRegexRule(rule.id, 'findRegex', parseRegexFromDisplay(e.target.value));
        
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
    }
}

/**
 * 移除正则表达式规则
 * @param {string} id - 规则ID
 */
function removeRegex(id) {
    regexRules = regexRules.filter(rule => rule.id !== id);
    renderRegexRules();
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

// 添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 默认显示JSONL转TXT选项卡
    showTab('jsonl-to-txt');
    
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
    
    // 添加JSONL文件输入变更事件处理
    document.getElementById('fileInputJsonl').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 显示文件名
            document.getElementById('jsonlFilename').textContent = file.name;
            
            // 自动加载并转换
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('inputAreaJsonl').value = e.target.result;
                convertJsonlToTxt(); // 自动转换
            };
            reader.readAsText(file);
        }
    });
    
    // 添加正则表达式文件输入变更事件处理
    document.getElementById('fileInputRegex').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    
                    // 检查是否是有效的正则规则
                    if (jsonData.findRegex) {
                        // 单个规则
                        let regexStr = jsonData.findRegex;
                        
                        // 处理不同格式的正则表达式
                        if (typeof regexStr === 'string') {
                            // 如果不是 /pattern/flags 格式，转换为此格式
                            if (!(regexStr.startsWith('/') && regexStr.lastIndexOf('/') > 0 && regexStr.lastIndexOf('/') < regexStr.length - 1)) {
                                // 默认添加 gs 标志以支持全局和多行匹配
                                regexStr = '/' + regexStr + '/gs';
                            }
                        }
                        
                        const rule = {
                            id: generateUUID(),
                            scriptName: jsonData.scriptName || '导入的正则',
                            findRegex: regexStr,
                            replaceString: jsonData.replaceString || '',
                            placement: jsonData.placement || [],
                            disabled: jsonData.disabled || false
                        };
                        regexRules.push(rule);
                    } else if (Array.isArray(jsonData)) {
                        // 规则数组
                        jsonData.forEach(item => {
                            if (item.findRegex) {
                                let regexStr = item.findRegex;
                                
                                // 处理不同格式的正则表达式
                                if (typeof regexStr === 'string') {
                                    // 如果不是 /pattern/flags 格式，转换为此格式
                                    if (!(regexStr.startsWith('/') && regexStr.lastIndexOf('/') > 0 && regexStr.lastIndexOf('/') < regexStr.length - 1)) {
                                        // 默认添加 gs 标志以支持全局和多行匹配
                                        regexStr = '/' + regexStr + '/gs';
                                    }
                                }
                                
                                const rule = {
                                    id: generateUUID(),
                                    scriptName: item.scriptName || '导入的正则',
                                    findRegex: regexStr,
                                    replaceString: item.replaceString || '',
                                    placement: item.placement || [],
                                    disabled: item.disabled || false
                                };
                                regexRules.push(rule);
                            }
                        });
                    }
                    
                    renderRegexRules();
                } catch (error) {
                    console.error('解析正则表达式JSON失败:', error);
                    alert('解析正则表达式失败: ' + error.message);
                }
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
    
    // 初始化默认正则表达式
    addDefaultRegex();
}); 