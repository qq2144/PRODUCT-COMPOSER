/**
 * 输入润色 - 调 DeepSeek 把粗糙的一句话产品描述改清楚
 *
 * 设计：
 *   - 没配 KEY → 返回 null
 *   - 任何网络/超时/格式错 → 返回 null（路由层会回 503）
 *   - 成功 → 返回纯文本（trim 过）
 */
import { config } from '../config.js';

const SYSTEM_PROMPT = `你是产品想法的润色助手。
任务：把用户的一句话产品描述改得更清晰、更具体，让"品类、场景、功能、风格"等关键信息更明确，方便下游解析。

规则（严格遵守）：
1. 保持原意，不无中生有；不要凭空添加品牌。
2. 输出 1-2 句中文，必须是可以直接放进输入框的产品描述。
3. 严禁 markdown、引号、列表、解释说明、前言后语。
4. 严禁营销词（如"尊享""臻选""绝绝子""yyds""种草"），保持产品描述的中性。
5. 如果原文已经足够清楚，可以只做轻微调整；不要为了改而改。`;

export async function polishWithLLM(text: string): Promise<string | null> {
  if (!config.deepseek.apiKey) return null;

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请润色这句产品描述：\n${text}` },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[polisher] HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    // 清掉常见噪音：首尾引号、markdown 包装
    const cleaned = content
      .trim()
      .replace(/^["'「『]+/, '')
      .replace(/["'」』]+$/, '')
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .trim();
    return cleaned || null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[polisher] error: ${msg}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
