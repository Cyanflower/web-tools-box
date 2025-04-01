/**
 * 抽签决策工具功能实现
 * 随机抽签、权重分配等功能
 */
document.addEventListener('DOMContentLoaded', function() {
    // 在页面加载完成后初始化工具
    initLotteryDecisionTool();
    
    // 如果存在加载管理器，标记脚本已加载
    if (window.LoadingManager) {
        window.LoadingManager.scriptsLoaded();
    }
});

/**
 * 初始化抽签决策工具
 */
function initLotteryDecisionTool() {
    // DOM 元素
    const elements = {
        // 步骤容器和选项卡
        blueTab: document.getElementById('blue-tab'),
        redTab: document.getElementById('red-tab'),
        tabs: document.querySelectorAll('.tab'),
        result: document.getElementById('result'),

        // 输入与表单
        title: document.getElementById('title'),
        optionsContainer: document.getElementById('options-container'),
        addOption: document.getElementById('add-option'),

        // 蓝方权重相关
        blueWeightBar: document.getElementById('blue-weight-bar'),
        blueRemaining: document.getElementById('blue-remaining'),

        // 蓝方加密区域
        blueEncryptionArea: document.getElementById('blue-encryption-area'),
        encryptedText: document.getElementById('encrypted-text'),
        copyText: document.getElementById('copy-text'),
        hideText: document.getElementById('hide-text'),
        generateBlue: document.getElementById('generate-blue'),

        // 红方相关
        redImportArea: document.getElementById('red-import-area'),
        redOptionsSection: document.getElementById('red-options-section'),
        displayTitle: document.getElementById('display-title'),
        redOptionsContainer: document.getElementById('red-options-container'),
        redWeightBar: document.getElementById('red-weight-bar'),
        redRemaining: document.getElementById('red-remaining'),
        importText: document.getElementById('import-text'),
        importBtn: document.getElementById('import-btn'),

        // 按钮和操作
        generateResult: document.getElementById('generate-result'),
        confirmResult: document.getElementById('confirm-result'),
        restart: document.getElementById('restart'),

        // 结果显示
        resultTitle: document.getElementById('result-title'),
        winnerDisplay: document.getElementById('winner-display'),
        weightDetails: document.getElementById('weight-details')
    };

    // 数据存储
    let lotteryData = {
        title: '',
        options: [],
        blueWeights: [],
        redWeights: [],
        winner: null,
        winnerIndex: -1
    };

    // 获取翻译文本的辅助函数
    function getText(key, defaultText = '') {
        return (LanguageManager && LanguageManager.getText) 
            ? LanguageManager.getText(key) 
            : defaultText;
    }

    // 添加选项行
    function addOptionRow(text = '') {
        const optionNumber = elements.optionsContainer.children.length + 1;
        const row = document.createElement('div');
        row.className = 'option-row';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'option-input';
        input.placeholder = getText('optionPlaceholder', '选项');
        input.setAttribute('data-i18n-placeholder', 'optionPlaceholder');
        input.setAttribute('data-option-number', optionNumber);
        input.value = text;

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';

        const weightContainer = document.createElement('div');
        weightContainer.className = 'weight-container blue';

        const counter = document.createElement('div');
        counter.className = 'weight-counter';
        counter.textContent = '0';

        const controls = document.createElement('div');
        controls.className = 'weight-controls';

        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'weight-btn weight-increase';
        increaseBtn.innerHTML = '<i class="fas fa-plus"></i>';
        increaseBtn.setAttribute('aria-label', getText('increase', '增加权重'));
        increaseBtn.addEventListener('click', () => handleWeightChange(counter, 1, 'blue'));

        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'weight-btn weight-decrease disabled';
        decreaseBtn.innerHTML = '<i class="fas fa-minus"></i>';
        decreaseBtn.setAttribute('aria-label', getText('decrease', '减少权重'));
        decreaseBtn.addEventListener('click', () => handleWeightChange(counter, -1, 'blue'));

        controls.appendChild(increaseBtn);
        controls.appendChild(decreaseBtn);

        weightContainer.appendChild(counter);
        weightContainer.appendChild(controls);

        // 添加删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-option';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.setAttribute('aria-label', getText('deleteOption', '删除选项'));
        deleteBtn.setAttribute('title', getText('deleteOption', '删除选项'));
        deleteBtn.addEventListener('click', () => deleteOptionRow(row));

        controlsContainer.appendChild(weightContainer);
        controlsContainer.appendChild(deleteBtn);

        row.appendChild(input);
        row.appendChild(controlsContainer);

        elements.optionsContainer.appendChild(row);

        // 初始化进度条状态
        updateRemainingWeight('blue');
    }

    // 删除选项行
    function deleteOptionRow(row) {
        // 获取当前选项的权重
        const counter = row.querySelector('.weight-counter');
        const weight = parseInt(counter.textContent);

        // 如果选项数量小于2，阻止删除
        if (elements.optionsContainer.children.length <= 1) {
            showNotification(getText('atLeastOneOption', '至少需要保留一个选项'), 'error');
            shakeElement(row);
            return;
        }

        // 执行删除
        row.remove();

        // 更新剩余权重
        updateRemainingWeight('blue');

        // 更新其他选项的序号
        updateOptionNumbers();
    }

    // 更新选项序号
    function updateOptionNumbers() {
        const optionRows = elements.optionsContainer.querySelectorAll('.option-row');
        optionRows.forEach((row, index) => {
            const optionNumber = index + 1;
            const input = row.querySelector('.option-input');
            input.setAttribute('data-option-number', optionNumber);
        });
    }

    // 处理权重变化
    function handleWeightChange(counterElement, change, type) {
        const currentValue = parseInt(counterElement.textContent);
        const newValue = currentValue + change;

        // 防止负数值
        if (newValue < 0) return;

        // 获取剩余权重
        const remaining = type === 'blue' ? elements.blueRemaining : elements.redRemaining;
        const currentRemaining = parseInt(remaining.textContent);

        // 增加权重时，检查是否超过了剩余值
        if (change > 0 && currentRemaining <= 0) return;

        // 更新计数器值
        counterElement.textContent = newValue;

        // 添加动画效果
        counterElement.classList.remove('count-up', 'count-down');
        void counterElement.offsetWidth; // 触发重绘
        counterElement.classList.add(change > 0 ? 'count-up' : 'count-down');

        // 更新父元素中的按钮状态
        const controls = counterElement.nextElementSibling;
        const decreaseBtn = controls.querySelector('.weight-decrease');
        const increaseBtn = controls.querySelector('.weight-increase');

        // 禁用或启用按钮
        if (newValue === 0) {
            decreaseBtn.classList.add('disabled');
        } else {
            decreaseBtn.classList.remove('disabled');
        }

        // 更新剩余权重值和进度条
        updateRemainingWeight(type);
    }

    // 更新剩余权重值和进度条
    function updateRemainingWeight(type) {
        const optionContainers = type === 'blue'
            ? elements.optionsContainer.querySelectorAll('.weight-container')
            : elements.redOptionsContainer.querySelectorAll('.weight-container');

        let totalUsed = 0;
        optionContainers.forEach(container => {
            const counter = container.querySelector('.weight-counter');
            totalUsed += parseInt(counter.textContent);
        });

        const remaining = 10 - totalUsed;
        const remainingElement = type === 'blue' ? elements.blueRemaining : elements.redRemaining;
        remainingElement.textContent = remaining;

        // 更新进度条 - 修改为从满开始减少
        const progressBar = type === 'blue'
            ? elements.blueWeightBar.querySelector('.weight-progress')
            : elements.redWeightBar.querySelector('.weight-progress');

        // 原来是随着使用而增加，现在改为随着使用而减少
        const progressPercentage = (remaining / 10) * 100;
        progressBar.style.width = `${progressPercentage}%`;

        // 更新所有增加按钮的状态
        const allIncreaseButtons = type === 'blue'
            ? elements.optionsContainer.querySelectorAll('.weight-increase')
            : elements.redOptionsContainer.querySelectorAll('.weight-increase');

        allIncreaseButtons.forEach(btn => {
            if (remaining <= 0) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });

        // 所有权重都已分配时，添加脉冲动画到保存/生成按钮
        const actionButton = type === 'blue' ? elements.generateBlue : elements.generateResult;
        if (remaining === 0) {
            actionButton.classList.add('pulse');
        } else {
            actionButton.classList.remove('pulse');
        }
    }

    // 显示提示信息
    function showNotification(message, type = 'error') {
        // 移除可能已存在的通知
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        // 创建图标
        const icon = document.createElement('i');
        if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'info') {
            icon.className = 'fas fa-info-circle';
        }

        // 创建文本
        const text = document.createElement('span');
        text.textContent = message;

        // 添加到通知元素
        notification.appendChild(icon);
        notification.appendChild(text);

        // 添加到页面
        document.body.appendChild(notification);

        // 添加显示类
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // 自动消失
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // 添加页面抖动效果
    function shakeElement(element) {
        element.classList.add('shake-error');
        setTimeout(() => {
            element.classList.remove('shake-error');
        }, 820); // 抖动动画持续时间为0.8s，加一点点缓冲
    }

    // 保存第一步数据
    function saveStep1Data() {
        const optionRows = elements.optionsContainer.querySelectorAll('.option-row');
        if (optionRows.length < 2) {
            showNotification(getText('atLeastTwoOptions', '请至少添加两个选项'));
            shakeElement(elements.blueTab);
            return false;
        }

        if (!elements.title.value.trim()) {
            showNotification(getText('enterTitle', '请输入抽签标题'));
            shakeElement(elements.blueTab);
            return false;
        }

        // 检查是否所有选项都有内容
        let allValid = true;
        optionRows.forEach(row => {
            const input = row.querySelector('.option-input');
            if (!input.value.trim()) {
                allValid = false;
            }
        });

        if (!allValid) {
            showNotification(getText('allOptionsMustHaveContent', '请确保所有选项都有内容'));
            shakeElement(elements.blueTab);
            return false;
        }

        // 检查是否已分配所有权重
        const remaining = parseInt(elements.blueRemaining.textContent);
        if (remaining !== 0) {
            showNotification(getText('distributeAllWeightPoints', `您需要分配完所有10个权重点数，当前还剩: ${remaining}`).replace('{remaining}', remaining));
            shakeElement(elements.blueTab);
            return false;
        }

        // 保存数据
        lotteryData.title = elements.title.value.trim();
        lotteryData.options = [];
        lotteryData.blueWeights = [];

        optionRows.forEach(row => {
            const optionText = row.querySelector('.option-input').value.trim();
            const weight = parseInt(row.querySelector('.weight-counter').textContent);

            lotteryData.options.push(optionText);
            lotteryData.blueWeights.push(weight);
        });

        return true;
    }

    // 创建红方界面
    function createRedInterface() {
        elements.displayTitle.textContent = lotteryData.title;
        elements.redOptionsContainer.innerHTML = '';

        // 创建红方选项
        lotteryData.options.forEach((option, index) => {
            const row = document.createElement('div');
            row.className = 'option-row';

            const label = document.createElement('div');
            label.className = 'option-label';
            label.textContent = option;
            label.style.flex = '1';

            const weightContainer = document.createElement('div');
            weightContainer.className = 'weight-container red';

            const counter = document.createElement('div');
            counter.className = 'weight-counter';
            counter.textContent = '0';

            const controls = document.createElement('div');
            controls.className = 'weight-controls';

            const increaseBtn = document.createElement('button');
            increaseBtn.className = 'weight-btn weight-increase';
            increaseBtn.innerHTML = '<i class="fas fa-plus"></i>';
            increaseBtn.setAttribute('aria-label', getText('increase', '增加权重'));
            increaseBtn.addEventListener('click', () => handleWeightChange(counter, 1, 'red'));

            const decreaseBtn = document.createElement('button');
            decreaseBtn.className = 'weight-btn weight-decrease disabled';
            decreaseBtn.innerHTML = '<i class="fas fa-minus"></i>';
            decreaseBtn.setAttribute('aria-label', getText('decrease', '减少权重'));
            decreaseBtn.addEventListener('click', () => handleWeightChange(counter, -1, 'red'));

            controls.appendChild(increaseBtn);
            controls.appendChild(decreaseBtn);

            weightContainer.appendChild(counter);
            weightContainer.appendChild(controls);

            row.appendChild(label);
            row.appendChild(weightContainer);

            elements.redOptionsContainer.appendChild(row);
        });

        // 初始化进度条
        updateRemainingWeight('red');
    }

    // 保存红方数据
    function saveStep2Data() {
        const optionRows = elements.redOptionsContainer.querySelectorAll('.option-row');
        lotteryData.redWeights = [];

        optionRows.forEach(row => {
            const weight = parseInt(row.querySelector('.weight-counter').textContent);
            lotteryData.redWeights.push(weight);
        });

        // 检查是否已分配所有权重
        const remaining = parseInt(elements.redRemaining.textContent);
        if (remaining !== 0) {
            showNotification(getText('distributeAllWeightPoints', `您需要分配完所有10个权重点数，当前还剩: ${remaining}`).replace('{remaining}', remaining));
            shakeElement(elements.redTab);
            return false;
        }

        return true;
    }

    // 处理选项卡切换
    function handleTabClick(event) {
        // 获取目标选项卡
        const targetTab = event.currentTarget.getAttribute('data-tab');
        
        // 清除所有选项卡的active类
        elements.tabs.forEach(tab => tab.classList.remove('active'));
        
        // 添加active类到当前点击的选项卡
        event.currentTarget.classList.add('active');
        
        // 隐藏所有内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 显示对应的内容区域
        document.getElementById(targetTab).classList.add('active');
    }

    // 生成随机结果
    function generateRandomResult() {
        if (!saveStep2Data()) return;

        // 创建一个随机数生成的视觉效果
        const randomEffectContainer = document.createElement('div');
        randomEffectContainer.className = 'random-effect-container';

        // 添加随机数显示元素
        const randomNumberDisplay = document.createElement('div');
        randomNumberDisplay.className = 'random-number-display';
        randomNumberDisplay.innerHTML = '<span>?</span>';

        // 添加说明文字
        const randomText = document.createElement('p');
        randomText.className = 'random-text';
        randomText.textContent = getText('randomizing', '正在随机选择...');

        randomEffectContainer.appendChild(randomNumberDisplay);
        randomEffectContainer.appendChild(randomText);

        // 添加到界面
        document.querySelector('.tool-content').appendChild(randomEffectContainer);

        // 计算总权重
        const totalWeights = [];
        const weightSum = lotteryData.options.reduce((sum, _, i) => {
            const weight = lotteryData.blueWeights[i] + lotteryData.redWeights[i];
            totalWeights.push(weight);
            return sum + weight;
        }, 0);

        // 显示随机数滚动效果
        const randomInterval = setInterval(() => {
            // 生成随机显示数字（仅用于动画效果，与实际结果无关）
            const randomValue = Math.floor(Math.random() * 100) + 1;
            randomNumberDisplay.innerHTML = `<span>${randomValue}</span>`;
        }, 100);

        // 生成真正的随机数和结果，但不显示出来
        setTimeout(() => {
            clearInterval(randomInterval);

            // 生成随机数并确定结果
            const random = Math.random() * weightSum;
            let cumulative = 0;
            let winnerIndex = -1;

            for (let i = 0; i < totalWeights.length; i++) {
                cumulative += totalWeights[i];
                if (random < cumulative) {
                    winnerIndex = i;
                    break;
                }
            }

            lotteryData.winnerIndex = winnerIndex;
            lotteryData.winner = lotteryData.options[winnerIndex];
            lotteryData.randomValue = random;
            lotteryData.weightSum = weightSum;

            // 不显示最终数字，只显示完成信息
            randomText.textContent = getText('randomizingComplete', '随机完成！');

            // 启用确认按钮
            elements.confirmResult.disabled = false;

            // 0.5秒后自动移除随机效果容器
            setTimeout(() => {
                randomEffectContainer.classList.add('fade-out');
                setTimeout(() => {
                    if (randomEffectContainer.parentNode) {
                        randomEffectContainer.parentNode.removeChild(randomEffectContainer);
                    }
                }, 500);
            }, 500);
        }, 1000); // 1秒后结束随机效果
    }

    // 高亮显示获胜选项
    function highlightWinner(winnerIndex) {
        const optionRows = elements.redOptionsContainer.querySelectorAll('.option-row');
        optionRows.forEach((row, index) => {
            if (index === winnerIndex) {
                row.classList.add('winner-option');
            } else {
                row.classList.remove('winner-option');
            }
        });
    }

    // 显示最终结果
    function showFinalResult() {
        // 在这里高亮显示获胜选项
        highlightWinner(lotteryData.winnerIndex);

        // 隐藏选项卡内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 显示结果页面
        elements.result.classList.add('active');

        elements.resultTitle.textContent = lotteryData.title;
        elements.winnerDisplay.textContent = lotteryData.winner;

        // 添加抖动效果
        elements.winnerDisplay.classList.add('shake');
        setTimeout(() => {
            elements.winnerDisplay.classList.remove('shake');
        }, 500);

        // 生成权重详情
        elements.weightDetails.innerHTML = '';

        // 添加随机数和权重说明
        const randomInfo = document.createElement('div');
        randomInfo.className = 'random-info';
        
        const randomNumberText = getText('randomNumber', '随机数');
        const totalWeightText = getText('totalWeight', '总权重');
        const weightExplanationText = getText('weightExplanation', '随机结果由双方共同分配的权重决定，每个选项的中选概率 = (选项权重 ÷ 总权重) × 100%');
        const randomNumberExplanationText = getText('randomNumberExplanation', '系统生成了随机数 {number}，落在了"{winner}"的区间内，因此被选中。')
            .replace('{number}', Math.floor(lotteryData.randomValue))
            .replace('{winner}', lotteryData.winner);
        
        randomInfo.innerHTML = `
            <p>${randomNumberText}: <span class="highlight">${Math.floor(lotteryData.randomValue)}</span></p>
            <p>${totalWeightText}: ${lotteryData.weightSum}</p>
            <p>${weightExplanationText}</p>
            <p>${randomNumberExplanationText}</p>
        `;
        elements.weightDetails.appendChild(randomInfo);

        // 添加表格标题
        const tableHeader = document.createElement('div');
        tableHeader.className = 'weight-table-header';
        
        const optionText = getText('option', '选项');
        const blueWeightText = getText('blueWeight', '蓝方权重');
        const redWeightText = getText('redWeight', '红方权重');
        const totalWeightColumnText = getText('totalWeight', '总权重');
        const probabilityText = getText('probability', '概率');
        
        tableHeader.innerHTML = `
            <div class="option-column">${optionText}</div>
            <div class="weight-column">${blueWeightText}</div>
            <div class="weight-column">${redWeightText}</div>
            <div class="weight-column">${totalWeightColumnText}</div>
            <div class="weight-column">${probabilityText}</div>
        `;
        elements.weightDetails.appendChild(tableHeader);

        // 创建权重表格
        const weightTable = document.createElement('div');
        weightTable.className = 'weight-table';

        lotteryData.options.forEach((option, i) => {
            const blueWeight = lotteryData.blueWeights[i];
            const redWeight = lotteryData.redWeights[i];
            const totalWeight = blueWeight + redWeight;
            const probability = (totalWeight / lotteryData.weightSum * 100).toFixed(1);

            const isWinner = i === lotteryData.winnerIndex;

            const weightRow = document.createElement('div');
            weightRow.className = 'weight-row';
            if (isWinner) {
                weightRow.classList.add('winner-row');
            }

            // 创建权重可视化指示器
            const blueIndicator = createIndicator(blueWeight, totalWeight, 'blue');
            const redIndicator = createIndicator(redWeight, totalWeight, 'red');

            weightRow.innerHTML = `
                <div class="option-column">${option}</div>
                <div class="weight-column">
                    ${blueWeight}
                    ${blueIndicator}
                </div>
                <div class="weight-column">
                    ${redWeight}
                    ${redIndicator}
                </div>
                <div class="weight-column">
                    ${totalWeight}
                    <div class="inline-bar-container">
                        <div class="inline-bar" style="width: ${(totalWeight / lotteryData.weightSum) * 100}%"></div>
                    </div>
                </div>
                <div class="weight-column probability">${probability}%</div>
            `;

            weightTable.appendChild(weightRow);
        });

        elements.weightDetails.appendChild(weightTable);

        // 庆祝效果
        createConfetti();
    }

    // 创建内联的权重指示器
    function createIndicator(weight, totalWeight, type) {
        if (weight === 0) return '';

        const percentage = (weight / totalWeight) * 100;
        const colorClass = type === 'blue' ? 'blue-indicator' : 'red-indicator';

        return `<div class="inline-bar-container">
            <div class="inline-bar ${colorClass}" style="width: ${percentage}%"></div>
        </div>`;
    }

    // 创建彩色纸屑效果
    function createConfetti() {
        const container = document.querySelector('.container');
        const colors = ['#4cc9f0', '#ff5a5f', '#43aa8b', '#f9c74f', '#90be6d'];

        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDuration = Math.random() * 3 + 2 + 's';
            confetti.style.opacity = Math.random() + 0.5;

            container.appendChild(confetti);

            setTimeout(() => {
                if (container.contains(confetti)) {
                    container.removeChild(confetti);
                }
            }, 5000);
        }
    }

    // 加密/解密功能
    function encryptData(data) {
        try {
            // 将对象转为JSON字符串
            const jsonString = JSON.stringify(data);

            // 简单加密（使用Base64编码），实际应用中可使用更安全的方法
            const encrypted = btoa(unescape(encodeURIComponent(jsonString)));

            console.log("加密成功，加密后长度:", encrypted.length);
            return encrypted;
        } catch (error) {
            console.error("加密失败:", error);
            // 返回一个简单的错误加密内容，确保流程不会中断
            return btoa(JSON.stringify({
                error: "加密失败，请重试",
                timestamp: new Date().toISOString()
            }));
        }
    }

    function decryptData(encrypted) {
        try {
            // 解码Base64获取JSON字符串
            const jsonString = decodeURIComponent(escape(atob(encrypted)));
            // 解析JSON
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("解密失败:", e);
            showNotification(getText('invalidEncryptedText', '文件格式错误或已损坏'), 'error');
            return null;
        }
    }

    // 生成并显示加密文本
    function generateEncryptedText() {
        // 先保存蓝方数据
        if (!saveStep1Data()) {
            return;
        }

        // 准备要加密的数据
        const data = {
            title: lotteryData.title,
            options: lotteryData.options,
            blueWeights: lotteryData.blueWeights,
            timestamp: new Date().toISOString()
        };

        console.log("准备生成加密数据:", data);

        // 加密数据
        const encrypted = encryptData(data);

        // 将加密文本显示在文本框中
        elements.encryptedText.value = encrypted;

        // 显示加密区域
        elements.blueEncryptionArea.classList.remove('hidden');

        // 自动选择文本以便于用户复制
        elements.encryptedText.select();

        // 滚动到加密区域
        elements.blueEncryptionArea.scrollIntoView({ behavior: 'smooth' });
    }

    // 复制加密文本到剪贴板
    function copyEncryptedText() {
        // 确保文本框有内容
        if (!elements.encryptedText.value) {
            generateEncryptedText();
            return;
        }

        // 选择文本
        elements.encryptedText.select();

        try {
            // 复制到剪贴板
            document.execCommand('copy');

            // 提示复制成功
            showNotification(getText('copySuccess', '复制成功！现在可以分享给红方了'), 'success');

            // 更改按钮样式，提示成功
            elements.copyText.innerHTML = `<i class="fas fa-check"></i> ${getText('copied', '复制成功')}`;
            elements.copyText.classList.add('copy-success');

            // 3秒后恢复按钮状态
            setTimeout(() => {
                elements.copyText.innerHTML = `<i class="fas fa-copy"></i> ${getText('copyEncryptedText', '复制加密文本')}`;
                elements.copyText.classList.remove('copy-success');
            }, 3000);

        } catch (err) {
            console.error('复制失败:', err);
            showNotification(getText('copyFailed', '复制失败，请手动复制文本'), 'error');
        }
    }

    // 隐藏加密文本区域
    function hideEncryptionArea() {
        elements.blueEncryptionArea.classList.add('hidden');
    }

    // 从粘贴文本导入数据
    function importFromText() {
        const text = elements.importText.value.trim();

        if (!text) {
            showNotification(getText('pasteThenImport', '请先粘贴加密文本'), 'error');
            shakeElement(elements.importText);
            return;
        }

        try {
            const data = decryptData(text);

            if (data && data.title && data.options && data.blueWeights) {
                lotteryData.title = data.title;
                lotteryData.options = data.options;
                lotteryData.blueWeights = data.blueWeights;

                // 隐藏导入区域，显示红方选项区域
                elements.redImportArea.classList.add('hidden');
                elements.redOptionsSection.classList.remove('hidden');

                // 创建红方界面
                createRedInterface();
            } else {
                showNotification(getText('invalidEncryptedText', '无效的加密文本'), 'error');
                shakeElement(elements.importText);
            }
        } catch (e) {
            console.error('导入失败:', e);
            showNotification(getText('parsingError', '解析加密文本失败'), 'error');
            shakeElement(elements.importText);
        }
    }

    // 设置事件监听器
    function setupEventListeners() {
        elements.addOption.addEventListener('click', () => addOptionRow());
        
        // 选项卡切换事件
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });

        // 蓝方生成加密文本
        elements.generateBlue.addEventListener('click', generateEncryptedText);

        // 复制加密文本
        elements.copyText.addEventListener('click', copyEncryptedText);

        // 隐藏加密文本区域
        elements.hideText.addEventListener('click', hideEncryptionArea);

        // 导入按钮事件监听
        elements.importBtn.addEventListener('click', importFromText);

        // 随机结果相关
        elements.generateResult.addEventListener('click', generateRandomResult);
        elements.confirmResult.addEventListener('click', showFinalResult);

        // 重新开始
        elements.restart.addEventListener('click', () => {
            window.location.reload();
        });
        
        // 设置年份
        document.getElementById('current-year').textContent = new Date().getFullYear();
    }

    // 为HTML中的初始选项设置事件监听
    function setupInitialOption() {
        const initialOption = elements.optionsContainer.querySelector('.option-row');
        if (initialOption) {
            const counter = initialOption.querySelector('.weight-counter');
            const increaseBtn = initialOption.querySelector('.weight-increase');
            const decreaseBtn = initialOption.querySelector('.weight-decrease');
            const deleteBtn = initialOption.querySelector('.delete-option');

            // 移除可能已存在的事件监听器，防止重复绑定
            increaseBtn.replaceWith(increaseBtn.cloneNode(true));
            decreaseBtn.replaceWith(decreaseBtn.cloneNode(true));
            if (deleteBtn) deleteBtn.replaceWith(deleteBtn.cloneNode(true));

            // 获取新的按钮引用
            const newIncreaseBtn = initialOption.querySelector('.weight-increase');
            const newDecreaseBtn = initialOption.querySelector('.weight-decrease');
            const newDeleteBtn = initialOption.querySelector('.delete-option');

            // 添加事件监听器
            newIncreaseBtn.addEventListener('click', () => handleWeightChange(counter, 1, 'blue'));
            newDecreaseBtn.addEventListener('click', () => handleWeightChange(counter, -1, 'blue'));
            if (newDeleteBtn) newDeleteBtn.addEventListener('click', () => deleteOptionRow(initialOption));
        }

        // 初始化状态
        updateRemainingWeight('blue');
    }

    // 初始化应用
    function init() {
        // 为默认的第一个选项添加事件监听
        setupInitialOption();

        // 设置事件监听器
        setupEventListeners();

        // 初始化进度条 - 修改为从满开始
        elements.blueWeightBar.querySelector('.weight-progress').style.width = '100%';
        elements.redWeightBar.querySelector('.weight-progress').style.width = '100%';
        
        console.log('抽签决策工具初始化完成');
    }

    // 启动应用
    init();
} 