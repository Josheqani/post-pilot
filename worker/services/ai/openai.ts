import {
  AIProvider,
  AIProviderConfig,
  AIChatOptions,
  AIGenerateOptions,
  AIResponse,
  AITestResult,
} from './types';

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = 'OpenAI-Compatible';
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private customHeaders: Record<string, string>;
  private defaultTemperature: number;
  private enableSearch: boolean;

  constructor(config: AIProviderConfig) {
    // Normalize base URL: remove trailing slash and ensure protocol
    let url = config.baseUrl.trim();
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    this.baseUrl = url;
    this.apiKey = config.apiKey.trim();
    this.model = config.model.trim() || 'gpt-4o';
    this.customHeaders = config.customHeaders || {};
    this.defaultTemperature = config.temperature ?? 0.7;
    this.enableSearch = Boolean(config.enableSearch);
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

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const reply = data.choices?.[0]?.message?.content?.trim();
      return {
        success: true,
        message: `Successfully connected to ${this.model} (${latencyMs}ms). Reply: "${reply || 'OK'}"`,
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

    const shouldSearch = options.enableSearch ?? this.enableSearch;
    const requestPayload: Record<string, unknown> = {
      model: this.model,
      messages: options.messages,
      temperature: options.temperature ?? this.defaultTemperature,
      max_tokens: options.maxTokens ?? 2048,
    };

    if (shouldSearch) {
      // OpenRouter web search plugin: activates live internet browsing for any model
      if (
        this.baseUrl.includes('openrouter.ai') ||
        this.customHeaders['HTTP-Referer'] ||
        this.customHeaders['X-Title']
      ) {
        requestPayload.plugins = [{ id: 'web' }];
      }

      // Perplexity API search grounding
      if (this.baseUrl.includes('perplexity.ai')) {
        requestPayload.return_citations = true;
      }

      // Standard web search parameter recognized by OpenAI-compatible gateways
      requestPayload.web_search = true;
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

      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const choice = data.choices?.[0];
      const content = choice?.message?.content ?? '';

      return {
        content,
        finishReason: choice?.finish_reason,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
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

    if (prompt.includes('generate_hook') || prompt.includes('opening hook')) {
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
