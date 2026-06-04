const form = document.querySelector("#launchForm");
const result = document.querySelector("#result");
const emptyState = document.querySelector("#emptyState");
const typeBadge = document.querySelector("#typeBadge");
const historyList = document.querySelector("#historyList");
const generateAIButton = document.querySelector("#generateAI");
const downloadPptButton = document.querySelector("#downloadPpt");
const apiProviderInput = document.querySelector("#apiProvider");
const apiKeyInput = document.querySelector("#apiKey");
const apiBaseUrlInput = document.querySelector("#apiBaseUrl");
const apiModelInput = document.querySelector("#apiModel");
const apiStatus = document.querySelector("#apiStatus");
const saveApiConfigButton = document.querySelector("#saveApiConfig");
const clearApiConfigButton = document.querySelector("#clearApiConfig");

const storageKey = "ukec-live-launch-history";
const apiConfigKey = "ukec-live-launch-api-config";
let latestMarkdown = "";
let latestData = null;

const providerPresets = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  doubao: {
    label: "豆包 / 火山方舟",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "请填写你的豆包模型 Endpoint ID",
  },
  custom: {
    label: "自定义兼容接口",
    baseUrl: "",
    model: "",
  },
};

const sample = {
  targetType: "天赋志愿场",
  time: "6月11日 14:00",
  topic: "高考结束后第一步：孩子未来方向怎么判断？",
  audience: "高考后学生家长",
  guest: "彭威老师，遇见天赋项目负责人",
  goal: "品牌层：让大家信赖 UKEC 的实力\n内容层：让家长知道这个阶段要如何选专业\n促销层：售卖遇见天赋产品",
  pain: "1. 不知道高考之后选什么专业\n2. 不知道现在这个阶段要做什么",
  hostQuestions:
    "高考刚结束，分数还没出来，现在就看专业方向会不会太早？\n很多家长说孩子不知道自己喜欢什么，这种情况应该怎么判断？\n判断孩子适合什么专业，除了分数还要看哪些维度？\n如果孩子和家长对专业方向想法不一致，应该听谁的？\n高考后选专业，家长最容易踩的坑是什么？\n彭老师有没有遇到过方向模糊但通过评估变清楚的案例？\n今天听完之后，家长第一步应该做什么？",
  keyword: "天赋",
  leadMagnet: "遇见天赋自评表",
  lottery: "每10分钟抽1个登机箱",
  benefit: "10个免费1v1规划名额",
  next: "6月11日 19点 家长专场：高考后留学，家长最关心的7个问题",
};

const typeConfig = [
  {
    name: "天赋志愿场",
    terms: ["天赋", "专业", "志愿", "方向", "适合"],
    keyword: "天赋",
    lead: "专业方向测评表",
    action: "预约天赋/专业方向评估",
    dimensions: ["兴趣偏好", "能力优势", "性格特质", "价值观", "未来路径"],
  },
  {
    name: "留学路径场",
    terms: ["留学", "路径", "Plan B", "本科", "直录", "本预", "国际大一"],
    keyword: "路径",
    lead: "高考后本科路径图",
    action: "预约本科路径1v1评估",
    dimensions: ["高考成绩", "英语基础", "预算区间", "目标国家", "入学时间"],
  },
  {
    name: "家长决策场",
    terms: ["家长", "预算", "决策", "费用", "是否适合"],
    keyword: "评估",
    lead: "家长决策清单",
    action: "对接顾问做家庭方案判断",
    dimensions: ["成绩预期", "家庭预算", "孩子意愿", "风险承受", "路径匹配"],
  },
  {
    name: "出分前准备场",
    terms: ["出分前", "准备", "预案", "分数未出"],
    keyword: "准备",
    lead: "出分前准备清单",
    action: "预约出分前规划",
    dimensions: ["预估分数", "院校区间", "专业方向", "备选路径", "时间节点"],
  },
  {
    name: "出分后补救场",
    terms: ["出分后", "补救", "滑档", "补录", "分数段", "不理想"],
    keyword: "补救",
    lead: "不同分数段路径建议表",
    action: "预约出分后补救方案",
    dimensions: ["实际分数", "录取风险", "补录机会", "海外备选", "时间成本"],
  },
];

