/**
 * Live content fetcher for PostPilot AI.
 * Extracts URLs (GitHub repositories, files, and general web pages) and retrieves
 * real-time data & README files to ground AI answers with authentic live context.
 */

export interface GitHubRepoInfo {
  type: 'github_repo';
  url: string;
  owner: string;
  repo: string;
  fullName: string;
  description?: string;
  language?: string;
  stars?: number;
  forks?: number;
  topics?: string[];
  defaultBranch?: string;
  readme?: string;
  filePath?: string;
  fileContent?: string;
}

export interface WebPageInfo {
  type: 'web_page';
  url: string;
  title?: string;
  content: string;
}

export type FetchedContent = GitHubRepoInfo | WebPageInfo;

/**
 * Extracts all HTTP/HTTPS URLs from a given text.
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  // Return unique URLs
  return Array.from(new Set(matches));
}

/**
 * Parse a GitHub URL to detect owner, repo, and optional branch/file path.
 */
export function parseGitHubUrl(urlStr: string): {
  isGitHub: boolean;
  owner?: string;
  repo?: string;
  branch?: string;
  filePath?: string;
} {
  try {
    const url = new URL(urlStr);
    if (!url.hostname.endsWith('github.com') && !url.hostname.endsWith('raw.githubusercontent.com')) {
      return { isGitHub: false };
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return { isGitHub: true, owner: segments[0] };
    }

    const owner = segments[0];
    const repo = segments[1]?.replace(/\.git$/i, '') || '';
    if (!owner || !repo) {
      return { isGitHub: true, owner };
    }
    if (segments.length >= 4 && (segments[2] === 'blob' || segments[2] === 'raw' || segments[2] === 'tree')) {
      const branch = segments[3];
      const filePath = segments.slice(4).join('/');
      return { isGitHub: true, owner, repo, branch, filePath };
    }

    return { isGitHub: true, owner, repo };
  } catch {
    return { isGitHub: false };
  }
}

/**
 * Fetch GitHub repository metadata and README using GitHub API and raw content fallback.
 */
export async function fetchGitHubRepoDetails(
  owner: string,
  repo: string,
  branch?: string,
  filePath?: string,
  githubToken?: string
): Promise<GitHubRepoInfo | null> {
  const defaultHeaders: Record<string, string> = {
    'User-Agent': 'PostPilot-LiveReader/1.0 (Cloudflare-Worker)',
    Accept: 'application/vnd.github.v3+json',
  };
  if (githubToken) {
    defaultHeaders['Authorization'] = `Bearer ${githubToken}`;
  }

  let description: string | undefined;
  let language: string | undefined;
  let stars: number | undefined;
  let forks: number | undefined;
  let topics: string[] | undefined;
  let defaultBranch = branch || 'main';

  // 1. Fetch Repo Metadata from GitHub REST API
  try {
    const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: defaultHeaders,
      signal: AbortSignal.timeout(6000),
    });

    if (apiRes.ok) {
      const data = (await apiRes.json()) as {
        description?: string;
        language?: string;
        stargazers_count?: number;
        forks_count?: number;
        topics?: string[];
        default_branch?: string;
      };
      description = data.description;
      language = data.language;
      stars = data.stargazers_count;
      forks = data.forks_count;
      topics = data.topics;
      if (data.default_branch) {
        defaultBranch = data.default_branch;
      }
    }
  } catch {
    // Continue even if repo API fails (e.g. rate limit), raw content may still succeed
  }

  // 2. If a specific file was requested (e.g., package.json, src/index.ts)
  let fileContent: string | undefined;
  if (filePath) {
    try {
      const rawFileRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch || defaultBranch}/${filePath}`,
        {
          headers: { 'User-Agent': 'PostPilot-LiveReader/1.0 (Cloudflare-Worker)' },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (rawFileRes.ok) {
        fileContent = (await rawFileRes.text()).slice(0, 10000);
      }
    } catch {
      // ignore
    }
  }

  // 3. Fetch README content
  let readme: string | undefined;
  try {
    // Try GitHub API raw readme first
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        ...defaultHeaders,
        Accept: 'application/vnd.github.v3.raw',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (readmeRes.ok) {
      readme = await readmeRes.text();
    } else {
      // Fallback directly to raw.githubusercontent.com
      const branchesToTry = [defaultBranch, 'main', 'master'];
      for (const b of branchesToTry) {
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${b}/README.md`,
          {
            headers: { 'User-Agent': 'PostPilot-LiveReader/1.0 (Cloudflare-Worker)' },
            signal: AbortSignal.timeout(4000),
          }
        );
        if (rawRes.ok) {
          readme = await rawRes.text();
          break;
        }
      }
    }
  } catch {
    // ignore
  }

  // Truncate README safely to avoid overwhelming model context (keep first 12,000 chars)
  if (readme && readme.length > 12000) {
    readme = readme.slice(0, 12000) + '\n\n... [README truncated for length] ...';
  }

  return {
    type: 'github_repo',
    url: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    description,
    language,
    stars,
    forks,
    topics,
    defaultBranch,
    readme,
    filePath,
    fileContent,
  };
}

