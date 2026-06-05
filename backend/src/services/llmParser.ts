/**
 * DeepSeek LLM 解析器
 *
 * 接 DeepSeek chat completions（OpenAI 兼容协议），把自然语言解析成 5 维度。
 *
 * 设计：
 *   - 没配 KEY → 直接返回 null（compose 用关键词字典 fallback）
 *   - 网络/超时/格式错 → 返回 null（同上 fallback，绝不抛）
 *   - 返回的字段必须经 zod 严校验；多/少/类型错都算 null
 *
 * 提示词约束：
 *   - 品类/品牌优先从给定列表里选（让 LLM 知道哪些是真品类）
 *   - 但允许 LLM 在用户明确写出列表外品类时也返回（兜底）
 *   - 风格/场景/功能完全自由
 */
import { z } from 'zod';
import { config } from '../config.js';
import type { ParsedIntent } from './composer.js';

const llmResponseSchema = z.object({
  categories: z.array(z.string().min(1).max(40)).max(5).default([]),
  brands: z.array(z.string().min(1).max(40)).max(5).default([]),
  userScenes: z.array(z.string().min(1).max(40)).max(8).default([]),
  functions: z.array(z.string().min(1).max(40)).max(10).default([]),
  styles: z.array(z.string().min(1).max(40)).max(5).default([]),
});

function buildPrompt(text: string, allCategories: string[], allBrands: string[]): {
  system: string;
  user: string;
} {
  // 全量品类太长（77 个）→ 简化提示词只给名字；品牌 9 个全给
  const categoryHint = allCategories.slice(0, 60).join('、');
  const brandHint = allBrands.join('、');

  const system = `你是淘玛特"产品组合器"的语义解析器。
任务：把用户的自然语言产品描述解析成 5 个维度，方便后续匹配模块和资产对照。

【输出格式】
必须返回纯 JSON，5 个字段，键名固定如下：
{
  "categories": string[],   // 品类（从给定列表里选，按相关性排序，0-3 个）
  "brands":     string[],   // 品牌（用户明说的；不要瞎猜，0-3 个）
  "userScenes": string[],   // 用户场景（如 户外运动 / 居家睡眠 / 通勤 / 高强度训练 / 康复修复 / 球类运动 / 瑜伽普拉提 / 冷热环境 等，0-5 个）
  "functions":  string[],   // 功能感受（如 舒适 / 包裹性 / 支撑 / 防滑 / 透气 / 保暖 / 助眠 / 加压 / 减震 / 抗菌防臭 / 弹性 / 轻量 等，0-8 个）
  "styles":     string[]    // 风格调性（如 运动专业 / 极简 / 医疗感 / 国潮 / 时尚 / 户外硬核 / 少女 / 高端 等，0-3 个）
}

【规则】
1. 品类优先从【可选品类】里挑；如果用户明确写出列表外品类（如新品类），可以返回原词。
2. 品牌只返回用户明确写的；没写就空数组。不要根据风格反推品牌。
3. 同一维度可以多值（如"户外、训练"两个场景都返回）。
4. 不要解释、不要 markdown 包装、不要 \`\`\`，只输出 JSON 对象本身。
5. 不确定 = 空数组，绝对不能编造。

【可选品类】${categoryHint}
【可选品牌】${brandHint}`;

  const user = `请解析这段产品描述：\n${text}`;

  return { system, user };
}

export async function parseIntentWithLLM(
  text: string,
  allCategories: string[],
  allBrands: string[],
): Promise<ParsedIntent | null> {
  if (!config.deepseek.apiKey) return null;
  const { system, user } = buildPrompt(text, allCategories, allBrands);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.deepseek.timeoutMs);
  try {
    const res = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseek.apiKey}`,
      },
      body: JSON.stringify({
        model: config.deepseek.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[llmParser] HTTP ${res.status}, fallback to keyword`);
      return null;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[llmParser] empty content, fallback');
      return null;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      console.warn('[llmParser] not valid JSON, fallback. content=', content.slice(0, 200));
      return null;
    }
    const parsed = llmResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('[llmParser] schema invalid, fallback:', parsed.error.issues);
      return null;
    }
    return {
      categories: parsed.data.categories,
      brands: parsed.data.brands,
      userScenes: parsed.data.userScenes,
      functions: parsed.data.functions,
      styles: parsed.data.styles,
      rawText: text,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[llmParser] error: ${msg}, fallback`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