const defaultType = {
  name: "高考后综合规划场",
  keyword: "评估",
  lead: "高考后规划清单",
  action: "预约高考后1v1评估",
  dimensions: ["成绩情况", "专业方向", "英语基础", "家庭预算", "备选路径"],
};

function getData() {
  return Object.fromEntries(new FormData(form).entries());
}

function fillForm(data) {
  Object.entries(data).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
  updateBadge();
}

function clean(value, fallback = "【待确认】") {
  return String(value || "").trim() || fallback;
}

function getApiConfig() {
  try {
    return JSON.parse(localStorage.getItem(apiConfigKey) || "{}");
  } catch {
    return {};
  }
}

function saveApiConfig() {
  const provider = apiProviderInput.value;
  const apiKey = apiKeyInput.value.trim();
  const baseUrl = apiBaseUrlInput.value.trim();
  const model = apiModelInput.value.trim();
  if (!apiKey) return showToast("请先填写 API Key");
  if (!baseUrl) return showToast("请先填写 Base URL");
  if (!model) return showToast("请先填写模型");
  localStorage.setItem(apiConfigKey, JSON.stringify({ provider, apiKey, baseUrl, model }));
  updateApiConfigView();
  showToast("API配置已保存");
}

function clearApiConfig() {
  localStorage.removeItem(apiConfigKey);
  apiProviderInput.value = "openai";
  apiKeyInput.value = "";
  apiBaseUrlInput.value = providerPresets.openai.baseUrl;
  apiModelInput.value = providerPresets.openai.model;
  updateApiConfigView();
  showToast("API配置已清除");
}

function updateApiConfigView() {
  const config = getApiConfig();
  const provider = config.provider || "openai";
  const preset = providerPresets[provider] || providerPresets.openai;
  apiProviderInput.value = provider;
  apiKeyInput.value = config.apiKey || "";
  apiBaseUrlInput.value = config.baseUrl || preset.baseUrl;
  apiModelInput.value = config.model || preset.model;
  apiStatus.textContent = config.apiKey ? `已配置：${preset.label}` : "未配置";
}

function applyProviderPreset() {
  const preset = providerPresets[apiProviderInput.value] || providerPresets.custom;
  apiBaseUrlInput.value = preset.baseUrl;
  apiModelInput.value = preset.model;
}

function inferType(data) {
  if (data.targetType && data.targetType !== "auto") {
    return typeConfig.find((item) => item.name === data.targetType) || defaultType;
  }
  const haystack = `${data.topic || ""} ${data.goal || ""} ${data.pain || ""} ${data.keyword || ""} ${data.leadMagnet || ""}`;
  const ranked = typeConfig
    .map((item) => ({
      item,
      score: item.terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
  return ranked[0].score > 0 ? ranked[0].item : defaultType;
}

function updateBadge() {
  const data = getData();
  const config = inferType(getData());
  typeBadge.textContent = data.targetType && data.targetType !== "auto" ? `已选择：${config.name}` : `自动识别：${config.name}`;
}

function guestName(guest) {
  const value = clean(guest, "嘉宾老师");
  return value.split(/[，,、\s]/).filter(Boolean)[0] || value;
}

function parseCustomQuestions(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•\d\s.、)）]+/, "")
        .replace(/^Q\d+[:：\s]*/i, "")
        .trim(),
    )
    .filter(Boolean);
}

function buildQuestions(data, config) {
  const customQuestions = parseCustomQuestions(data.hostQuestions);
  const questionTypes = ["现状判断", "用户焦虑", "方法拆解", "路径选择", "避坑提醒", "案例说明", "行动建议"];
  if (customQuestions.length) {
    return customQuestions.map((question, index) => [`Q${index + 1}`, questionTypes[index] || "补充提问", question]);
  }

  const topic = clean(data.topic, "本场主题");
  const keyword = clean(data.keyword, config.keyword);
  return [
    ["Q1", "现状判断", `高考刚结束，现在就开始关注「${topic}」，会不会太早？`],
    ["Q2", "用户焦虑", `很多家长现在最纠结的是「${clean(data.pain, "孩子方向不清楚")}」，这个问题应该先从哪里判断？`],
    ["Q3", "方法拆解", `判断孩子适合什么方向，不能只看分数，那具体还要看哪些维度？`],
    ["Q4", "路径选择", `如果孩子现在没有明确想法，或者兴趣很多但不确定，家长应该怎么帮他缩小范围？`],
    ["Q5", "避坑提醒", `围绕${keyword}和专业选择，家长最容易踩哪些坑？`],
    ["Q6", "案例说明", `有没有真实案例可以参考，说明方向判断清楚后，后续规划会发生什么变化？`],
    ["Q7", "行动建议", `家长今天听完以后，今晚第一步最应该做什么？怎么判断要不要做一次1v1评估？`],
  ];
}

