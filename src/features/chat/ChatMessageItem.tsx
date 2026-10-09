import React, { useState } from 'react';
import { Button, Label } from '@primer/react';
import { Box, Text } from '@/components/PrimerCompat';
import {
  SparkleIcon,
  PersonIcon,
  PlusIcon,
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  LinkIcon,
  MarkGithubIcon,
  RepoIcon,
} from '@primer/octicons-react';
import { Message } from '@/types';
import { MarkdownContent } from '@/components/MarkdownContent';

interface ChatMessageItemProps {
  message: Message;
  onCreateDraft: (content: string, title?: string) => void;
  isDraftCreating?: boolean;
}

function getPostDraftInfo(message: Message): {
  isPostDraft: boolean;
  draftContent: string;
  draftTitle?: string;
} {
  // If explicitly flagged by the worker
  if (typeof message.isPostDraft === 'boolean') {
    return {
      isPostDraft: message.isPostDraft,
      draftContent: message.draftContent || message.content,
      draftTitle: message.draftTitle,
    };
  }

  let draftTitle: string | undefined = undefined;
  const titleTagMatch = message.content.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleTagMatch && titleTagMatch[1]) {
    draftTitle = titleTagMatch[1].trim();
  }

  // Check for explicit <post>...</post> or <linkedin_post> tags
  const tagMatch = message.content.match(/<(?:post|linkedin_post)>([\s\S]*?)<\/(?:post|linkedin_post)>/i);
  if (tagMatch && tagMatch[1]) {
    const draftContent = tagMatch[1].trim();
    if (!draftTitle) {
      const firstLine = draftContent.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
      const cleaned = firstLine.replace(/^[#\s*•\->]+/, '').replace(/^["'“”]/, '').replace(/["'“”]$/, '').trim();
      if (cleaned) draftTitle = cleaned.length > 60 ? cleaned.slice(0, 57).trim() + '...' : cleaned;
    }
    return {
      isPostDraft: true,
      draftContent,
      draftTitle,
    };
  }

  // Heuristic: has hashtags, multiple paragraphs, length >= 120, not a numbered list of ideas
  const hasHashtags = /#[\w\d_]{2,}/.test(message.content);
  const hasParagraphs = (message.content.match(/\n\s*\n/g) || []).length >= 2;
  const isNumberedList = /^\s*1\.\s+.*\n\s*2\.\s+/m.test(message.content);
  if (hasHashtags && hasParagraphs && message.content.length >= 120 && !isNumberedList) {
    const draftContent = message.content.trim();
    if (!draftTitle) {
      const firstLine = draftContent.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
      const cleaned = firstLine.replace(/^[#\s*•\->]+/, '').replace(/^["'“”]/, '').replace(/["'“”]$/, '').trim();
      if (cleaned) draftTitle = cleaned.length > 60 ? cleaned.slice(0, 57).trim() + '...' : cleaned;
    }
    return {
      isPostDraft: true,
      draftContent,
      draftTitle,
    };
  }

  return {
    isPostDraft: false,
    draftContent: message.content,
  };
}

interface DetectedGitHub {
  rawUrl: string;
  fullName: string;
  owner: string;
  repo?: string;
}

function extractGitHubUrls(text: string): DetectedGitHub[] {
  const regex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)(?:\/([a-zA-Z0-9_.-]+))?(?:\/[^\s]*)?/gi;
  const list: DetectedGitHub[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const rawUrl = match[0];
    const owner = match[1];
    if (!owner) continue;
    const repo = match[2] ? match[2].replace(/\.git$/i, '') : undefined;
    const fullName = repo ? `${owner}/${repo}` : owner;

    if (!seen.has(fullName)) {
      seen.add(fullName);
      list.push({ rawUrl, fullName, owner, repo });
    }
  }

  return list;
}

function renderUserMessageText(content: string) {
  // Split on URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (/^https?:\/\/(?:www\.)?github\.com\/[^\s]+/i.test(part)) {
      const cleanPath = part.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '');
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '1px 7px',
            margin: '0 2px',
            borderRadius: '4px',
            backgroundColor: 'var(--color-canvas-subtle, rgba(127,127,127,0.12))',
            border: '1px solid var(--color-border-default, rgba(127,127,127,0.25))',
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 500,
            fontFamily: 'monospace',
            fontSize: '0.9em',
          }}
        >
          <span style={{ display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 }}>
            <MarkGithubIcon size={13} />
          </span>
          <span>{cleanPath}</span>
        </a>
      );
    }
    if (/^https?:\/\/[^\s]+/i.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent-fg, #0969da)', textDecoration: 'underline' }}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onCreateDraft,
  isDraftCreating,
}) => {
  const isAI = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);

  const draftInfo = isAI ? getPostDraftInfo(message) : { isPostDraft: false, draftContent: message.content };

  // Strip internal XML-like tags (thinking, reasoning, thought, post, title) for clean message reading
  const displayContent = message.content
    .replace(/<(?:thinking|reasoning|thought)>[\s\S]*?<\/(?:thinking|reasoning|thought)>/gi, '')
    .replace(/<\/?(?:title|post|linkedin_post)>/gi, '')
    .trim();

  const detectedGitHub = extractGitHubUrls(message.content);
  const hasGitHubGrounding =
    isAI &&
    (/(?:github\.com|josheqani\/post-pilot|repository|readme\.md)/i.test(displayContent) ||
      /(?:inspected the|reviewed the)\s+\*\*?[a-zA-Z0-9_./-]+\*\*?\s+repository/i.test(displayContent));
  const hasWebSearch = !hasGitHubGrounding && /(?:search results|searched the web|according to the search)/i.test(displayContent);
  const hasLinks = /https?:\/\/[^\s]+|\[[^\]]+\]\([^)]+\)/.test(displayContent);

  const handleCopy = () => {
    const textToCopy = draftInfo.isPostDraft ? draftInfo.draftContent : displayContent;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        p: 3,
        bg: isAI ? 'canvas.subtle' : 'canvas.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isAI ? (draftInfo.isPostDraft ? 'accent.muted' : 'border.muted') : 'border.default',
        mb: 2,
      }}
    >
      {/* Avatar */}
      <Box sx={{ flexShrink: 0 }}>
        {isAI ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bg: 'accent.emphasis',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <SparkleIcon size={18} />
          </Box>
        ) : isSystem ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bg: 'neutral.subtle',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SparkleIcon size={18} />
          </Box>
        ) : (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bg: 'neutral.subtle',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'fg.default',
            }}
          >
            <PersonIcon size={18} />
          </Box>
        )}
      </Box>

      {/* Message Body */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{isAI ? 'PostPilot AI' : 'You'}</Text>
            {isAI && draftInfo.isPostDraft && (
              <Label variant="accent">
                LinkedIn Draft
              </Label>
            )}
            {isAI && hasGitHubGrounding && (
              <Label variant="accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MarkGithubIcon size={12} /> GitHub Grounded
              </Label>
            )}
            {isAI && !hasGitHubGrounding && hasWebSearch && (
              <Label variant="primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <GlobeIcon size={12} /> Web Grounded
              </Label>
            )}
            {isAI && !hasGitHubGrounding && !hasWebSearch && hasLinks && (
              <Label variant="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <LinkIcon size={12} /> Sources Cited
              </Label>
            )}
          </Box>

          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Box>


        {/* Suggested Title preview for draft */}
        {isAI && draftInfo.isPostDraft && draftInfo.draftTitle && (
          <Box
            sx={{
              mb: 2,
              px: 2,
              py: 1,
              bg: 'canvas.default',
              borderLeft: '3px solid',
              borderColor: 'accent.emphasis',
              borderRadius: 1,
            }}
          >
            <Text sx={{ fontSize: 0, color: 'fg.muted', display: 'block' }}>Suggested Title:</Text>
            <Text sx={{ fontSize: 1, fontWeight: 'bold', color: 'fg.default' }}>
              {draftInfo.draftTitle}
            </Text>
          </Box>
        )}

        {/* Content Body: Markdown for AI responses, plain text with GitHub highlighting for User */}
        {isAI ? (
          <MarkdownContent content={displayContent} />
        ) : (
          <Box
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 1,
              lineHeight: 1.6,
              color: 'fg.default',
            }}
          >
            {/* GitHub badge at the start of content if GitHub URL was provided */}
            {detectedGitHub.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                {detectedGitHub.map((gh) => (
                  <Box
                    key={gh.fullName}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1,
                      bg: 'canvas.subtle',
                      border: '1px solid',
                      borderColor: 'border.default',
                      borderRadius: 2,
                      color: 'fg.default',
                    }}
                  >
                    <MarkGithubIcon size={15} />
                    <Text sx={{ fontFamily: 'mono', fontWeight: 600, fontSize: 1 }}>{gh.fullName}</Text>
                    {gh.repo && (
                      <Label variant="accent" size="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <RepoIcon size={10} /> Repo
                      </Label>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {renderUserMessageText(displayContent)}
          </Box>
        )}

        {/* Action Toolbar for AI responses */}
        {isAI && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'border.muted',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {/* ONLY show Create Draft button when the response is flagged as a post draft */}
            {draftInfo.isPostDraft && (
              <Button
                size="small"
                variant="primary"
                leadingVisual={PlusIcon}
                onClick={() => onCreateDraft(draftInfo.draftContent, draftInfo.draftTitle)}
                disabled={isDraftCreating}
              >
                Create Draft
              </Button>
            )}

            <Button
              size="small"
              variant="invisible"
              leadingVisual={copied ? CheckIcon : CopyIcon}
              onClick={handleCopy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};
