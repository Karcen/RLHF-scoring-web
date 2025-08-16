import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileUp, Image as ImageIcon, BarChart3, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

/**
 * RLHF 多轮图文数据集打分网页
 * 说明：
 * - 支持从 JSON 文件加载语料（多轮图文对话），图片位于 public/Figures 或同级 Figures 目录（相对路径即可）。
 * - 两类评分：
 *   1) 无极分数滚动（continuous）：[-1, 100]，-1 表示有害（harmful）。
 *   2) 单选（categorical）：{-1, 0, 1, 2, 3}。
 * - 维度（criteria）：评判标准1~4，支持“整体（overall）”与“逐轮（per-turn）”。
 * - 本地持久化：localStorage。
 * - 可视化：Recharts 展示分布与极值统计。
 * - 一键导出：JSON 结果与 Markdown 报告。
 *
 * 期望 JSON 数据格式（示例）：
 * [
 *   {
 *     "id": "sample-001",
 *     "meta": {"source": "xxx", "notes": "optional"},
 *     "rounds": [
 *       {"user": "问题1", "assistant": "回答1", "image": "Figures/img_001.png"},
 *       {"user": "问题2", "assistant": "回答2", "image": "Figures/img_001_b.png"}
 *     ]
 *   },
 *   ...
 * ]
 */

// ---- 类型定义 ----
const CRITERIA = [
  { key: "c1", label: "评判标准1" },
  { key: "c2", label: "评判标准2" },
  { key: "c3", label: "评判标准3" },
  { key: "c4", label: "评判标准4" },
] as const;

const CATEGORICAL_OPTIONS = [-1, 0, 1, 2, 3] as const; // -1 harmful
const CONTINUOUS_MIN = -1;
const CONTINUOUS_MAX = 100;

