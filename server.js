import "dotenv/config";
import express from "express";
import PptxGenJS from "pptxgenjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 4173);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const typeConfig = [
  {
    name: "天赋志愿场",
    keyword: "天赋",
    lead: "专业方向测评表",
    action: "预约天赋/专业方向评估",
    dimensions: ["兴趣偏好", "能力优势", "性格特质", "价值观", "未来路径"],
  },
  {
    name: "留学路径场",
    keyword: "路径",
    lead: "高考后本科路径图",
    action: "预约本科路径1v1评估",
    dimensions: ["高考成绩", "英语基础", "预算区间", "目标国家", "入学时间"],
  },
  {
    name: "家长决策场",
    keyword: "评估",
    lead: "家长决策清单",
    action: "对接顾问做家庭方案判断",
    dimensions: ["成绩预期", "家庭预算", "孩子意愿", "风险承受", "路径匹配"],
  },
  {
    name: "出分前准备场",
    keyword: "准备",
    lead: "出分前准备清单",
    action: "预约出分前规划",
    dimensions: ["预估分数", "院校区间", "专业方向", "备选路径", "时间节点"],
  },
  {
    name: "出分后补救场",
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

function clean(value, fallback = "【待确认】") {
  return String(value || "").trim() || fallback;
}

function findType(name) {
  return typeConfig.find((item) => item.name === name) || defaultType;
}

function parseQuestions(value) {
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

function fallbackQuestions(data) {
  return [
    `高考刚结束，现在就开始关注「${clean(data.topic, "本场主题")}」，会不会太早？`,
    `很多家长现在最纠结的是「${clean(data.pain, "孩子方向不清楚")}」，这个问题应该先从哪里判断？`,
    "判断孩子适合什么方向，不能只看分数，那具体还要看哪些维度？",
    "如果孩子现在没有明确想法，或者兴趣很多但不确定，家长应该怎么帮他缩小范围？",
    `围绕${clean(data.keyword, "关键词")}和专业选择，家长最容易踩哪些坑？`,
    "有没有真实案例可以参考，说明方向判断清楚后，后续规划会发生什么变化？",
    "家长今天听完以后，今晚第一步最应该做什么？怎么判断要不要做一次1v1评估？",
  ];
}

function getQuestions(data) {
  const custom = parseQuestions(data.hostQuestions);
  return custom.length ? custom : fallbackQuestions(data);
}

function buildPrompt(data, type) {
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
- 目标场次：${type.name}
- 直播时间：${clean(data.time)}
- 直播主题：${clean(data.topic)}
- 面向人群：${clean(data.audience)}
- 嘉宾姓名和身份：${clean(data.guest)}
- 本场核心目的：${clean(data.goal)}
- 用户痛点：${clean(data.pain)}
- 主持人提问：${parseQuestions(data.hostQuestions).join(" / ") || "用户未填写，请按场次自动生成"}
- 主关键词：${clean(data.keyword, type.keyword)}
- 资料钩子：${clean(data.leadMagnet, type.lead)}
- 抽奖机制：${clean(data.lottery)}
- 直播间福利：${clean(data.benefit)}
- 下一场预告：${clean(data.next)}
`;
}

app.post("/api/generate", async (req, res) => {
  try {
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
    if (!apiKey) {
      return res.status(400).json({ error: "还没有配置 LLM_API_KEY，请先在 .env 中填写后重启服务。" });
    }

    const data = req.body?.data || {};
    const type = findType(req.body?.type || data.targetType);
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "你是 UKEC 直播运营方案专家，擅长把高考后升学规划直播压缩成轻量、稳定、可执行的启动包。只输出 Markdown，不要输出解释。",
          },
          { role: "user", content: buildPrompt(data, type) },
        ],
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: payload.error?.message || payload.error || "AI生成失败" });
    }
    const markdown = payload.choices?.[0]?.message?.content?.trim();
    if (!markdown) {
      return res.status(502).json({ error: "AI没有返回可用内容，请稍后重试。" });
    }
    res.json({ markdown });
  } catch (error) {
    res.status(500).json({ error: error.message || "AI生成失败" });
  }
});

function addTitle(slide, title, subtitle = "") {
  slide.background = { color: "F7FAFC" };
  slide.addText(title, {
    x: 0.65,
    y: 0.55,
    w: 8.8,
    h: 0.75,
    fontFace: "Microsoft YaHei",
    fontSize: 26,
    bold: true,
    color: "17324D",
    fit: "shrink",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.68,
      y: 1.32,
      w: 8.8,
      h: 0.38,
      fontFace: "Microsoft YaHei",
      fontSize: 11,
      color: "5E6B7A",
      fit: "shrink",
    });
  }
  slide.addShape("line", { x: 0.68, y: 1.9, w: 8.9, h: 0, line: { color: "2457A6", width: 1.4 } });
}

function addBullets(slide, items, x = 0.75, y = 2.18, w = 8.6, fontSize = 15) {
  const text = items
    .filter(Boolean)
    .slice(0, 9)
    .map((item) => `• ${item}`)
    .join("\n");
  slide.addText(text, {
    x,
    y,
    w,
    h: 4.65,
    fontFace: "Microsoft YaHei",
    fontSize,
    color: "25364A",
    breakLine: false,
    fit: "shrink",
    valign: "top",
    paraSpaceAfterPt: 7,
  });
}

function addPill(slide, text, x, y, w, color = "2457A6") {
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h: 0.5,
    rectRadius: 0.08,
    fill: { color },
    line: { color },
  });
  slide.addText(text, {
    x: x + 0.1,
    y: y + 0.11,
    w: w - 0.2,
    h: 0.2,
    fontFace: "Microsoft YaHei",
    fontSize: 10,
    bold: true,
    color: "FFFFFF",
    align: "center",
    fit: "shrink",
  });
}

app.post("/api/ppt", async (req, res) => {
  try {
    const data = req.body?.data || {};
    const type = findType(data.targetType);
    const topic = clean(data.topic, "直播轻量化启动方案");
    const guest = clean(data.guest, "嘉宾【待确认】");
    const keyword = clean(data.keyword, type.keyword);
    const lead = clean(data.leadMagnet, type.lead);
    const benefit = clean(data.benefit);
    const lottery = clean(data.lottery);
    const next = clean(data.next);
    const questions = getQuestions(data);

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "UKEC Live Launch Assistant";
    pptx.subject = topic;
    pptx.title = topic;
    pptx.company = "UKEC";
    pptx.lang = "zh-CN";
    pptx.theme = {
      headFontFace: "Microsoft YaHei",
      bodyFontFace: "Microsoft YaHei",
      lang: "zh-CN",
    };

    let slide = pptx.addSlide();
    slide.background = { color: "F7FAFC" };
    addPill(slide, type.name, 0.75, 0.62, 1.65, "16725D");
    slide.addText(topic, {
      x: 0.72,
      y: 1.5,
      w: 8.9,
      h: 1.35,
      fontFace: "Microsoft YaHei",
      fontSize: 30,
      bold: true,
      color: "17202A",
      fit: "shrink",
    });
    slide.addText(`嘉宾：${guest}\n直播时间：${clean(data.time)}`, {
      x: 0.76,
      y: 3.18,
      w: 8.4,
      h: 0.8,
      fontFace: "Microsoft YaHei",
      fontSize: 15,
      color: "506070",
      fit: "shrink",
    });
    slide.addShape("rect", { x: 0.74, y: 5.82, w: 8.9, h: 0.08, fill: { color: "2457A6" }, line: { color: "2457A6" } });

    slide = pptx.addSlide();
    addTitle(slide, "今天解决什么", "主持人围绕这些问题推进，嘉宾按结论、标准、案例、行动建议回答");
    addBullets(slide, questions.map((question, index) => `Q${index + 1}：${question}`), 0.75, 2.25, 8.75, 14);

    slide = pptx.addSlide();
    addTitle(slide, "核心判断表", "本页用于帮助用户建立判断框架，不替代最终志愿或签约决策");
    type.dimensions.forEach((dimension, index) => {
      const x = 0.75 + (index % 3) * 3.05;
      const y = 2.25 + Math.floor(index / 3) * 1.25;
      slide.addShape("roundRect", {
        x,
        y,
        w: 2.55,
        h: 0.74,
        rectRadius: 0.07,
        fill: { color: index % 2 ? "E9F5F2" : "EEF4FB" },
        line: { color: index % 2 ? "A7D1C5" : "BFD0E7" },
      });
      slide.addText(dimension, {
        x: x + 0.15,
        y: y + 0.22,
        w: 2.25,
        h: 0.22,
        fontFace: "Microsoft YaHei",
        fontSize: 15,
        bold: true,
        color: "17324D",
        align: "center",
        fit: "shrink",
      });
    });
    addBullets(slide, ["先做孩子画像，再匹配专业和路径", "多个维度一致时优先级更高", "维度冲突时建议进入1v1评估"], 0.85, 4.65, 8.4, 13);

    slide = pptx.addSlide();
    addTitle(slide, "案例 / 误区清单", "案例不足时由业务侧补充可公开版本");
    addBullets(
      slide,
      [
        "热门不等于适合：不要只按热度或薪资选择",
        "分数不等于方向：分数决定范围，方向决定匹配度",
        "家长期待不等于孩子适配：需要结合孩子真实特点判断",
        "案例：【待业务补充案例】建议准备1-2个可公开学生案例",
      ],
      0.75,
      2.25,
      8.65,
      15,
    );

    slide = pptx.addSlide();
    addTitle(slide, "关键词福利页", "统一转化链路：评论区关键词 → 小助手 → 资料领取 → 1v1评估 → 顾问承接");
    addPill(slide, `回复【${keyword}】`, 0.78, 2.25, 2.0, "2457A6");
    addPill(slide, "回复【评估】", 3.0, 2.25, 2.0, "16725D");
    addPill(slide, "回复【福利】", 5.22, 2.25, 2.0, "A76F17");
    addBullets(
      slide,
      [`领取资料：${lead}`, `直播间福利：${benefit}`, `抽奖机制：${lottery}`, `下一场预告：${next}`],
      0.85,
      3.2,
      8.2,
      15,
    );

    const buffer = await pptx.write({ outputType: "nodebuffer" });
    const filename = `${topic.replace(/[\\/:*?"<>|]/g, "-")}.pptx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message || "PPT生成失败" });
  }
});

app.listen(port, () => {
  console.log(`Live Launch Assistant running at http://localhost:${port}`);
});
