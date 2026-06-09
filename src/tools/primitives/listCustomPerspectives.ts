import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface ListCustomPerspectivesOptions {
  format?: 'simple' | 'detailed';
}

export interface CustomPerspectiveInfo {
  name: string;
  identifier: string;
}

export interface ListCustomPerspectivesResult {
  success: boolean;
  perspectives: CustomPerspectiveInfo[];
  count: number;
  formatted: string;
  error?: string;
}

export async function listCustomPerspectives(options: ListCustomPerspectivesOptions = {}): Promise<ListCustomPerspectivesResult> {
  const { format = 'simple' } = options;

  try {
    const result = await executeOmniFocusScript('@listCustomPerspectives.js', {});

    let data: any;

    if (typeof result === 'string') {
      try {
        data = JSON.parse(result);
      } catch (parseError) {
        throw new Error(`解析字符串结果失败: ${result}`);
      }
    } else if (typeof result === 'object' && result !== null) {
      data = result;
    } else {
      throw new Error(`脚本执行返回了无效的结果类型: ${typeof result}, 值: ${result}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error occurred');
    }

    const perspectives: CustomPerspectiveInfo[] = (data.perspectives || []).map((p: any) => ({
      name: p.name,
      identifier: p.identifier
    }));
    const count = data.count ?? perspectives.length;

    let formatted: string;
    if (count === 0) {
      formatted = "📋 **自定义透视列表**\n\n暂无自定义透视。";
    } else if (format === 'simple') {
      const lines = perspectives.map((p, index) => `${index + 1}. ${p.name}`);
      formatted = `📋 **自定义透视列表** (${count}个)\n\n${lines.join('\n')}`;
    } else {
      const lines = perspectives.map((p, index) => `${index + 1}. **${p.name}**\n   🆔 ${p.identifier}`);
      formatted = `📋 **自定义透视列表** (${count}个)\n\n${lines.join('\n\n')}`;
    }

    return { success: true, perspectives, count, formatted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      perspectives: [],
      count: 0,
      formatted: `❌ **错误**: ${message}`,
      error: message
    };
  }
}