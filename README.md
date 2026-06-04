# 直播轻量化启动器

这是一个直播运营轻量化启动工具，用来把高考后直播信息快速生成标准化启动包。

第二版已支持：

- 本地模板生成
- AI API 生成更灵活的直播方案
- 网页内配置不同大模型 API：OpenAI、DeepSeek、豆包/火山方舟、自定义兼容接口
- 一键生成可编辑 PPT 文件

## 如何使用

### 方式一：本地模板生成

直接打开 `index.html`，填写左侧表单，点击「本地生成」即可。

### 方式二：网页内配置 API 后 AI生成

直接打开 `index.html`，在页面顶部「网页内 API 配置」里填写：

- 服务商
- API Key
- Base URL
- 模型，例如 `gpt-4.1-mini`、`deepseek-chat`，或豆包控制台里的模型 Endpoint ID

点击「保存配置」后，再点击「AI生成」即可。

API Key 只保存在当前浏览器的本地存储中，不会写进项目文件。多人共用电脑时，用完建议点击「清除」。如果某个服务商不允许浏览器跨域请求，请改用后端模式。

### 方式三：后端模式 + PPT导出

需要启动后端服务：

1. 安装依赖

```bash
npm install
```

2. 配置 API Key

复制 `.env.example` 为 `.env`，然后填写：

```bash
LLM_API_KEY=你的 API Key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-mini
PORT=4173
```

3. 启动服务

```bash
npm start
```

4. 打开浏览器访问

```text
http://localhost:4173
```

点击「AI生成」可调用配置的大模型 API，点击「生成 PPT」可下载 `.pptx` 文件。

常见 Base URL 示例：

- OpenAI：`https://api.openai.com/v1`
- DeepSeek：`https://api.deepseek.com/v1`
- 豆包 / 火山方舟：以控制台实际地址为准，常见格式类似 `https://ark.cn-beijing.volces.com/api/v3`
- 自定义网关：填写兼容 OpenAI Chat Completions 的 `/v1` 地址

输出内容包括：

- 单场直播启动表
- 主持人提问设计
- 嘉宾答题卡
- PPT轻量版结构
- 主持人口播模块
- 小助手承接话术
- 待业务确认事项

## 如何给其他人访问

任选一种方式：

1. 直接把整个文件夹发给同事，让他们打开 `index.html`。
2. 上传到公司内网或静态文件服务器。
3. 上传到 GitHub Pages、Vercel、Netlify 等静态托管服务。
4. 放进飞书知识库或企业网盘，作为可下载工具使用。

## 第一版功能

- 场次类型自动识别
- 目标场次手动选择：天赋志愿场、留学路径场、家长决策场、出分前准备场、出分后补救场、综合规划场
- 支持手动输入主持人提问，留空时才自动生成
- 接入 AI API，让每场输出更灵活
- 一键生成 PPT 文件
- 一键生成直播启动方案
- 一键复制 Markdown
- 导出 Markdown
- 打印或另存为 PDF
- 保存历史场次
- 复用上一场

## 部署建议

如果要让其他人通过链接访问，建议部署为 Node 服务，并在服务器上配置 `.env`。不要把 API Key 写进前端页面。

可以部署到：

- 公司内网服务器
- Render / Railway / Fly.io
- 支持 Node.js 的云服务器
- Vercel / Netlify 的后端函数版本

## 后续可升级

- 增加嘉宾库、资料库、福利库
- 接入飞书或企业微信