function buildAIPrompt(data, config) {
  const customQuestions = parseCustomQuestions(data.hostQuestions);
  return `
请为一场高考后升学规划直播生成“轻量化启动方案”。

必须严格输出 Markdown，并保持以下 7 个模块标题：

# 【直播主题】轻量化启动方案
## 1. 单场直播启动表
## 2. 主持人提问设计
## 3. 嘉宾答题卡
## 4. PPT轻量版结构
## 5. 主持人口播模块
## 6. 小助手承接话术
## 7. 待业务确认事项

要求：
- 不写长篇完整策划案。
- 不写完整逐字稿。
- 主持人提问必须优先使用用户填写的问题；如用户未填写，生成 5-7 个适合直播直接问的问题。
- 嘉宾答题卡按“结论、判断标准、案例、行动建议”写。
- 案例不足时写【待业务补充案例】，不要编造具体学生故事。
- PPT控制在5页，输出可执行的页面结构。
- 转化链路固定为：评论区关键词 → 小助手 → 资料领取 → 1v1评估 → 顾问承接。
- 话术要口语化，有直播间承接感，但不要过度销售。

本场信息：
- 目标场次：${config.name}
- 直播时间：${clean(data.time)}
- 直播主题：${clean(data.topic)}
- 面向人群：${clean(data.audience)}
- 嘉宾姓名和身份：${clean(data.guest)}
- 本场核心目的：${clean(data.goal)}
- 用户痛点：${clean(data.pain)}
- 主持人提问：${customQuestions.join(" / ") || "用户未填写，请按场次自动生成"}
- 主关键词：${clean(data.keyword, config.keyword)}
- 资料钩子：${clean(data.leadMagnet, config.lead)}
- 抽奖机制：${clean(data.lottery)}
- 直播间福利：${clean(data.benefit)}
- 下一场预告：${clean(data.next)}
`;
}

function extractResponseText(payload) {
  if (payload.choices?.[0]?.message?.content) return payload.choices[0].message.content.trim();
  if (payload.output_text) return payload.output_text;
  const chunks = [];
  (payload.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    });
  });
  return chunks.join("\n").trim();
}

function buildChatMessages(data, config) {
  return [
    {
      role: "system",
      content:
        "你是 UKEC 直播运营方案专家，擅长把高考后升学规划直播压缩成轻量、稳定、可执行的启动包。只输出 Markdown，不要输出解释。",
    },
    {
      role: "user",
      content: buildAIPrompt(data, config),
    },
  ];
}

function joinUrl(baseUrl, path) {
  return `${String(baseUrl || "").replace(/\/+$/, "")}${path}`;
}

