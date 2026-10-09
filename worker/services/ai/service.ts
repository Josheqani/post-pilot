import { AIProvider, AIMessage } from './types';
import { AIImproveRequest } from '@/types';

function buildSystemPrompt(enableSearch?: boolean): string {
  let prompt = `You are PostPilot AI, a top-tier LinkedIn creator, strategist, and copywriter.
Your goal is to help users brainstorm ideas, refine thoughts, and draft high-performing LinkedIn posts.

LinkedIn Best Practices:
1. Hook: The first 1-2 lines make or break the post. Make them provocative, surprising, or question-driven.
2. Readability: Use generous whitespace, short 1-2 sentence paragraphs, and clear line breaks. Avoid dense blocks of text.
3. Authenticity: Sound human, vulnerable, or insightful—never corporate buzzword soup.
4. Value: Provide concrete takeaways, actionable frameworks, or lessons learned.
5. Engagement: Conclude with a thought-provoking question or discussion prompt.
6. Hashtags: Place 3-5 relevant hashtags at the bottom when completing a post draft.

Draft Formatting:
- When you produce a complete, publish-ready LinkedIn post, provide a concise, engaging working title in <title>...</title> tags, and enclose the full post content in <post> and </post> tags.
  Example:
  <title>Why High-Performing Teams Value Curiosity Over Ego</title>
  <post>
  [Opening Hook]

  [Insights and story with whitespace breaks]

  [Engagement Question]

  #Topic #Leadership #Innovation
  </post>
- Do NOT use <post> or <title> tags for general conversational replies, asking questions, or discussing idea lists. Only use them when you write an actual post ready to be drafted.`;

  if (enableSearch) {
    prompt += `\n\nWeb Search & Real-Time Knowledge:
- Live web search and grounding is ENABLED.
- When the user asks for latest news, industry trends, company updates, statistics, or asks you to search the web, use real-time web search capabilities to synthesize accurate, current information.
- Never claim that you lack real-time access or cannot search the internet.`;
  }

  return prompt;
}

export async function chatWithAssistant(
  provider: AIProvider,
  history: AIMessage[],
  enableSearch?: boolean,
  groundingContext?: string,
  memoryPrompt?: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(enableSearch);
  const messages: AIMessage[] = [{ role: 'system', content: systemPrompt }];

  if (memoryPrompt) {
    messages.push({
      role: 'system',
      content: memoryPrompt,
    });
  }

  if (groundingContext) {
    messages.push({
      role: 'system',
      content: groundingContext,
    });
  }

  messages.push(...history);

  const response = await provider.chat({
    messages,
    temperature: 0.7,
    maxTokens: 2048,
    enableSearch,
  });

  return response.content.trim();
}

export async function improveContent(provider: AIProvider, req: AIImproveRequest): Promise<string> {
  const { action, content, tone, instructions } = req;

  let prompt: string;
  const systemPrompt =
    'You are a professional LinkedIn editor and copywriter. Deliver clear, high-impact results with zero fluff or conversational filler. Return only the requested content.';

  switch (action) {
    case 'improve':
      prompt = `Polish and elevate this LinkedIn post. Fix any awkward phrasing, sharpen the opening hook, improve whitespace line breaks for mobile reading, and boost overall engagement while preserving the core message:\n\n---\n${content}\n---`;
      if (instructions) {
        prompt += `\nAdditional user instructions: ${instructions}`;
      }
      break;

    case 'rewrite':
      prompt = `Rewrite this LinkedIn post completely from a fresh angle. Make it punchier, more gripping, and structured with distinct whitespace between insights:\n\n---\n${content}\n---`;
      if (instructions) {
        prompt += `\nAdditional user instructions: ${instructions}`;
      }
      break;

    case 'change_tone': {
      const targetTone = tone || 'professional yet conversational';
      prompt = `Rewrite this LinkedIn post to have a "${targetTone}" tone. Ensure it resonates with a professional audience and keeps great pacing:\n\n---\n${content}\n---`;
      if (instructions) {
        prompt += `\nAdditional user instructions: ${instructions}`;
      }
      break;
    }

    case 'generate_hook':
      prompt = `Generate 5 scroll-stopping, curiosity-inducing opening hook options for this LinkedIn post. Format them as a numbered list (1 to 5) with no other preamble:\n\n---\n${content}\n---`;
      break;

    case 'generate_hashtags':
      prompt = `Analyze this LinkedIn post and generate 5 to 7 highly relevant, high-reach LinkedIn hashtags. Return ONLY the hashtags separated by spaces (e.g. #Leadership #Tech #Innovation):\n\n---\n${content}\n---`;
      break;

    case 'generate_title':
      prompt = `Generate 5 catchy, concise, and professional working titles (under 60 characters each) for this LinkedIn post to help identify and organize it. Format as a numbered list (1 to 5) with no other preamble:\n\n---\n${content}\n---`;
      break;

    default:
      prompt = `Improve this LinkedIn post for better engagement:\n\n${content}`;
  }

  const response = await provider.generate({
    systemPrompt,
    prompt,
    temperature: 0.7,
    maxTokens: 1500,
  });

  return response.content.trim();
}
