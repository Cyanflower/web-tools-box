/**
 * 工具可用性检查
 * 检查工具是否存在，如果不存在则禁用相应的工具卡片
 */
document.addEventListener('DOMContentLoaded', function () {
  // 获取所有工具卡片
  const toolCards = document.querySelectorAll('.tool-card');

  // 检查每个工具卡片的链接是否有效
  toolCards.forEach(card => {
    // 获取卡片的目标URL
    const targetUrl = card.getAttribute('data-href');

    if (!targetUrl) return;

    // 检查目标URL是否存在
    fetch(targetUrl, { method: 'HEAD' })
      .then(response => {
        // 如果响应不成功（如404），禁用卡片
        if (!response.ok) {
          disableToolCard(card);
        } else {
          // 如果工具可用，添加点击事件
          enableToolCard(card, targetUrl);
        }
      })
      .catch(() => {
        // 如果请求失败（如路径不存在），禁用卡片
        disableToolCard(card);
      });
  });

  /**
   * 禁用工具卡片
   * @param {HTMLElement} card - 要禁用的工具卡片元素
   */
  function disableToolCard(card) {
    // 添加禁用样式类
    card.classList.add('disabled');

    // 移除点击事件
    card.onclick = null;
    card.style.cursor = 'default';

    // 添加"即将推出"标签，使用i18n
    const comingSoonLabel = document.createElement('div');
    comingSoonLabel.className = 'coming-soon-label';
    comingSoonLabel.setAttribute('data-i18n', 'comingSoon');

    // 如果LanguageManager已初始化，直接设置当前语言的文本
    if (window.LanguageManager && typeof window.LanguageManager.getText === 'function') {
      comingSoonLabel.textContent = window.LanguageManager.getText('comingSoon');
    } else {
      // 否则设置默认文本，等待i18n系统更新
      comingSoonLabel.textContent = '即将推出';
    }

    card.appendChild(comingSoonLabel);

    // 移除卡片悬停效果
    const cardOverlay = card.querySelector('.card-overlay');
    if (cardOverlay) {
      cardOverlay.style.display = 'none';
    }

    // 移除工具描述，避免显示"开发中"文本
    const toolDesc = card.querySelector('p[data-i18n^="tool"]');
    if (toolDesc) {
      toolDesc.style.display = 'none';
    }

    console.log(`工具卡片已禁用: ${card.querySelector('h3')?.textContent || '未知工具'}`);
  }

  /**
   * 启用工具卡片
   * @param {HTMLElement} card - 要启用的工具卡片元素
   * @param {string} targetUrl - 工具的URL
   */
  function enableToolCard(card, targetUrl) {
    // 确保卡片可点击
    card.style.cursor = 'pointer';

    // 添加点击事件
    card.addEventListener('click', function () {
      window.location.href = targetUrl;
    });

    console.log(`工具卡片已启用: ${card.querySelector('h3')?.textContent || '未知工具'}`);
  }
}); 