function buildAnswerCards(data, config, questions) {
  const guest = clean(data.guest, "嘉宾老师【待确认】");
  const lead = clean(data.leadMagnet, config.lead);
  const keyword = clean(data.keyword, config.keyword);
  const dimensions = config.dimensions.join("、");
  const rows = [
    [
      questions[0][2],
      guest,
      `结论：不早，现在是提前判断方向、减少出分后慌乱的关键窗口。<br>判断标准：分数未出前不做最终拍板，但可以先看${dimensions}；出分后时间紧，提前准备能提高选择质量。<br>案例：【待业务补充案例】建议准备一个“出分后才开始选专业导致选择被动”的案例。<br>行动建议：先做方向初筛，把明显不适合和高匹配方向分出来。`,
    ],
    [
      questions[1][2],
      guest,
      `结论：不要先问“报什么专业”，要先判断孩子是什么类型的人。<br>判断标准：结合孩子兴趣、能力、性格、学习方式和家庭期待；不要只用单科成绩或热门趋势做判断。<br>案例：【待业务补充案例】可准备一个“成绩优势和真实兴趣不完全一致”的案例。<br>行动建议：评论区回复【${keyword}】，先领取${lead}做基础判断。`,
    ],
    [
      questions[2][2],
      guest,
      `结论：专业方向判断至少要交叉看${dimensions}。<br>判断标准：单一维度容易误判，多个维度一致时优先级更高；如果维度冲突，需要通过1v1评估进一步拆解。<br>案例：【待业务补充案例】可补充一个“兴趣和能力不一致时如何取舍”的案例。<br>行动建议：用结构化表格做交叉判断，不凭感觉拍板。`,
    ],
    [
      questions[3][2],
      guest,
      `结论：方向模糊很正常，先排除明显不适合的，再保留可探索方向。<br>判断标准：没想法先从能力和性格入手；想法太多看长期投入度；家长不要直接替孩子决定。<br>案例：【待业务补充案例】建议准备一个“从多个兴趣中筛出主方向和备选方向”的案例。<br>行动建议：把方向分成优先考虑、可以探索、暂不建议三类。`,
    ],
    [
      questions[4][2],
      guest,
      `结论：最大的坑是跟风，把“热门”误当成“适合”。<br>判断标准：避免只看就业薪资、只听亲友建议、用家长期待替代孩子特点、忽略未来升学路径衔接。<br>案例：【待业务补充案例】可准备一个“追热门但学习痛苦”的案例。<br>行动建议：先做孩子画像，再匹配专业和路径。`,
    ],
    [
      questions[5][2],
      guest,
      `结论：案例要帮助家长看到，专业选择不是猜，而是可以被评估和规划的。<br>判断标准：案例建议包含原始困惑、评估发现、方向调整、后续路径建议。<br>案例：【待业务补充案例】建议准备1个偏理科、1个偏文商社科案例。<br>行动建议：用案例引导家长预约1v1评估，把自家孩子情况放进去判断。`,
    ],
    [
      questions[6][2],
      guest,
      `结论：先判断方向，再匹配志愿、留学和后续规划。<br>判断标准：孩子没方向、亲子意见不一致、只知道分数不知道专业、正在考虑国内外双路径，都适合做1v1评估。<br>案例：【待业务补充案例】可结合高考后时间线说明为什么现在要启动。<br>行动建议：回复【${keyword}】领取资料，回复【评估】预约1v1。`,
    ],
  ];
  return rows;
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function mdTable(headers, rows) {
  const line = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll("\n", "<br>").replaceAll("|", "｜")).join(" | ")} |`);
  return [line, sep, ...body].join("\n");
}

function htmlToPlain(value) {
  return String(value).replaceAll("<br>", "\n").replace(/<[^>]+>/g, "");
}

function generate(data) {
  const config = inferType(data);
  const topic = clean(data.topic, "【直播主题待确认】");
  const time = clean(data.time);
  const audience = clean(data.audience, "高考后家长/学生【待确认】");
  const guest = clean(data.guest, "嘉宾【待确认】");
  const hostGuest = guestName(data.guest);
  const goal = clean(data.goal, "品牌层：建立 UKEC 专业信赖；内容层：讲清本场核心问题；促销层：引导1v1评估和产品承接");
  const pain = clean(data.pain, "用户当前痛点【待确认】");
  const keyword = clean(data.keyword, config.keyword);
  const lead = clean(data.leadMagnet, config.lead);
  const lottery = clean(data.lottery, "本场抽奖机制【待确认】");
  const benefit = clean(data.benefit, "直播间专属福利【待确认】");
  const next = clean(data.next, "下一场直播时间和主题【待确认】");
  const questions = buildQuestions(data, config);
  const cards = buildAnswerCards(data, config, questions);
  const pptRows = [
    ["1", `封面：${topic}<br>嘉宾：${guest}`],
    ["2", `今天解决什么：${questions.map((q) => q[2]).join("<br>")}`],
    ["3", `核心判断表：${config.dimensions.join(" / ")}`],
    ["4", "案例/误区页：热门不等于适合；分数不等于方向；家长判断不等于孩子适配"],
    ["5", `关键词福利页：回复【${keyword}】领取${lead}；回复【评估】预约${benefit}；抽奖：${lottery}；下一场：${next}`],
  ];
  const startRows = [
    ["基础信息", `直播时间：${time}`],
    ["", `直播主题：${topic}`],
    ["", `目标场次：${config.name}`],
    ["", `面向人群：${audience}`],
    ["", "直播形式：1主持人 + 1位嘉宾"],
    ["", `嘉宾：${guest}`],
    ["", "直播时长：45-60分钟"],
    ["内容", `本场核心目的：${goal.replaceAll("\n", "<br>")}`],
    ["", `本场用户痛点：${pain.replaceAll("\n", "<br>")}`],
    ["", `主持人提问：${data.hostQuestions ? "使用表单中填写的问题" : `围绕${questions.map((q) => q[1]).join("、")}自动生成问题`}`],
    ["", `${hostGuest}主答全部问题，主持人负责追问、复述和转化口播`],
    ["", "案例需求：建议业务侧准备1-2个可公开学生案例"],
    ["文稿/PPT", "主持人串词：开场、问题串联、资料口播、抽奖口播、福利口播、结尾"],
    ["", "嘉宾答题卡：每题按“结论、判断标准、案例、行动建议”准备"],
    ["", "PPT页数：建议5页"],
    ["", "PPT内容：封面、今天解决什么、核心判断表、案例/误区、关键词福利页"],
    ["促销&钩子", `主关键词：${keyword}`],
    ["", `领取资料：${lead}`],
    ["", `抽奖机制：${lottery}`],
    ["", `直播间专属福利：${benefit}`],
    ["", `承接路径：评论区回复【${keyword}】→ 小助手发送资料 → 引导补充学生情况 → 预约1v1评估 → 顾问承接${config.action}`],
  ];
  const confirmItems = [
    "抽奖奖品规格、数量和领取规则",
    "抽奖执行方式：评论抽取 / 后台抽取 / 小助手截图",
    "直播间福利的具体权益、名额门槛和截止时间",
    "本场产品权益、价格、优惠口径和承接负责人",
    "关键词是否统一，或同时使用【" + keyword + "】【评估】【福利】",
    "嘉宾可公开讲述的学生案例",
    "下一场直播是否需要预约链接或评论区关键词",
  ];

  const html = `
    <h1>${topic}轻量化启动方案</h1>
    <h2>1. 单场直播启动表</h2>
    ${table(["模块", "本场填写"], startRows)}
    <h2>2. 主持人提问设计</h2>
    ${table(["顺序", "问题类型", "主持人提问"], questions)}
    <h2>3. 嘉宾答题卡</h2>
    ${table(["问题", "主答嘉宾", "回答要点"], cards)}
    <h2>4. PPT轻量版结构</h2>
    ${table(["页码", "内容"], pptRows)}
    <h2>5. 主持人口播模块</h2>
    <h3>开场话术</h3>
    <p>大家好，欢迎来到 UKEC 高考后升学规划直播。今天这场主要适合${audience}来看，我们会重点解决一个问题：${topic}</p>
    <p>高考结束后，很多家庭现在还没到真正填志愿的时候，但已经开始纠结：${pain.replaceAll("\n", " ")}。所以今天我们请到${guest}，帮大家把这个问题拆清楚。想领取本场资料的，可以在评论区回复【${keyword}】，领取${lead}。今天直播间也有${benefit}，抽奖安排是：${lottery}。</p>
    <h3>提问串联话术</h3>
    <p>刚刚${hostGuest}讲到了一个很关键的点，就是不能只看分数，还要看孩子本身的特点。那我想继续追问一下，很多家长可能会说：孩子自己也不确定方向，这种情况下还能判断吗？这个问题能不能请${hostGuest}再具体讲一下？</p>
    <h3>钩子领取话术</h3>
    <p>刚刚这部分内容，其实很多高考后家庭都会遇到。我们也把它整理成了【${lead}】。大家可以在评论区回复【${keyword}】，小助手会把领取方式发给大家。如果你不确定孩子适合哪条路径，也可以顺便预约一次1v1评估。</p>
    <h3>抽奖话术</h3>
    <p>提醒一下大家，今天直播间的抽奖安排是：${lottery}。大家可以在评论区留言【${keyword}】或者直接留下你现在最纠结的问题，我们稍后会抽取。中奖后请及时联系小助手登记信息。</p>
    <h3>福利话术</h3>
    <p>今天直播间也有高考后专属福利：${benefit}。这个福利适合正在纠结专业方向、志愿选择、本科路径，或者家长和孩子意见不一致的家庭。想了解的家长可以在评论区回复【福利】或【评估】，小助手会帮大家登记。</p>
    <h3>结尾话术</h3>
    <p>今天这场直播，我们不是让大家马上做决定，而是先把【${topic}】这个问题看清楚。高考后这个阶段，最重要的是先判断孩子有哪些路径，适合什么方向，接下来哪一步最急。</p>
    <p>想领取资料的，可以继续回复【${keyword}】。想让老师帮你做一次1v1判断的，可以回复【评估】。想了解直播间专属福利的，可以回复【福利】。我们下一场直播是：${next}，也欢迎大家预约观看。</p>
    <h2>6. 小助手承接话术</h2>
    <h3>关键词【${keyword}】资料领取</h3>
    <p>收到～这是本场直播提到的【${lead}】。</p>
    <p>为了方便老师给你匹配更适合的方案，可以先补充这几个信息：<br>1. 学生是今年高考生吗？<br>2. 预计分数区间大概是多少？<br>3. 英语基础怎么样？<br>4. 目前更关注专业方向、国内志愿，还是海外本科路径？<br>5. 是否需要老师帮你做一次1v1评估？</p>
    <p>补充后我们可以安排老师对接。</p>
    <h3>评估承接</h3>
    <p>可以的，这类情况建议先做一次1v1评估。评估不是让你马上做决定，主要是帮你把孩子的成绩、英语、预算、专业方向和可选路径放在一起看清楚。看完之后，再判断适合哪条升学路径。我这边先帮你登记，后续会有老师联系你。</p>
    <h3>福利承接</h3>
    <p>本场直播间专属福利为【${benefit}】。适合正在纠结专业方向、志愿选择、高考后路径规划，或者家长和孩子意见不一致的家庭。具体名额和使用规则以老师确认结果为准。你可以先补充一下学生情况，我帮你看看是否适用。</p>
    <h3>抽奖中奖承接</h3>
    <p>恭喜你获得本场直播抽奖福利。请补充姓名、联系方式和领取信息，我们会安排后续登记。也可以顺便告诉我学生目前的高考情况，老师可以一起帮你看看后续方向。</p>
    <h2>7. 待业务确认事项</h2>
    <ul>${confirmItems.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;

  const markdown = [
    `# ${topic}轻量化启动方案`,
    "## 1. 单场直播启动表",
    mdTable(["模块", "本场填写"], startRows.map((row) => row.map(htmlToPlain))),
    "## 2. 主持人提问设计",
    mdTable(["顺序", "问题类型", "主持人提问"], questions),
    "## 3. 嘉宾答题卡",
    mdTable(["问题", "主答嘉宾", "回答要点"], cards.map((row) => row.map(htmlToPlain))),
    "## 4. PPT轻量版结构",
    mdTable(["页码", "内容"], pptRows.map((row) => row.map(htmlToPlain))),
    "## 5. 主持人口播模块",
    "### 开场话术",
    `大家好，欢迎来到 UKEC 高考后升学规划直播。今天这场主要适合${audience}来看，我们会重点解决一个问题：${topic}`,
    `高考结束后，很多家庭现在还没到真正填志愿的时候，但已经开始纠结：${pain.replaceAll("\n", " ")}。所以今天我们请到${guest}，帮大家把这个问题拆清楚。想领取本场资料的，可以在评论区回复【${keyword}】，领取${lead}。今天直播间也有${benefit}，抽奖安排是：${lottery}。`,
    "### 提问串联话术",
    `刚刚${hostGuest}讲到了一个很关键的点，就是不能只看分数，还要看孩子本身的特点。那我想继续追问一下，很多家长可能会说：孩子自己也不确定方向，这种情况下还能判断吗？这个问题能不能请${hostGuest}再具体讲一下？`,
    "### 钩子领取话术",
    `刚刚这部分内容，其实很多高考后家庭都会遇到。我们也把它整理成了【${lead}】。大家可以在评论区回复【${keyword}】，小助手会把领取方式发给大家。如果你不确定孩子适合哪条路径，也可以顺便预约一次1v1评估。`,
    "### 抽奖话术",
    `提醒一下大家，今天直播间的抽奖安排是：${lottery}。大家可以在评论区留言【${keyword}】或者直接留下你现在最纠结的问题，我们稍后会抽取。中奖后请及时联系小助手登记信息。`,
    "### 福利话术",
    `今天直播间也有高考后专属福利：${benefit}。这个福利适合正在纠结专业方向、志愿选择、本科路径，或者家长和孩子意见不一致的家庭。想了解的家长可以在评论区回复【福利】或【评估】，小助手会帮大家登记。`,
    "### 结尾话术",
    `今天这场直播，我们不是让大家马上做决定，而是先把【${topic}】这个问题看清楚。高考后这个阶段，最重要的是先判断孩子有哪些路径，适合什么方向，接下来哪一步最急。`,
    `想领取资料的，可以继续回复【${keyword}】。想让老师帮你做一次1v1判断的，可以回复【评估】。想了解直播间专属福利的，可以回复【福利】。我们下一场直播是：${next}，也欢迎大家预约观看。`,
    "## 6. 小助手承接话术",
    `### 关键词【${keyword}】资料领取`,
    `收到～这是本场直播提到的【${lead}】。\n\n为了方便老师给你匹配更适合的方案，可以先补充这几个信息：\n\n1. 学生是今年高考生吗？\n2. 预计分数区间大概是多少？\n3. 英语基础怎么样？\n4. 目前更关注专业方向、国内志愿，还是海外本科路径？\n5. 是否需要老师帮你做一次1v1评估？\n\n补充后我们可以安排老师对接。`,
    "### 评估承接",
    "可以的，这类情况建议先做一次1v1评估。评估不是让你马上做决定，主要是帮你把孩子的成绩、英语、预算、专业方向和可选路径放在一起看清楚。看完之后，再判断适合哪条升学路径。我这边先帮你登记，后续会有老师联系你。",
    "### 福利承接",
    `本场直播间专属福利为【${benefit}】。适合正在纠结专业方向、志愿选择、高考后路径规划，或者家长和孩子意见不一致的家庭。具体名额和使用规则以老师确认结果为准。你可以先补充一下学生情况，我帮你看看是否适用。`,
    "### 抽奖中奖承接",
    "恭喜你获得本场直播抽奖福利。请补充姓名、联系方式和领取信息，我们会安排后续登记。也可以顺便告诉我学生目前的高考情况，老师可以一起帮你看看后续方向。",
    "## 7. 待业务确认事项",
    confirmItems.map((item) => `- ${item}`).join("\n"),
  ].join("\n\n");

  return { html, markdown, config };
}

