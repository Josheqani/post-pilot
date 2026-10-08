import React, { useState, KeyboardEvent } from 'react';
import { Button, Textarea } from '@primer/react';
import { Box } from '@/components/PrimerCompat';
import { PaperAirplaneIcon } from '@primer/octicons-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

const QUICK_PROMPTS = [
  'Draft a LinkedIn post about shipping early vs perfectionism',
  'Create a post explaining how we optimized React performance',
  'Write a punchy hook about lessons learned from system failures',
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [content, setContent] = useState('');

  const handleSend = () => {
    if (!content.trim() || isLoading) return;
    onSend(content.trim());
    setContent('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'border.default', bg: 'canvas.default' }}>
      {/* Quick Prompts */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {QUICK_PROMPTS.map((prompt, i) => (
          <Button
            key={i}
            size="small"
            variant="invisible"
            style={{
              fontSize: '12px',
              border: '1px solid var(--borderColor-muted, #d8dee4)',
              borderRadius: '6px',
              padding: '2px 8px',
            }}
            onClick={() => onSend(prompt)}
            disabled={isLoading}
          >
            💡 {prompt}
          </Button>
        ))}
      </Box>

      {/* Input Field */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask PostPilot AI to write a LinkedIn post, brainstorm hooks, or reframe ideas... (Enter to send, Shift+Enter for newline)"
          rows={3}
          block
          style={{ resize: 'none' }}
          disabled={isLoading}
        />

        <Button
          variant="primary"
          leadingVisual={PaperAirplaneIcon}
          onClick={handleSend}
          disabled={!content.trim() || isLoading}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
};
