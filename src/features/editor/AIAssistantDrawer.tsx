import React, { useState } from 'react';
import { Button, Select } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import { SparkleIcon, SyncIcon, ZapIcon, HashIcon, CheckIcon, BookmarkIcon } from '@primer/octicons-react';
import { ThinkingOrbLoader } from '@/components/ThinkingOrbLoader';
import { api } from '@/services/api';
import { AIImproveAction } from '@/types';

interface AIAssistantDrawerProps {
  currentContent: string;
  onApplyContent: (newContent: string) => void;
  onAppendContent: (appendStr: string) => void;
  onApplyTitle?: (newTitle: string) => void;
}

const TONES = [
  'Professional & Clear',
  'Conversational & Punchy',
  'Storytelling & Vulnerable',
  'Bold & Contrarian',
  'Analytical & Data-Driven',
];

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  currentContent,
  onApplyContent,
  onAppendContent,
  onApplyTitle,
}) => {
  const [selectedTone, setSelectedTone] = useState(TONES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AIImproveAction | null>(null);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: AIImproveAction, tone?: string) => {
    if (!currentContent.trim()) {
      setError('Please write some content first before asking AI to improve it.');
      return;
    }

    setIsLoading(true);
    setActiveAction(action);
    setError(null);
    setGeneratedResult(null);

    try {
      const res = await api.ai.improveContent({
        action,
        content: currentContent,
        tone,
      });

      setGeneratedResult(res.result);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyResult = () => {
    if (!generatedResult) return;
    if (activeAction === 'generate_title' && onApplyTitle) {
      const lines = generatedResult.split('\n').map((l) => l.trim()).filter(Boolean);
      const firstLine = lines[0] || generatedResult;
      const cleanTitle = firstLine.replace(/^\d+[.)]\s*/, '').replace(/^["'“”]/, '').replace(/["'“”]$/, '').trim();
      onApplyTitle(cleanTitle);
    } else if (activeAction === 'generate_hashtags') {
      onAppendContent(`\n\n${generatedResult}`);
    } else if (activeAction === 'generate_hook') {
      // Pick first hook or prepend at top
      onApplyContent(`${generatedResult}\n\n${currentContent}`);
    } else {
      onApplyContent(generatedResult);
    }
    setGeneratedResult(null);
  };

  return (
    <Box
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        bg: 'canvas.subtle',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <SparkleIcon size={18} />
        <Heading as="h4" sx={{ fontSize: 1, fontWeight: 'bold' }}>
          AI Post Enhancer
        </Heading>
      </Box>

      {error && (
        <Flash variant="danger" sx={{ py: 1, px: 2, fontSize: 0 }}>
          {error}
        </Flash>
      )}

      {/* Quick Actions Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 2,
        }}
      >
        <Button
          size="small"
          leadingVisual={SparkleIcon}
          onClick={() => handleAction('improve')}
          disabled={isLoading}
        >
          AI Improve
        </Button>

        <Button
          size="small"
          leadingVisual={SyncIcon}
          onClick={() => handleAction('rewrite')}
          disabled={isLoading}
        >
          Rewrite
        </Button>

        <Button
          size="small"
          leadingVisual={ZapIcon}
          onClick={() => handleAction('generate_hook')}
          disabled={isLoading}
        >
          Hooks
        </Button>

        <Button
          size="small"
          leadingVisual={HashIcon}
          onClick={() => handleAction('generate_hashtags')}
          disabled={isLoading}
        >
          Hashtags
        </Button>

        {onApplyTitle && (
          <Button
            size="small"
            leadingVisual={BookmarkIcon}
            onClick={() => handleAction('generate_title')}
            disabled={isLoading}
          >
            Titles
          </Button>
        )}
      </Box>

      {/* Change Tone */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Text sx={{ fontSize: 0, color: 'fg.muted', whiteSpace: 'nowrap' }}>Tone:</Text>
        <Select
          size="small"
          value={selectedTone}
          onChange={(e) => setSelectedTone(e.target.value)}
          disabled={isLoading}
        >
          {TONES.map((t) => (
            <Select.Option key={t} value={t}>
              {t}
            </Select.Option>
          ))}
        </Select>
        <Button
          size="small"
          onClick={() => handleAction('change_tone', selectedTone)}
          disabled={isLoading}
        >
          Apply Tone
        </Button>
      </Box>

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ py: 1 }}>
          <ThinkingOrbLoader
            minimal
            prompt={activeAction || 'Improving post content...'}
            size={20}
          />
        </Box>
      )}

      {/* Result Display Box */}
      {generatedResult && (
        <Box
          sx={{
            p: 3,
            bg: 'canvas.default',
            border: '1px solid',
            borderColor: 'accent.emphasis',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text sx={{ fontSize: 0, fontWeight: 'bold', color: 'accent.fg' }}>
              Suggested Result:
            </Text>
            <Button
              size="small"
              variant="primary"
              leadingVisual={CheckIcon}
              onClick={handleApplyResult}
            >
              {activeAction === 'generate_title'
                ? 'Apply Title'
                : activeAction === 'generate_hashtags'
                  ? 'Append to Post'
                  : 'Apply to Editor'}
            </Button>
          </Box>

          <Box
            sx={{
              maxHeight: '200px',
              overflowY: 'auto',
              p: 2,
              bg: 'canvas.subtle',
              borderRadius: 1,
              fontSize: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {generatedResult}
          </Box>
        </Box>
      )}
    </Box>
  );
};