function saveHistory(data, markdown) {
  const history = getHistory();
  history.unshift({
    id: Date.now(),
    topic: clean(data.topic, "未命名场次"),
    time: clean(data.time, "时间待确认"),
    data,
    markdown,
  });
  localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 8)));
  renderHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    historyList.innerHTML = '<p class="muted">还没有历史场次。</p>';
    return;
  }
  historyList.innerHTML = history
    .map(
      (item) => `
      <div class="history-item">
        <strong title="${item.topic}">${item.topic}</strong>
        <span>${item.time}</span>
        <div class="history-buttons">
          <button class="secondary compact" type="button" data-load="${item.id}">复用</button>
          <button class="secondary compact" type="button" data-copy="${item.id}">复制</button>
        </div>
      </div>
    `,
    )
    .join("");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let tableBuffer = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  const flushTable = () => {
    if (!tableBuffer.length) return;
    const rows = tableBuffer
      .filter((line) => !/^\|\s*-+/.test(line))
      .map((line) =>
        line
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => cell.trim()),
      );
    if (rows.length) {
      const [head, ...body] = rows;
      html.push(
        `<table><thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell).replaceAll("&lt;br&gt;", "<br>")}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
    }
    tableBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      flushParagraph();
      flushList();
      tableBuffer.push(line);
      return;
    }
    flushTable();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      return;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      return;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    paragraph.push(line);
  });

  flushTable();
  flushParagraph();
  flushList();
  return html.join("");
}

async function copyText(text) {
  if (!text) return showToast("请先生成方案");
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制");
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    showToast("已复制");
  }
}

function renderPlan(data, plan) {
  result.innerHTML = plan.html;
  latestMarkdown = plan.markdown;
  latestData = data;
  result.hidden = false;
  emptyState.hidden = true;
  typeBadge.textContent = data.targetType && data.targetType !== "auto" ? `已选择：${plan.config.name}` : `自动识别：${plan.config.name}`;
  saveHistory(data, latestMarkdown);
}

async function generateWithAI() {
  const data = getData();
  const config = inferType(data);
  const apiConfig = getApiConfig();
  generateAIButton.disabled = true;
  generateAIButton.textContent = "AI生成中";
  try {
    let markdown = "";
    if (apiConfig.apiKey) {
      const response = await fetch(joinUrl(apiConfig.baseUrl, "/chat/completions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: buildChatMessages(data, config),
          temperature: 0.7,
          max_tokens: 6000,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || payload.error || "AI生成失败");
      markdown = extractResponseText(payload);
    } else {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, type: config.name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI生成失败");
      markdown = payload.markdown;
    }
    if (!markdown) throw new Error("AI没有返回可用内容");
    renderPlan(data, {
      markdown,
      html: markdownToHtml(markdown),
      config,
    });
    showToast("AI方案已生成");
  } catch (error) {
    showToast(error.message || "AI生成失败，请检查 API 配置");
  } finally {
    generateAIButton.disabled = false;
    generateAIButton.textContent = "AI生成";
  }
}

async function downloadPpt() {
  if (!latestMarkdown || !latestData) return showToast("请先生成方案");
  downloadPptButton.disabled = true;
  downloadPptButton.textContent = "生成中";
  try {
    const response = await fetch("/api/ppt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: latestData, markdown: latestMarkdown }),
    });
    if (!response.ok) {
      let message = "PPT生成失败";
      try {
        const payload = await response.json();
        message = payload.error || message;
      } catch {}
      throw new Error(message);
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${clean(latestData.topic, "直播轻量化启动方案").replace(/[\\/:*?"<>|]/g, "-")}.pptx`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("PPT已生成");
  } catch (error) {
    showToast(error.message || "PPT生成失败，请确认后端已启动");
  } finally {
    downloadPptButton.disabled = false;
    downloadPptButton.textContent = "生成 PPT";
  }
}

