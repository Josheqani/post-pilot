import { AIProvider, AIMessage } from './types';
import { AIImproveRequest } from '@/types';

const LINKEDIN_SYSTEM_PROMPT = `You are PostPilot AI, a top-tier LinkedIn creator, strategist, and copywriter.
Your goal is to help users brainstorm ideas, refine thoughts, and draft high-performing LinkedIn posts.

LinkedIn Best Practices:
1. Hook: The first 1-2 lines make or break the post. Make them provocative, surprising, or question-driven.
2. Readability: Use generous whitespace, short 1-2 sentence paragraphs, and clear line breaks. Avoid dense blocks of text.
3. Authenticity: Sound human, vulnerable, or insightful—never corporate buzzword soup.
4. Value: Provide concrete takeaways, actionable frameworks, or lessons learned.
5. Engagement: Conclude with a thought-provoking question or discussion prompt.
6. Hashtags: Place 3-5 relevant hashtags at the bottom when completing a post draft.

Whenever you generate a post draft, make it immediately ready to copy or convert into a draft.`;

export async function chatWithAssistant(
  provider: AIProvider,
  history: AIMessage[]
): Promise<string> {
  const messages: AIMessage[] = [{ role: 'system', content: LINKEDIN_SYSTEM_PROMPT }, ...history];

  const response = await provider.chat({
    messages,
    temperature: 0.7,
    maxTokens: 2048,
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
