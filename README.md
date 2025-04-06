# Web Tools - 在线工具集

Web Tools 是一个纯前端的在线工具集，旨在为用户提供方便实用的工具，帮助处理日常任务。

## 工具特性

目前，Web Tools 提供以下几种实用工具：

1. **Markdown 图片提取器** - 提取 Markdown 文件中的所有 base64 编码图片并打包下载
2. **图片格式转换器** - 在 PNG 和 JPG 格式之间互相转换图片
3. **PNG 清理工具** - 移除 PNG 文件中的非必要数据块，减小文件大小

## 纯前端处理

所有工具完全在浏览器中运行，不会将您的文件上传到任何服务器。这意味着：

- **高度隐私** - 您的文件始终保留在本地设备上，不会上传到任何地方
- **离线可用** - 加载页面后，您可以断开网络连接继续使用工具
- **处理速度取决于您的设备** - 转换和处理操作使用您的设备 CPU 和内存资源进行

## 处理性能说明

由于所有处理都在浏览器中进行，工具的性能将受到以下因素影响：

- 您设备的 CPU 性能
- 可用内存大小
- 浏览器的处理能力
- 文件大小和数量

对于大型文件或批量处理多个文件时，可能会需要更长的处理时间，具体取决于您的设备性能。

## 使用提示

- **图片格式转换器**：PNG 转 JPG 时会丢失透明度，可以设置背景颜色
- **PNG 清理工具**：基本模式适合大多数用户，高级模式允许更精细控制
- **Markdown 图片提取器**：支持标准 Markdown 语法中的 base64 编码图片
- **SillyTavern 转换工具**：在多种格式之间转换 SillyTavern 预设和 Log 文件
- **决策抽签工具**：两人分别设置权重进行公平抽签决策
- **测试**：项目可以在本地通过 live-server 测试：`live-server --mount=/web-tools-box:. --port=8088`

## 兼容性

Web Tools 支持所有现代浏览器，包括：

- Google Chrome 90+
- Mozilla Firefox 90+
- Microsoft Edge 90+
- Safari 14+

Internet Explorer 不受支持。

## 语言与主题

Web Tools 提供中文和英文界面，您可以通过顶部的语言切换按钮进行切换。

同时，应用支持亮色和暗色主题，可根据系统设置自动切换，也可手动选择您喜欢的主题。

## 隐私声明

Web Tools 尊重您的隐私：

- 不收集任何用户数据
- 不追踪用户行为
- 不使用第三方分析工具
- 所有处理都在本地完成

## 反馈与贡献

如果您有任何问题、建议或反馈，欢迎通过 GitHub Issues 提交。

---

最后更新：2025 年