// localStorage keys
const LS_DATASET_KEY = "rlhf_dataset_cache_v1";
const LS_SCORES_KEY = "rlhf_scores_cache_v1";

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// ---- 主组件 ----
export default function RLHFScoringApp() {
  const [dataset, setDataset] = useState([]); // 原始样本数组
  const [idx, setIdx] = useState(0); // 当前样本索引
  const [scores, setScores] = useState({}); // { [sampleId]: { overall: {type, criteria: {...}}, turns: { [t]: {type, criteria: {...}} } } }
  const [scoreTypeOverall, setScoreTypeOverall] = useState("continuous"); // or "categorical"
  const [scoreTypeTurn, setScoreTypeTurn] = useState("continuous");
  const [showImages, setShowImages] = useState(true);
  const fileInputRef = useRef(null);

  // 启动时尝试恢复缓存
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem(LS_DATASET_KEY);
      const cachedScores = localStorage.getItem(LS_SCORES_KEY);
      if (cachedData) setDataset(JSON.parse(cachedData));
      if (cachedScores) setScores(JSON.parse(cachedScores));
    } catch (e) { console.warn("restore cache error", e); }
  }, []);

  // 每次评分更新都持久化
  useEffect(() => {
    try { localStorage.setItem(LS_SCORES_KEY, JSON.stringify(scores)); } catch {}
  }, [scores]);

  // 每次数据集更新都持久化 & 重置索引
  useEffect(() => {
    try { localStorage.setItem(LS_DATASET_KEY, JSON.stringify(dataset)); } catch {}
    setIdx(0);
  }, [dataset]);

  const current = dataset[idx];
  const total = dataset.length;

  // 工具：获取与写入评分
  const getSampleScores = (sampleId) => scores[sampleId] || { overall: { type: scoreTypeOverall, criteria: {} }, turns: {} };

  const writeScore = (sampleId, scope, key, value, turnIndex = null) => {
    setScores(prev => {
      const next = { ...prev };
      if (!next[sampleId]) next[sampleId] = { overall: { type: scoreTypeOverall, criteria: {} }, turns: {} };
      if (scope === "overall") {
        next[sampleId].overall.type = scoreTypeOverall;
        next[sampleId].overall.criteria = { ...next[sampleId].overall.criteria, [key]: value };
      } else {
        if (!next[sampleId].turns[turnIndex]) next[sampleId].turns[turnIndex] = { type: scoreTypeTurn, criteria: {} };
        next[sampleId].turns[turnIndex].type = scoreTypeTurn;
        next[sampleId].turns[turnIndex].criteria = { ...next[sampleId].turns[turnIndex].criteria, [key]: value };
      }
      return next;
    });
  };

  const resetScoresForSample = (sampleId) => {
    setScores(prev => {
      const next = { ...prev };
      delete next[sampleId];
      return next;
    });
  };

  // 导出 JSON
  const exportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      config: {
        criteria: CRITERIA.map(c => c.key),
        categoricalOptions: [...CATEGORICAL_OPTIONS],
        continuousRange: [CONTINUOUS_MIN, CONTINUOUS_MAX],
        scoreTypeOverall,
        scoreTypeTurn,
      },
      data: dataset.map((s) => ({
        id: s.id ?? String(s._idx ?? 0),
        meta: s.meta || null,
        turns: s.rounds?.length ?? 0,
        scores: scores[s.id ?? String(s._idx ?? 0)] || null,
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rlhf_scores_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出 Markdown 报告（包含总体统计与图例说明）
  const exportReport = () => {
    const stats = computeStats(dataset, scores);
    const md = `# RLHF 打分报告\n\n` +
`导出时间：${new Date().toISOString()}\n\n` +
`样本量：${dataset.length}\n\n` +
`## 评分配置\n- Overall 评分类型：${scoreTypeOverall}\n- Turn 评分类型：${scoreTypeTurn}\n- 连续区间：[${CONTINUOUS_MIN}, ${CONTINUOUS_MAX}]\n- 单选选项：${CATEGORICAL_OPTIONS.join(', ')}\n\n` +
`## 统计摘要\n` +
CRITERIA.map(c => {
  const s = stats.overall[c.key];
  const t = stats.turn[c.key];
  return `### ${c.label}\n- Overall 连续均值：${fmt(s.continuous.mean)} (n=${s.continuous.n})\n- Overall 连续中位数：${fmt(s.continuous.median)}\n- Overall 单选众数：${s.categorical.mode ?? 'NA'}\n- Per-turn 连续均值：${fmt(t.continuous.mean)} (n=${t.continuous.n})\n- Per-turn 单选众数：${t.categorical.mode ?? 'NA'}\n`;
}).join("\n") +
`\n> 注：-1 表示回答有害（harmful）。`;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rlhf_report_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 统计（用于可视化）
  const stats = useMemo(() => computeStats(dataset, scores), [dataset, scores]);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">RLHF 多轮图文数据集打分面板</h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="w-4 h-4 mr-2" />加载 JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => handleLoadJSON(e, setDataset)}
            />
            <Button variant="outline" onClick={() => setShowImages(v => !v)}>
              <ImageIcon className="w-4 h-4 mr-2" />{showImages ? "隐藏图片" : "显示图片"}
            </Button>
            <Button onClick={exportJSON}>
              <Download className="w-4 h-4 mr-2" />导出 JSON 结果
            </Button>
            <Button variant="outline" onClick={exportReport}>
              <BarChart3 className="w-4 h-4 mr-2" />导出报告 (Markdown)
            </Button>
          </div>
        </header>

        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div>
                样本导航
                <span className="text-sm text-gray-500 ml-2">{total ? `${idx + 1} / ${total}` : "未加载"}</span>
                {current?.id && <span className="text-sm text-gray-500 ml-2">ID: {current.id}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIdx(i => clamp(i - 1, 0, Math.max(0, total - 1)))} disabled={!total || idx === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" />上一条
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIdx(i => clamp(i + 1, 0, Math.max(0, total - 1)))} disabled={!total || idx === total - 1}>
                  下一条<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => current && resetScoresForSample(current.id ?? String(current._idx ?? idx))} disabled={!current}>
                  <RotateCcw className="w-4 h-4 mr-1" />清空本条评分
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <DialogueViewer sample={current} showImages={showImages} />
              </div>
              <div className="space-y-4">
                <ScoringPanel
                  sample={current}
                  scoreTypeOverall={scoreTypeOverall}
                  setScoreTypeOverall={setScoreTypeOverall}
                  scoreTypeTurn={scoreTypeTurn}
                  setScoreTypeTurn={setScoreTypeTurn}
                  scores={scores}
                  writeScore={writeScore}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>统计与可视化</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatBlock title="完成度 (已评分样本数/总数)" value={`${stats.completedSamples} / ${total}`} />
              <StatBlock title="潜在有害 (-1) 比例 (overall 或 turn 任一维度)" value={`${fmtPct(stats.harmfulRate * 100)}%`} />
            </div>

            <Tabs defaultValue="overall-categorical">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                <TabsTrigger value="overall-categorical">Overall 单选分布</TabsTrigger>
                <TabsTrigger value="turn-categorical">Per-turn 单选分布</TabsTrigger>
                <TabsTrigger value="overall-continuous">Overall 连续分布</TabsTrigger>
                <TabsTrigger value="turn-continuous">Per-turn 连续分布</TabsTrigger>
              </TabsList>

              <TabsContent value="overall-categorical" className="pt-4">
                <CriteriaCharts type="categorical" scope="overall" stats={stats} />
              </TabsContent>
              <TabsContent value="turn-categorical" className="pt-4">
                <CriteriaCharts type="categorical" scope="turn" stats={stats} />
              </TabsContent>
              <TabsContent value="overall-continuous" className="pt-4">
                <CriteriaCharts type="continuous" scope="overall" stats={stats} />
              </TabsContent>
              <TabsContent value="turn-continuous" className="pt-4">
                <CriteriaCharts type="continuous" scope="turn" stats={stats} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DialogueViewer({ sample, showImages }: { sample: any, showImages: boolean }) {
  if (!sample) return (
    <Card className="h-full"><CardContent className="py-10 text-center text-gray-500">请先加载 JSON 数据集</CardContent></Card>
  );
  return (
    <div className="space-y-3">
      {sample?.rounds?.map((r: any, i: number) => (
        <Card key={i} className="border border-gray-200">
          <CardHeader className="pb-2"><CardTitle className="text-base">Round {i + 1}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-white rounded-2xl shadow-sm p-3">
              <div className="text-xs font-semibold text-gray-500 mb-1">USER</div>
              <div className="whitespace-pre-wrap leading-relaxed">{r.user}</div>
            </div>
            {showImages && r.image && (
              <div className="rounded-2xl overflow-hidden bg-gray-100 border">
                {/* 允许相对路径，如 "Figures/xxx.png" */}
                {/* 若放置于 Next.js public/ 目录，路径以 "/Figures/xxx.png" 开头 */}
                <img src={r.image} alt={`round-${i}-image`} className="w-full h-auto" />
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm p-3">
              <div className="text-xs font-semibold text-gray-500 mb-1">ASSISTANT</div>
              <div className="whitespace-pre-wrap leading-relaxed">{r.assistant}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScoringPanel({ sample, scoreTypeOverall, setScoreTypeOverall, scoreTypeTurn, setScoreTypeTurn, scores, writeScore }) {
  if (!sample) return null;
  const sampleId = sample.id ?? String(sample._idx ?? 0);
  const sampleScores = scores[sampleId] || { overall: { type: scoreTypeOverall, criteria: {} }, turns: {} };

  return (
    <div className="space-y-4">
      <Card className="border-green-200">
        <CardHeader className="pb-2"><CardTitle className="text-lg">整体评分 (Overall)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ScoreTypeSelector label="评分类型" value={scoreTypeOverall} onChange={setScoreTypeOverall} />
          {CRITERIA.map((c) => (
            <CriterionInput
              key={c.key}
              label={c.label}
              type={scoreTypeOverall}
              value={(sampleScores.overall.criteria || {})[c.key]}
              onChange={(v) => writeScore(sampleId, "overall", c.key, v)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-lg">逐轮评分 (Per-turn)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ScoreTypeSelector label="评分类型" value={scoreTypeTurn} onChange={setScoreTypeTurn} />
          <div className="space-y-3">
            {sample.rounds?.map((_, tIdx) => (
              <div key={tIdx} className="rounded-2xl border p-3">
                <div className="font-semibold mb-2">Round {tIdx + 1}</div>
                {CRITERIA.map((c) => (
                  <CriterionInput
                    key={`${tIdx}-${c.key}`}
                    label={c.label}
                    type={scoreTypeTurn}
                    value={(sampleScores.turns?.[tIdx]?.criteria || {})[c.key]}
                    onChange={(v) => writeScore(sampleId, "turn", c.key, v, tIdx)}
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreTypeSelector({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-sm text-gray-600 w-20">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40"><SelectValue placeholder="选择类型" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="continuous">连续 [-1, 100]</SelectItem>
          <SelectItem value="categorical">单选 {-1,0,1,2,3}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function CriterionInput({ label, type, value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2 p-2 rounded-xl bg-gray-50">
      <Label className="text-sm">{label}</Label>
      {type === "continuous" ? (
        <div className="space-y-2">
          <Slider
            min={CONTINUOUS_MIN}
            max={CONTINUOUS_MAX}
            step={1}
            value={[typeof value === "number" ? value : 0]}
            onValueChange={(v) => onChange(clamp(v[0], CONTINUOUS_MIN, CONTINUOUS_MAX))}
          />
          <div className="text-xs text-gray-600">数值：{value ?? "(未设置)"}（-1 = 有害）</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {CATEGORICAL_OPTIONS.map((opt) => (
            <label key={opt} className={`cursor-pointer px-3 py-1 rounded-full border ${value === opt ? "bg-gray-900 text-white" : "bg-white"}`}
              onClick={() => onChange(opt)}>
              {opt}
            </label>
          ))}
          <div className="text-xs text-gray-600 w-full">-1 = 有害；0~3 = 质量等级</div>
        </div>
      )}
    </div>
  );
}

function StatBlock({ title, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function CriteriaCharts({ type, scope, stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {CRITERIA.map(c => (
        <div key={`${scope}-${type}-${c.key}`} className="rounded-2xl border bg-white p-4">
          <div className="font-semibold mb-2">{c.label}</div>
          {type === "categorical" ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={toBarData(stats[scope][c.key].categorical.counts)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={toLineData(stats[scope][c.key].continuous.hist)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- 工具函数：统计学 ----
function computeStats(dataset, scores) {
  const res = {
    completedSamples: 0,
    harmfulRate: 0,
    overall: {},
    turn: {},
  };
  for (const c of CRITERIA) {
    res.overall[c.key] = emptyCritStats();
    res.turn[c.key] = emptyCritStats();
  }

  let harmfulCount = 0;
  let harmfulDen = 0;

  dataset.forEach((s, i) => {
    const id = s.id ?? String(s._idx ?? i);
    const sc = scores[id];
    if (!sc) return;
    res.completedSamples += 1;

    // overall
    for (const c of CRITERIA) {
      const v = sc.overall?.criteria?.[c.key];
      if (typeof v !== "undefined") addValue(res.overall[c.key], v, sc.overall?.type);
      if (v === -1) harmfulCount += 1;
      harmfulDen += 1;
    }

    // per-turn
    (s.rounds || []).forEach((_, t) => {
      const vset = sc.turns?.[t]?.criteria || {};
      for (const c of CRITERIA) {
        const v = vset[c.key];
        if (typeof v !== "undefined") addValue(res.turn[c.key], v, sc.turns?.[t]?.type);
        if (v === -1) harmfulCount += 1;
        harmfulDen += 1;
      }
    });
  });

  res.harmfulRate = harmfulDen ? harmfulCount / harmfulDen : 0;

  // 计算均值/中位数/众数
  for (const scope of ["overall", "turn"]) {
    for (const c of CRITERIA) finalizeStats(res[scope][c.key]);
  }

  return res;
}

function emptyCritStats() {
  return {
    continuous: { values: [], hist: [], mean: NaN, median: NaN, n: 0 },
    categorical: { counts: new Map(), mode: null },
  };
}

function addValue(stat, value, type) {
  if (type === "continuous") {
    stat.continuous.values.push(Number(value));
  } else if (type === "categorical") {
    const k = String(value);
    stat.categorical.counts.set(k, (stat.categorical.counts.get(k) || 0) + 1);
  } else {
    // 兼容：未知类型时尝试判断
    if (typeof value === "number" && Number.isInteger(value) && [-1,0,1,2,3].includes(value)) {
      const k = String(value);
      stat.categorical.counts.set(k, (stat.categorical.counts.get(k) || 0) + 1);
    } else {
      stat.continuous.values.push(Number(value));
    }
  }
}

function finalizeStats(stat) {
  // continuous
  const vals = stat.continuous.values.slice().filter(v => Number.isFinite(v));
  vals.sort((a,b) => a-b);
  stat.continuous.n = vals.length;
  stat.continuous.mean = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : NaN;
  stat.continuous.median = vals.length ? (vals.length%2? vals[(vals.length-1)/2] : (vals[vals.length/2-1]+vals[vals.length/2])/2) : NaN;
  stat.continuous.hist = binContinuous(vals, CONTINUOUS_MIN, CONTINUOUS_MAX, 20);

  // categorical mode
  let best = null, bestC = -1;
  for (const [k,v] of stat.categorical.counts.entries()) {
    if (v > bestC) { best = k; bestC = v; }
  }
  stat.categorical.mode = best !== null ? Number(best) : null;
}

function binContinuous(values, min, max, bins) {
  if (!values.length) return [];
  const step = (max - min) / bins;
  const arr = new Array(bins).fill(0);
  for (const v of values) {
    let b = Math.floor((v - min) / step);
    if (b < 0) b = 0; if (b >= bins) b = bins - 1;
    arr[b] += 1;
  }
  return arr.map((count, i) => ({ name: `${Math.round(min + i*step)}`, value: count }));
}

function toBarData(map) {
  const order = [-1,0,1,2,3].map(String);
  return order.map(k => ({ name: k, value: map.get(k) || 0 }));
}

function toLineData(arr) { return arr; }

function fmt(x) { return Number.isFinite(x) ? x.toFixed(2) : "NA"; }
function fmtPct(x) { return Number.isFinite(x) ? x.toFixed(1) : "NA"; }

// ---- 文件加载 ----
async function handleLoadJSON(e, setDataset) {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  let data = [];
  try {
    data = JSON.parse(text);
  } catch (err) {
    alert("JSON 解析失败，请检查文件格式。");
    return;
  }
  if (!Array.isArray(data)) {
    alert("顶层应为数组[ ... ]");
    return;
  }
  // 补充 _idx，方便作为回退 ID
  data = data.map((d, i) => ({ ...d, _idx: i }));
  setDataset(data);
}
