import {
  AIProvider,
  AIProviderConfig,
  AIChatOptions,
  AIGenerateOptions,
  AIResponse,
  AITestResult,
  AISearchProtocol,
} from './types';

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = 'OpenAI-Compatible';
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private customHeaders: Record<string, string>;
  private defaultTemperature: number;
  private enableSearch: boolean;
  private searchProtocol: AISearchProtocol;

  constructor(config: AIProviderConfig) {
    // Normalize base URL: remove trailing slash and ensure protocol
    let url = config.baseUrl.trim();
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    this.baseUrl = url;
    this.apiKey = config.apiKey.trim();

    // Model name alias normalization
    let modelName = config.model.trim() || 'gpt-4o';
    if (modelName === 'gpt-luna-6') modelName = 'gpt-6-luna';
    else if (modelName === 'gpt-luna-5.6') modelName = 'gpt-5.6-luna';
    else if (modelName === 'gpt-sol-6') modelName = 'gpt-6-sol';
    else if (modelName === 'gpt-sol-6.1') modelName = 'gpt-6.1-sol';
    else if (modelName === 'gpt-astra-6') modelName = 'gpt-6-astra';
    else if (modelName === 'gpt-terra-5.6') modelName = 'gpt-5.6-terra';

    this.model = modelName;
    this.customHeaders = config.customHeaders || {};
    this.defaultTemperature = config.temperature ?? 0.7;
    this.enableSearch = Boolean(config.enableSearch);
    this.searchProtocol = config.searchProtocol || 'auto';
  }

  private getChatCompletionsUrl(): string {
    if (this.baseUrl.endsWith('/chat/completions')) {
      return this.baseUrl;
    }
    return `${this.baseUrl}/chat/completions`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.customHeaders,
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private isTestMode(): boolean {
    const key = this.apiKey.toLowerCase();
    const url = this.baseUrl.toLowerCase();
    return (
      key.startsWith('sk-test') ||
      key === 'demo' ||
      key.includes('mock') ||
      key.includes('demo') ||
      url.includes('mock') ||
      url.includes('example.com')
    );
  }

  async testConnection(): Promise<AITestResult> {
    if (this.isTestMode()) {
      return {
        success: true,
        message: `[Demo Mode] Simulated OpenAI-compatible connection to model "${this.model}" successful (12ms).`,
        latencyMs: 12,
        model: this.model,
      };
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(this.getChatCompletionsUrl(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: 'Ping test. Reply with "pong".',
            },
          ],
          max_tokens: 10,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let message = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const parsed = JSON.parse(errorText) as { error?: { message?: string } };
          if (parsed.error?.message) {
            message = parsed.error.message;
          }
        } catch {
          if (errorText) message += ` - ${errorText.slice(0, 150)}`;
        }

        return {
          success: false,
          message: `Connection failed: ${message}`,
          latencyMs,
          model: this.model,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;
      const { content } = extractResponseContent(data);
      return {
        success: true,
        message: `Successfully connected to ${this.model} (${latencyMs}ms). Reply: "${content || 'OK'}"`,
        latencyMs,
        model: this.model,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const error = err as Error;
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timed out after 12s. Please verify the Base URL.',
          latencyMs,
          model: this.model,
        };
      }
      return {
        success: false,
        message: `Connection error: ${error.message || 'Unknown network error'}`,
        latencyMs,
        model: this.model,
      };
    }
  }

  async chat(options: AIChatOptions): Promise<AIResponse> {
    if (this.isTestMode()) {
      return this.generateSimulatedChatResponse(options);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const lastUserMsg =
      [...options.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const isGreetingOrSmallTalk =
      /^(hey|hi|hello|yo|howdy|sup|greetings|thanks|thank you|who are you|what can you do)[\s!.?]*$/i.test(
        lastUserMsg.trim()
      );

    const hasSearchIntent = [...options.messages].some(
      (m) =>
        m.role === 'user' &&
        /\b(search (the web|online|internet|google|bing)|look up on the web|latest news|current news|breaking news|github\.com|https?:\/\/)\b/i.test(
          m.content
        )
    );

    // Only attach tools if not a pure greeting and search is requested or needed
    const shouldSearch =
      !isGreetingOrSmallTalk && (options.enableSearch ?? (this.enableSearch || hasSearchIntent));

    const requestPayload: Record<string, unknown> = {
      model: this.model,
      messages: options.messages,
      temperature: options.temperature ?? this.defaultTemperature,
      max_tokens: options.maxTokens ?? 2048,
    };

    if (shouldSearch) {
      let protocol = this.searchProtocol;

      // Auto-detect protocol if configured to 'auto'
      if (protocol === 'auto') {
        const isOpenRouter =
          this.baseUrl.includes('openrouter.ai') ||
          Boolean(this.customHeaders['HTTP-Referer']) ||
          Boolean(this.customHeaders['X-Title']);
        const isPerplexity = this.baseUrl.includes('perplexity.ai');
        const isGemini = this.model.toLowerCase().startsWith('gemini');

        if (isOpenRouter) {
          protocol = 'openrouter';
        } else if (isPerplexity) {
          protocol = 'perplexity';
        } else if (isGemini) {
          protocol = 'google_search';
        } else {
          protocol = 'openai_tool';
        }
      }

      switch (protocol) {
        case 'openai_tool':
          // Standard OpenAI-compatible web search tool
          requestPayload.tools = [
            {
              type: 'web_search',
              search_context_size: 'medium',
            },
          ];
          requestPayload.tool_choice = 'auto';
          requestPayload.web_search = true;
          break;

        case 'google_search':
          // Google search grounding tool (Gemini models and Google-compatible gateways)
          requestPayload.tools = [
            {
              googleSearch: {
                detail_level: 'high',
              },
            },
          ];
          break;

        case 'openrouter':
          // OpenRouter web browsing plugin
          requestPayload.plugins = [{ id: 'web' }];
          break;

        case 'perplexity':
          // Perplexity API search grounding and citations
          requestPayload.return_citations = true;
          break;

        default:
          requestPayload.tools = [{ type: 'web_search' }];
          requestPayload.web_search = true;
          break;
      }
    }

    try {
      const response = await fetch(this.getChatCompletionsUrl(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let message = `API request failed with status ${response.status}`;
        try {
          const parsed = JSON.parse(errorText) as { error?: { message?: string } };
          if (parsed.error?.message) {
            message = parsed.error.message;
          }
        } catch {
          if (errorText) message += `: ${errorText.slice(0, 200)}`;
        }
        throw new Error(message);
      }

      const data = (await response.json()) as Record<string, unknown>;
      let { content, finishReason } = extractResponseContent(data);

      // If content came back empty and search tools were included, retry without tools
      // This rescues cases where the model returns an unfulfilled tool_calls or blank message
      if (!content && shouldSearch) {
        try {
          const plainPayload: Record<string, unknown> = {
            model: this.model,
            messages: options.messages,
            temperature: options.temperature ?? this.defaultTemperature,
            max_tokens: options.maxTokens ?? 2048,
          };
          const fallbackResp = await fetch(this.getChatCompletionsUrl(), {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(plainPayload),
          });
          if (fallbackResp.ok) {
            const fallbackData = (await fallbackResp.json()) as Record<string, unknown>;
            const extracted = extractResponseContent(fallbackData);
            if (extracted.content) {
              content = extracted.content;
              finishReason = extracted.finishReason;
            }
          }
        } catch {
          // ignore fallback error and keep original result
        }
      }

      const usage = data.usage as
        | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
        | undefined;

      return {
        content,
        finishReason,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }
          : undefined,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      if (error.name === 'AbortError') {
        throw new Error('AI request timed out after 45 seconds', { cause: err });
      }
      throw error;
    }
  }

  async generate(options: AIGenerateOptions): Promise<AIResponse> {
    if (this.isTestMode()) {
      return this.generateSimulatedContent(options);
    }

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system' as const, content: options.systemPrompt });
    }
    messages.push({ role: 'user' as const, content: options.prompt });

    return this.chat({
      messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      enableSearch: options.enableSearch,
    });
  }

  private generateSimulatedChatResponse(options: AIChatOptions): AIResponse {
    const lastUserMessage =
      [...options.messages].reverse().find((m) => m.role === 'user')?.content?.toLowerCase() || '';

    let content: string;

    if (lastUserMessage.includes('react') || lastUserMessage.includes('performance')) {
      content = `⚡ Why 90% of React apps suffer from premature re-renders (and how to fix them):

Most engineers jump straight to \`useMemo\` and \`useCallback\`.
Here's the uncomfortable truth: they often make things worse.

3 architectural shifts that actually move the needle:

1. State Colocation
Keep state as close to where it's consumed as possible. Lifting state up too early causes cascading re-renders across entire trees.

2. Component Composition
Instead of passing props down 5 levels, pass children. React doesn't re-render props.children when the parent updates!

3. Split Heavy Contexts
Don't put authentication state, theme state, and form data into one monolithic Context. Separate high-frequency state from static state.

Stop optimizing the render loop before you optimize your component hierarchy.

What's the biggest performance bottleneck you've tackled recently?

#ReactJS #WebDevelopment #Frontend #SoftwareEngineering #Performance`;
    } else if (
      lastUserMessage.includes('ship') ||
      lastUserMessage.includes('early') ||
      lastUserMessage.includes('perfection')
    ) {
      content = `🚀 If your code is 100% bug-free at launch, you shipped too late.

Reid Hoffman famously said:
"If you are not embarrassed by the first version of your product, you’ve launched too late."

Here is what happens when you wait for perfection:
- Your assumptions stay untested
- Your competitors talk to your users first
- You burn emotional energy on edge cases nobody cares about

What real shipping velocity looks like:
1. Ship the core value proposition (v0.1)
2. Watch real user telemetry and friction points
3. Iterate in tight 48-hour feedback loops

Perfectionism is just fear disguised as high standards.

Ship it. Learn from it. Improve it tomorrow.

What are you building this week that needs to get shipped?

#Startups #BuildingInPublic #SoftwareEngineering #ProductManagement #Leadership`;
    } else if (lastUserMessage.includes('hook') || lastUserMessage.includes('headline')) {
      content = `Here are 5 high-converting LinkedIn hooks designed to stop the scroll:

1. "99% of developers get this wrong about modern software architecture."
2. "The most painful lesson I learned after 10 years of shipping products:"
3. "Stop writing code until you can answer these 3 questions."
4. "Why high-velocity engineering teams are abandoning microservices."
5. "The biggest mistake I made when scaling our first product to 10k users:"

💡 Tip: Pair any of these with a 1-sentence pattern interrupt immediately following the hook to maximize reading retention!`;
    } else {
      content = `Here is a high-engagement LinkedIn post draft based on your topic:

💡 The biggest career differentiator isn't knowing all the answers.
It's asking the questions others are too afraid to voice.

Over the past few years, the highest-performing teams I've worked with all shared one trait:
Relentless intellectual curiosity over ego.

Here is how that shows up daily:
• Challenging assumptions respectfully during sprint planning
• Documenting failure post-mortems without pointing fingers
• Shipping MVPs early to get real user feedback instead of endless debates

Great engineers build software.
Exceptional engineers build understanding.

What's one question that changed the way your team works?

#SoftwareEngineering #Leadership #TechCareers #ContinuousImprovement #Culture`;
    }

    return {
      content,
      finishReason: 'stop',
      usage: {
        promptTokens: 120,
        completionTokens: 280,
        totalTokens: 400,
      },
    };
  }

  private generateSimulatedContent(options: AIGenerateOptions): AIResponse {
    const prompt = (options.prompt || '').toLowerCase();
    let content: string;

    if (prompt.includes('generate_title') || prompt.includes('title')) {
      content = `1. The Counterintuitive Truth About Shipping Early
2. Why Perfectionism Kills Startup Velocity
3. Stop Waiting for Bug-Free Code: The 48-Hour Feedback Loop
4. 3 Mental Shifts That Doubled Our Engineering Output
5. How to Ship Products Users Actually Want`;
    } else if (prompt.includes('generate_hook') || prompt.includes('opening hook')) {
      content = `1. Most developers get this completely backwards.
2. The counterintuitive truth about building scalable systems:
3. Why 90% of engineering teams burn out (and how to prevent it):
4. The single greatest lesson I learned the hard way in tech:
5. Stop waiting for the "perfect time" to ship your ideas.`;
    } else if (prompt.includes('generate_hashtags') || prompt.includes('hashtag')) {
      content = '#SoftwareEngineering #TechLeadership #WebDevelopment #Productivity #Innovation #Startups';
    } else if (prompt.includes('tone') || prompt.includes('casual') || prompt.includes('humorous')) {
      content = `Honestly? If your code has zero bugs on launch day, you waited way too long to press deploy. 😅

We treat shipping like this sacred, monumental event. But in reality?
It's just step one of a feedback loop.

Ship the prototype. Learn what breaks. Fix it on Monday.

Who else needed this reminder today?`;
    } else {
      // General polish / improve / rewrite
      content = `🚀 If your product is 100% bug-free at launch, you shipped too late.

Perfectionism is just procrastination with a better PR team.

When you delay shipping, you aren't perfecting quality—you're delaying learning.

3 rules for sustainable shipping velocity:
1. Strip your MVP down to 1 core job-to-be-done.
2. Rely on real telemetry, not internal committee consensus.
3. Commit to 48-hour iteration cycles post-launch.

Ship early. Gather feedback. Iterate relentlessly.

What are you building right now that's ready to see the world?

#SoftwareEngineering #Startups #ProductManagement #Leadership`;
    }

    return {
      content,
      finishReason: 'stop',
      usage: {
        promptTokens: 80,
        completionTokens: 150,
        totalTokens: 230,
      },
    };
  }
}

interface ExtractedContent {
  content: string;
  finishReason?: string;
}

/**
 * Robust content and citation extractor supporting OpenAI, Responses API, and compatible gateways.
 * Handles string content, arrays of content/output parts, top-level output_text, and URL citations.
 */
function extractResponseContent(data: Record<string, unknown>): ExtractedContent {
  let text = '';
  let finishReason: string | undefined;
  let reasoning = '';
  const citations: Array<{ url: string; title?: string }> = [];

  // 1. Check top-level output_text (used by Responses API & compatible search endpoints)
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    text = data.output_text.trim();
  }

  // 2. Check top-level text, response, or result
  if (!text && typeof data.text === 'string' && data.text.trim()) {
    text = data.text.trim();
  }
  if (!text && typeof data.response === 'string' && data.response.trim()) {
    text = data.response.trim();
  }
  if (!text && typeof data.result === 'string' && data.result.trim()) {
    text = data.result.trim();
  }

  // 3. Check Responses API output array
  if (!text && Array.isArray(data.output)) {
    for (const item of data.output as Array<Record<string, unknown>>) {
      if (item.type === 'message' && typeof item.content === 'string') {
        text += (text ? '\n' : '') + item.content;
      }
    }
  }

  const choices = Array.isArray(data.choices) ? (data.choices as Array<Record<string, unknown>>) : [];
  const firstChoice = choices[0];

  if (firstChoice) {
    if (typeof firstChoice.finish_reason === 'string') {
      finishReason = firstChoice.finish_reason;
    }

    // Direct completions text (e.g. legacy/proxy completions format)
    if (!text && typeof firstChoice.text === 'string' && firstChoice.text.trim()) {
      text = firstChoice.text.trim();
    }

    const message = firstChoice.message as Record<string, unknown> | undefined;
    if (message) {
      // Check reasoning/thought tokens (DeepSeek-R1, Qwen-2.5-Coder, AvalAI luna/reasoning models)
      const rawReasoning =
        typeof message.reasoning_content === 'string'
          ? message.reasoning_content
          : typeof message.reasoning === 'string'
            ? message.reasoning
            : typeof message.thought === 'string'
              ? message.thought
              : typeof firstChoice.reasoning_content === 'string'
                ? firstChoice.reasoning_content
                : '';

      if (rawReasoning && rawReasoning.trim()) {
        reasoning = rawReasoning.trim();
      }

      if (!text) {
        if (typeof message.content === 'string') {
          text = message.content;
        } else if (Array.isArray(message.content)) {
          // Handle array of content parts
          for (const part of message.content) {
            if (typeof part === 'string') {
              text += (text ? '\n' : '') + part;
            } else if (part && typeof part === 'object') {
              const partObj = part as Record<string, unknown>;
              if (typeof partObj.text === 'string') {
                text += (text ? '\n' : '') + partObj.text;
              }
              if (Array.isArray(partObj.annotations)) {
                for (const ann of partObj.annotations as Array<Record<string, unknown>>) {
                  if (typeof ann?.url === 'string') {
                    citations.push({
                      url: ann.url,
                      title: typeof ann.title === 'string' ? ann.title : undefined,
                    });
                  }
                }
              }
            }
          }
        } else if (typeof message.refusal === 'string' && message.refusal.trim()) {
          text = message.refusal.trim();
        }
      }
    }
  }

  // 4. Check top-level or choice annotations (Perplexity, citation tool outputs, etc.)
  const rawAnnotations =
    (data.annotations as unknown[]) ||
    (firstChoice?.annotations as unknown[]) ||
    ((firstChoice?.message as Record<string, unknown>)?.annotations as unknown[]);

  if (Array.isArray(rawAnnotations)) {
    for (const ann of rawAnnotations as Array<Record<string, unknown>>) {
      if (typeof ann?.url === 'string' && !citations.some((c) => c.url === ann.url)) {
        citations.push({
          url: ann.url,
          title: typeof ann.title === 'string' ? ann.title : undefined,
        });
      }
    }
  }

  // 5. Fallback for tool_calls if content was empty
  if (!text) {
    const message = firstChoice?.message as Record<string, unknown> | undefined;
    if (Array.isArray(message?.tool_calls) && message.tool_calls.length > 0) {
      for (const call of message.tool_calls as Array<Record<string, unknown>>) {
        const fn = call.function as Record<string, unknown> | undefined;
        if (fn?.arguments && typeof fn.arguments === 'string') {
          try {
            const parsed = JSON.parse(fn.arguments);
            if (parsed.query) {
              text += `Searched for: "${parsed.query}"\n`;
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }

  // 6. If text was completely empty, use reasoning as fallback so response is not blank
  if (!text && reasoning) {
    text = reasoning;
  }

  // Strip any internal XML thinking/reasoning tags from final text
  text = text
    .replace(/<(?:thinking|reasoning|thought)>[\s\S]*?<\/(?:thinking|reasoning|thought)>/gi, '')
    .trim();

  // 7. Append formatted source citations if present and not already embedded
  if (citations.length > 0) {
    const unreferenced = citations.filter((c) => !text.includes(c.url));
    if (unreferenced.length > 0) {
      const sourcesBlock =
        '\n\n**Sources:**\n' +
        unreferenced
          .slice(0, 5)
          .map((c, i) => `${i + 1}. [${c.title || c.url}](${c.url})`)
          .join('\n');
      text += sourcesBlock;
    }
  }

  return {
    content: text.trim(),
    finishReason,
  };
}