form.addEventListener("input", updateBadge);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = getData();
  const plan = generate(data);
  renderPlan(data, plan);
});

document.querySelector("#loadSample").addEventListener("click", () => fillForm(sample));
document.querySelector("#clearForm").addEventListener("click", () => {
  form.reset();
  updateBadge();
});
document.querySelector("#copyMarkdown").addEventListener("click", () => copyText(latestMarkdown));
generateAIButton.addEventListener("click", generateWithAI);
downloadPptButton.addEventListener("click", downloadPpt);
apiProviderInput.addEventListener("change", applyProviderPreset);
saveApiConfigButton.addEventListener("click", saveApiConfig);
clearApiConfigButton.addEventListener("click", clearApiConfig);
document.querySelector("#printPlan").addEventListener("click", () => window.print());
document.querySelector("#downloadMarkdown").addEventListener("click", () => {
  if (!latestMarkdown) return showToast("请先生成方案");
  const blob = new Blob([latestMarkdown], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "直播轻量化启动方案.md";
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#reuseLast").addEventListener("click", () => {
  const [last] = getHistory();
  if (!last) return showToast("还没有上一场");
  fillForm(last.data);
  showToast("已填入上一场");
});

document.querySelector("#clearHistory").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  renderHistory();
  showToast("历史已清除");
});

historyList.addEventListener("click", (event) => {
  const loadId = event.target.dataset.load;
  const copyId = event.target.dataset.copy;
  if (!loadId && !copyId) return;
  const item = getHistory().find((entry) => String(entry.id) === String(loadId || copyId));
  if (!item) return;
  if (loadId) {
    fillForm(item.data);
    showToast("已填入历史场次");
  }
  if (copyId) copyText(item.markdown);
});

fillForm(sample);
updateApiConfigView();
renderHistory();