/**
 * Fetch and extract clean text from a generic web page.
 */
export async function fetchWebPage(urlStr: string): Promise<WebPageInfo | null> {
  try {
    const url = new URL(urlStr);
    // Ignore non-http/https schemes and private networks
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('10.') ||
      url.hostname.endsWith('.internal')
    ) {
      return null;
    }

    const res = await fetch(urlStr, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Extract title
    let title: string | undefined;
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // Clean body HTML: strip script, style, nav, svg, comments
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');

    // Normalize whitespace
    cleaned = cleaned
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    // Keep top 6,000 characters
    if (cleaned.length > 6000) {
      cleaned = cleaned.slice(0, 6000) + '... [Content truncated]';
    }

    return {
      type: 'web_page',
      url: urlStr,
      title,
      content: cleaned,
    };
  } catch {
    return null;
  }
}

/**
 * Given user input, find URLs, fetch content, and build a grounding block for AI.
 */
export async function fetchLiveContentForPrompt(
  promptText: string,
  githubToken?: string
): Promise<{ groundingContext: string; sources: FetchedContent[] } | null> {
  const urls = extractUrls(promptText);
  if (urls.length === 0) {
    return null;
  }

  const sources: FetchedContent[] = [];

  // Limit to at most 3 URLs per message to protect latency & token usage
  const targetUrls = urls.slice(0, 3);

  for (const url of targetUrls) {
    const gh = parseGitHubUrl(url);
    if (gh.isGitHub && gh.owner && gh.repo) {
      const repoData = await fetchGitHubRepoDetails(
        gh.owner,
        gh.repo,
        gh.branch,
        gh.filePath,
        githubToken
      );
      if (repoData) {
        sources.push(repoData);
      }
    } else {
      const webData = await fetchWebPage(url);
      if (webData && webData.content) {
        sources.push(webData);
      }
    }
  }

  if (sources.length === 0) {
    return null;
  }

  // Format into a structured, authoritative prompt context block
  let block = '=== LIVE GROUNDED CONTEXT (VERIFIED REAL-TIME DATA) ===\n';
  block += 'The user prompt referenced external URL(s). Real-time content was retrieved directly:\n\n';

  for (const s of sources) {
    if (s.type === 'github_repo') {
      block += `### GitHub Repository: ${s.fullName}\n`;
      block += `- URL: ${s.url}\n`;
      if (s.description) block += `- Description: ${s.description}\n`;
      if (s.language) block += `- Primary Language: ${s.language}\n`;
      if (s.stars !== undefined) block += `- Stars: ${s.stars} | Forks: ${s.forks ?? 0} | Default Branch: ${s.defaultBranch}\n`;
      if (s.topics && s.topics.length > 0) block += `- Topics: ${s.topics.join(', ')}\n`;

      if (s.filePath && s.fileContent) {
        block += `\nFile Content (${s.filePath}):\n\`\`\`\n${s.fileContent}\n\`\`\`\n`;
      }

      if (s.readme) {
        block += `\nREADME.md Content:\n\`\`\`markdown\n${s.readme}\n\`\`\`\n`;
      }
      block += '\n';
    } else {
      block += `### Web Page: ${s.title || s.url}\n`;
      block += `- URL: ${s.url}\n`;
      block += `\nExtracted Content:\n${s.content}\n\n`;
    }
  }

  block += '=== END LIVE GROUNDED CONTEXT ===\n';
  block += 'INSTRUCTIONS FOR POSTPILOT AI:\n';
  block += '1. You have direct access to the live content above. Use these verified facts to answer the user accurately or draft LinkedIn posts.\n';
  block += '2. Do NOT claim the repository or webpage is private, unindexed, or missing, because the live content was successfully retrieved above.\n';
  block += '3. Highlight key features, architecture, and value propositions from the README or content when formulating your reply or LinkedIn post drafts.';

  return {
    groundingContext: block,
    sources,
  };
}
