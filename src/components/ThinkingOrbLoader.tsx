import React, { useEffect, useState } from 'react';
import { ThinkingOrb, OrbState, OrbSize } from 'thinking-orbs';
import { useTheme } from '@/hooks/useTheme';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  GlobeIcon,
  LinkIcon,
  LightBulbIcon,
  PencilIcon,
} from '@primer/octicons-react';

import { Box, Text } from '@/components/PrimerCompat';

interface Step {
  label: string;
  state: OrbState;
  icon: 'analyze' | 'search' | 'link' | 'plan' | 'compose';
}

interface ThinkingOrbLoaderProps {
  prompt?: string;
  size?: OrbSize;
  minimal?: boolean;
}

function determineSteps(prompt?: string): Step[] {
  const p = (prompt || '').toLowerCase();
  const hasUrl = /https?:\/\/[^\s]+/.test(p);
  const isGitHub = /github\.com/.test(p);
  const hasSearch = /\b(search|web|google|bing|latest|news|current|trends|who is|what is|look up|repositories|repos)\b/i.test(p);

  if (isGitHub) {
    return [
      { label: 'Analyzing repository query', state: 'working', icon: 'analyze' },
      { label: 'Fetching repository details & README', state: 'connecting', icon: 'link' },
      { label: 'Synthesizing codebase & architecture', state: 'weaving', icon: 'plan' },
      { label: 'Composing technical breakdown & insights', state: 'composing', icon: 'compose' },
    ];
  }

  if (hasUrl) {
    return [
      { label: 'Analyzing URL & prompt context', state: 'working', icon: 'analyze' },
      { label: 'Retrieving live web page content', state: 'connecting', icon: 'link' },
      { label: 'Synthesizing article highlights', state: 'weaving', icon: 'plan' },
      { label: 'Drafting grounded response', state: 'composing', icon: 'compose' },
    ];
  }

  if (hasSearch) {
    return [
      { label: 'Analyzing query intent', state: 'working', icon: 'analyze' },
      { label: 'Searching the web in real-time', state: 'searching', icon: 'search' },
      { label: 'Evaluating search results & sources', state: 'solving', icon: 'plan' },
      { label: 'Composing grounded LinkedIn insights', state: 'composing', icon: 'compose' },
    ];
  }

  return [
    { label: 'Thinking & analyzing context', state: 'working', icon: 'analyze' },
    { label: 'Planning hook, structure & takeaways', state: 'solving', icon: 'plan' },
    { label: 'Composing high-performing draft', state: 'composing', icon: 'compose' },
  ];
}

export const ThinkingOrbLoader: React.FC<ThinkingOrbLoaderProps> = ({
  prompt,
  size = 32,
  minimal = false,
}) => {
  const { colorMode } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = React.useMemo(() => determineSteps(prompt), [prompt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Dynamic transition times based on number of steps
    const stepDelays = steps.length === 4 ? [0, 1600, 3600, 5800] : [0, 2000, 4500];

    const timeouts = stepDelays.map((delay, index) => {
      if (index === 0) return null;
      return setTimeout(() => {
        setCurrentStepIndex(index);
      }, delay);
    });

    return () => {
      timeouts.forEach((t) => t && clearTimeout(t));
    };
  }, [steps]);

  const activeStep = steps[currentStepIndex] || steps[0];
  const activeState: OrbState = activeStep ? activeStep.state : 'working';

  const isDark =
    colorMode === 'night' ||
    (colorMode === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches) ||
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-color-mode') === 'dark');

  const orbTheme: 'dark' | 'light' = isDark ? 'dark' : 'light';

  if (minimal) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <ThinkingOrb state={activeState} size={20} theme={orbTheme} />
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          {activeStep?.label || 'Thinking...'} ({elapsedSeconds}s)
        </Text>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 3,
        bg: 'canvas.subtle',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        fontSize: 1,
        color: 'fg.default',
      }}
    >
      {/* Top Header: Orb + Active Step + Timer + Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${size}px`,
              height: `${size}px`,
              flexShrink: 0,
            }}
          >
            <ThinkingOrb state={activeState} size={size} theme={orbTheme} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Text sx={{ fontWeight: 'bold', fontSize: 1, color: 'fg.default' }}>
                {activeStep?.label || 'PostPilot AI is working...'}
              </Text>
              <Text
                sx={{
                  fontSize: 0,
                  color: 'fg.muted',
                  bg: 'canvas.default',
                  border: '1px solid',
                  borderColor: 'border.muted',
                  px: '6px',
                  py: '1px',
                  borderRadius: '10px',
                }}
              >
                {elapsedSeconds}s
              </Text>
            </Box>
            <Text sx={{ fontSize: 0, color: 'fg.muted', mt: '2px' }}>
              Action: <code>{activeState}</code> • Step {currentStepIndex + 1} of {steps.length}
            </Text>
          </Box>
        </Box>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: 'inherit',
            opacity: 0.8,
            cursor: 'pointer',
            fontSize: '12px',
            padding: '4px 6px',
            borderRadius: '4px',
          }}
          title={isExpanded ? 'Hide action steps' : 'View action steps'}
        >
          <span>Steps</span>
          {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
        </button>
      </Box>

      {/* Expandable Activity Timeline */}
      {isExpanded && (
        <Box
          sx={{
            mt: 1,
            pt: 2,
            borderTop: '1px dashed',
            borderColor: 'border.muted',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <Box
                key={step.label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: 0,
                  color: isCurrent
                    ? 'accent.fg'
                    : isCompleted
                      ? 'success.fg'
                      : 'fg.muted',
                  fontWeight: isCurrent ? 'bold' : 'normal',
                }}
              >
                <Box
                  sx={{
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? (
                    <CheckIcon size={14} />
                  ) : isCurrent ? (
                    <Box
                      sx={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        bg: 'accent.fg',
                        boxShadow: '0 0 0 2px rgba(9, 105, 218, 0.3)',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        bg: 'border.default',
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {step.icon === 'search' && <GlobeIcon size={12} />}
                  {step.icon === 'link' && <LinkIcon size={12} />}
                  {step.icon === 'plan' && <LightBulbIcon size={12} />}
                  {step.icon === 'compose' && <PencilIcon size={12} />}
                  <Text>{step.label}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
