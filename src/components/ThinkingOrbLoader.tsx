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
  const orbTheme: 'auto' | 'dark' | 'light' =
    colorMode === 'night' ? 'dark' : colorMode === 'day' ? 'light' : 'auto';

  if (minimal) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <ThinkingOrb state={activeState} size={20} theme={orbTheme} />
        <span style={{ fontSize: '13px', color: 'var(--fgColor-muted, #656d76)' }}>
          {activeStep?.label || 'Thinking...'} ({elapsedSeconds}s)
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px 14px',
        backgroundColor: 'var(--bgColor-subtle, #f6f8fa)',
        border: '1px solid var(--borderColor-muted, #d0d7de)',
        borderRadius: '8px',
        fontSize: '13px',
      }}
    >
      {/* Top Header: Orb + Active Step + Timer + Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${size}px`,
              height: `${size}px`,
              flexShrink: 0,
            }}
          >
            <ThinkingOrb state={activeState} size={size} theme={orbTheme} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--fgColor-default, #1f2328)' }}>
                {activeStep?.label || 'PostPilot AI is working...'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--fgColor-muted, #656d76)',
                  backgroundColor: 'var(--bgColor-neutral-muted, rgba(175, 184, 193, 0.2))',
                  padding: '1px 5px',
                  borderRadius: '10px',
                }}
              >
                {elapsedSeconds}s
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--fgColor-muted, #656d76)' }}>
              Action: <code style={{ fontSize: '11px' }}>{activeState}</code> • Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: 'var(--fgColor-muted, #656d76)',
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
      </div>

      {/* Expandable Activity Timeline */}
      {isExpanded && (
        <div
          style={{
            marginTop: '6px',
            paddingTop: '8px',
            borderTop: '1px dashed var(--borderColor-muted, #d0d7de)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: isCurrent
                    ? 'var(--fgColor-accent, #0969da)'
                    : isCompleted
                      ? 'var(--fgColor-success, #1a7f37)'
                      : 'var(--fgColor-muted, #8c959f)',
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                <div
                  style={{
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
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--fgColor-accent, #0969da)',
                        boxShadow: '0 0 0 2px var(--bgColor-accent-muted, #ddf4ff)',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--borderColor-muted, #d0d7de)',
                      }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {step.icon === 'search' && <GlobeIcon size={12} />}
                  {step.icon === 'link' && <LinkIcon size={12} />}
                  {step.icon === 'plan' && <LightBulbIcon size={12} />}
                  {step.icon === 'compose' && <PencilIcon size={12} />}
                  <span>{step.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
