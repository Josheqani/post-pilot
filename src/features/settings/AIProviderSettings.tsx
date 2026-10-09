import React, { useState, useEffect } from 'react';
import { Button, FormControl, TextInput, Textarea, Spinner, Label, Select } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import { CheckIcon, AlertIcon, ZapIcon, GlobeIcon, TrashIcon } from '@primer/octicons-react';
import { useAIConfig } from '@/hooks/useAIConfig';
import { AISearchProtocol } from '@/types';
import { BrainIcon } from '@/components/icons/BrainIcon';
import { api } from '@/services/api';

export const AIProviderSettings: React.FC = () => {
  const { config, isLoading, isSaving, isTesting, testResult, error, saveConfig, testConnection } =
    useAIConfig();

  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState('0.7');
  const [headersJson, setHeadersJson] = useState('{}');
  const [enableSearch, setEnableSearch] = useState(false);
  const [searchProtocol, setSearchProtocol] = useState<AISearchProtocol>('auto');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Memory states
  const [enableMemory, setEnableMemory] = useState(false);
  const [memoryLimit, setMemoryLimit] = useState(2000);
  const [memoryContent, setMemoryContent] = useState('');
  const [isCompacting, setIsCompacting] = useState(false);
  const [compactNotice, setCompactNotice] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl || 'https://api.openai.com/v1');
      setModel(config.model || 'gpt-4o');
      setTemperature(String(config.temperature ?? 0.7));
      setEnableSearch(Boolean(config.enableSearch));
      setSearchProtocol(config.searchProtocol || 'auto');
      setEnableMemory(Boolean(config.enableMemory));
      setMemoryLimit(config.memoryLimit ?? 2000);
      setMemoryContent(config.memoryContent || '');
      if (config.customHeaders) {
        setHeadersJson(JSON.stringify(config.customHeaders, null, 2));
      }
    }
  }, [config]);

  const PRESETS = [
    {
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      enableSearch: false,
      searchProtocol: 'auto' as AISearchProtocol,
    },
    {
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3.5-sonnet',
      enableSearch: true,
      searchProtocol: 'openrouter' as AISearchProtocol,
    },
    {
      name: 'Perplexity',
      baseUrl: 'https://api.perplexity.ai',
      model: 'sonar',
      enableSearch: true,
      searchProtocol: 'perplexity' as AISearchProtocol,
    },
    {
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      enableSearch: false,
      searchProtocol: 'auto' as AISearchProtocol,
    },
  ];

  const normalizeInputs = (url: string, mdl: string) => {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    let cleanModel = mdl.trim();
    if (cleanModel === 'gpt-luna-6') cleanModel = 'gpt-6-luna';
    else if (cleanModel === 'gpt-luna-5.6') cleanModel = 'gpt-5.6-luna';
    else if (cleanModel === 'gpt-sol-6') cleanModel = 'gpt-6-sol';
    else if (cleanModel === 'gpt-sol-6.1') cleanModel = 'gpt-6.1-sol';
    else if (cleanModel === 'gpt-astra-6') cleanModel = 'gpt-6-astra';
    else if (cleanModel === 'gpt-terra-5.6') cleanModel = 'gpt-5.6-terra';

    return { cleanUrl, cleanModel };
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
    setEnableSearch(preset.enableSearch);
    setSearchProtocol(preset.searchProtocol);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessNotice(null);

    let parsedHeaders: Record<string, string> = {};
    if (headersJson.trim()) {
      try {
        parsedHeaders = JSON.parse(headersJson);
      } catch {
        alert('Invalid Custom Headers JSON format');
        return;
      }
    }

    const { cleanUrl, cleanModel } = normalizeInputs(baseUrl, model);
    setBaseUrl(cleanUrl);
    setModel(cleanModel);

    try {
      await saveConfig({
        baseUrl: cleanUrl,
        apiKey: apiKey.trim() || undefined,
        model: cleanModel,
        temperature: parseFloat(temperature) || 0.7,
        customHeaders: parsedHeaders,
        enableSearch,
        searchProtocol,
        enableMemory,
        memoryLimit,
        memoryContent,
      });
      setSuccessNotice('AI configuration updated and encrypted securely.');
      setApiKey(''); // Clear client field after successful save
    } catch {
      // handled by hook error
    }
  };

  const handleClearMemory = async () => {
    if (!window.confirm('Are you sure you want to clear all stored long-term memory? This cannot be undone.')) {
      return;
    }
    setIsClearing(true);
    try {
      await api.ai.clearMemory();
      setMemoryContent('');
      setCompactNotice(null);
      setSuccessNotice('AI Memory cleared successfully.');
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Failed to clear memory: ${e.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleCompactMemory = async () => {
    if (!memoryContent.trim() || isCompacting) return;
    setIsCompacting(true);
    setCompactNotice(null);
    try {
      const res = await api.ai.compactMemory({
        content: memoryContent,
        limit: memoryLimit,
        model,
      });
      setMemoryContent(res.compactedContent);
      setCompactNotice(
        res.message ||
          `Compacted memory from ${res.originalSize} to ${res.compactedSize} chars (saved ${res.savedChars} chars)!`
      );
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Compacting failed: ${e.message}`);
    } finally {
      setIsCompacting(false);
    }
  };

  const handleInsertStarterTemplate = () => {
    const template = `- Creator: Ali Josheqani
- Role: Software Engineer & Technical Creator
- Project: PostPilot (Self-hosted LinkedIn content studio)
- Content Style: Provocative hooks, generous whitespace, 1-2 sentence paragraphs, high engagement questions
- Core Topics: AI engineering, Cloudflare Workers, React 19, devtools, startup architecture
- Target Audience: Engineers, founders, technical leaders, builders
- Tone: Insightful, humble, pragmatic, zero corporate buzzwords`;

    setMemoryContent(template);
  };

  const handleTest = async () => {
    let parsedHeaders: Record<string, string> = {};
    if (headersJson.trim()) {
      try {
        parsedHeaders = JSON.parse(headersJson);
      } catch {
        alert('Invalid Custom Headers JSON');
        return;
      }
    }

    const { cleanUrl, cleanModel } = normalizeInputs(baseUrl, model);
    setBaseUrl(cleanUrl);
    setModel(cleanModel);

    await testConnection({
      baseUrl: cleanUrl,
      apiKey: apiKey.trim() || undefined,
      model: cleanModel,
      customHeaders: parsedHeaders,
      searchProtocol,
    });
  };

  if (isLoading && !config) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Spinner />
        <Text sx={{ display: 'block', mt: 2 }}>Loading AI Provider settings...</Text>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '680px' }}>
      <Box sx={{ mb: 3 }}>
        <Heading as="h3" sx={{ fontSize: 3 }}>
          AI Provider Configuration
        </Heading>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          Bring your own OpenAI-compatible endpoint (OpenAI, Groq, Ollama, OpenRouter, Mistral,
          vLLM, etc.). API keys are encrypted at rest on your Cloudflare Worker and never sent to
          the browser.
        </Text>
      </Box>

      {successNotice && (
        <Flash variant="success" sx={{ mb: 3 }}>
          <CheckIcon size={16} />
          {successNotice}
        </Flash>
      )}

      {error && (
        <Flash variant="danger" sx={{ mb: 3 }}>
          <AlertIcon size={16} />
          {error}
        </Flash>
      )}

      {testResult && (
        <Flash variant={testResult.success ? 'success' : 'danger'} sx={{ mb: 3 }}>
          {testResult.success ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
          {testResult.message}
        </Flash>
      )}

      {/* Quick Presets */}
      <Box sx={{ mb: 3, p: 3, border: '1px solid', borderColor: 'border.default', borderRadius: 2, bg: 'canvas.subtle' }}>
        <Text sx={{ fontSize: 0, fontWeight: 600, display: 'block', mb: 2, color: 'fg.muted' }}>
          Quick Configuration Presets:
        </Text>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {PRESETS.map((p) => (
            <Button
              key={p.name}
              size="small"
              type="button"
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </Button>
          ))}
        </Box>
      </Box>

      <form onSubmit={handleSave}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl required>
            <FormControl.Label>Base URL</FormControl.Label>
            <TextInput
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              block
            />
            <FormControl.Caption>
              Must point to an OpenAI-compatible /v1 endpoint (e.g. <code>https://api.openai.com/v1</code>, <code>https://openrouter.ai/api/v1</code>, or <code>https://api.groq.com/openai/v1</code>).
            </FormControl.Caption>
          </FormControl>

          <FormControl required={!config?.hasApiKey}>
            <FormControl.Label>API Key</FormControl.Label>
            <TextInput
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.hasApiKey ? `Saved: ${config.maskedApiKey}` : 'sk-...'}
              block
            />
            <FormControl.Caption>
              {config?.hasApiKey
                ? `Active key on server: ${config.maskedApiKey}. Leave empty to keep existing key.`
                : 'Enter your provider API key. It will be encrypted immediately.'}
            </FormControl.Caption>
          </FormControl>

          <FormControl required>
            <FormControl.Label>Model Name</FormControl.Label>
            <TextInput
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o"
              block
            />
            <FormControl.Caption>
              Any model supported by your endpoint (e.g. <code>gpt-4o</code>, <code>gpt-6-luna</code>, <code>claude-3-5-sonnet</code>, <code>llama-3.3-70b-versatile</code>).
            </FormControl.Caption>
          </FormControl>

          <FormControl>
            <FormControl.Label>Temperature (0.0 - 1.0)</FormControl.Label>
            <TextInput
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              block
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Optional Custom Headers (JSON)</FormControl.Label>
            <TextInput
              value={headersJson}
              onChange={(e) => setHeadersJson(e.target.value)}
              placeholder='{ "HTTP-Referer": "https://postpilot.local" }'
              block
            />
            <FormControl.Caption>
              Useful for OpenRouter or corporate proxies requiring custom headers.
            </FormControl.Caption>
          </FormControl>

          {/* Web Search Grounding Box */}
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: enableSearch ? 'accent.muted' : 'border.default',
              bg: enableSearch ? 'canvas.subtle' : 'canvas.default',
              transition: 'all 0.15s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
              <input
                type="checkbox"
                id="enable-search-toggle"
                checked={enableSearch}
                onChange={(e) => setEnableSearch(e.target.checked)}
                style={{ marginTop: 3, cursor: 'pointer', width: 16, height: 16 }}
              />
              <label htmlFor="enable-search-toggle" style={{ cursor: 'pointer', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <GlobeIcon size={16} />
                  <Text sx={{ fontWeight: 600, fontSize: 1 }}>
                    Enable Live Web Search & Grounding
                  </Text>
                  <Label variant="accent">Search</Label>
                </Box>
                <Text sx={{ fontSize: 0, color: 'fg.muted', display: 'block', mt: 1, lineHeight: 1.5 }}>
                  Enables real-time internet search for your AI model. When enabled, PostPilot instructs the model to browse and cite up-to-date facts using your selected search format.
                </Text>
              </label>
            </Box>

            {enableSearch && (
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'border.muted' }}>
                <FormControl>
                  <FormControl.Label>
                    Search Protocol / Format
                  </FormControl.Label>
                  <Select
                    value={searchProtocol}
                    onChange={(e) => setSearchProtocol(e.target.value as AISearchProtocol)}
                    block
                  >
                    <Select.Option value="auto">
                      Auto-detect (Recommended)
                    </Select.Option>
                    <Select.Option value="openai_tool">
                      OpenAI Tool Search (web_search tool parameter)
                    </Select.Option>
                    <Select.Option value="google_search">
                      Google Search Grounding (googleSearch tool)
                    </Select.Option>
                    <Select.Option value="openrouter">
                      OpenRouter Plugin (web search plugin)
                    </Select.Option>
                    <Select.Option value="perplexity">
                      Perplexity Citations (return_citations: true)
                    </Select.Option>
                  </Select>
                  <FormControl.Caption>
                    Choose the tool or plugin format supported by your endpoint or proxy gateway.
                  </FormControl.Caption>
                </FormControl>
              </Box>
            )}
          </Box>

          {/* Long-Term AI Memory Box */}
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: enableMemory ? 'accent.emphasis' : 'border.default',
              bg: enableMemory ? 'canvas.subtle' : 'canvas.default',
              transition: 'all 0.15s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
              <input
                type="checkbox"
                id="enable-memory-toggle"
                checked={enableMemory}
                onChange={(e) => setEnableMemory(e.target.checked)}
                style={{ marginTop: 3, cursor: 'pointer', width: 16, height: 16 }}
              />
              <label htmlFor="enable-memory-toggle" style={{ cursor: 'pointer', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <BrainIcon size={18} />
                  <Text sx={{ fontWeight: 600, fontSize: 1 }}>
                    Enable Long-Term AI Memory
                  </Text>
                  <Label variant="accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <BrainIcon size={12} /> Memory
                  </Label>
                </Box>
                <Text sx={{ fontSize: 0, color: 'fg.muted', display: 'block', mt: 1, lineHeight: 1.5 }}>
                  PostPilot stores key facts, writing preferences, audience traits, and project context across all discussions.
                </Text>
              </label>
            </Box>

            {enableMemory && (
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'border.muted', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Memory Capacity & Meter */}
                <Box
                  sx={{
                    p: 2.5,
                    bg: 'canvas.default',
                    border: '1px solid',
                    borderColor: 'border.default',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <BrainIcon size={14} />
                      <Text sx={{ fontSize: 0, fontWeight: 600 }}>
                        Memory Usage: {memoryContent.length.toLocaleString()} / {memoryLimit.toLocaleString()} characters ({Math.min(100, Math.round((memoryContent.length / memoryLimit) * 100))}%)
                      </Text>
                    </Box>

                    {memoryContent.length >= memoryLimit ? (
                      <Label variant="danger">Limit Reached</Label>
                    ) : memoryContent.length >= memoryLimit * 0.8 ? (
                      <Label variant="attention">Near Limit</Label>
                    ) : (
                      <Label variant="success">Active</Label>
                    )}
                  </Box>

                  {/* Progress Bar */}
                  <Box
                    sx={{
                      width: '100%',
                      height: '8px',
                      bg: 'border.muted',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(100, Math.round((memoryContent.length / memoryLimit) * 100))}%`,
                        height: '100%',
                        bg:
                          memoryContent.length >= memoryLimit
                            ? 'danger.emphasis'
                            : memoryContent.length >= memoryLimit * 0.8
                              ? 'attention.emphasis'
                              : 'success.emphasis',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </Box>

                  {memoryContent.length >= memoryLimit && (
                    <Flash variant="warning" sx={{ mt: 2 }}>
                      <AlertIcon size={14} />
                      Memory limit reached ({memoryContent.length}/{memoryLimit} characters). Click &ldquo;Compact with Model&rdquo; below to summarize and deduplicate facts, or increase your memory limit.
                    </Flash>
                  )}
                </Box>

                {/* Limit Size Selector */}
                <FormControl>
                  <FormControl.Label>Memory Limit Size</FormControl.Label>
                  <Select
                    value={String(memoryLimit)}
                    onChange={(e) => setMemoryLimit(parseInt(e.target.value, 10))}
                    block
                  >
                    <Select.Option value="1000">1,000 characters (Light Context)</Select.Option>
                    <Select.Option value="2000">2,000 characters (Standard — Recommended)</Select.Option>
                    <Select.Option value="4000">4,000 characters (Extended Context)</Select.Option>
                    <Select.Option value="8000">8,000 characters (Deep Persona & Facts)</Select.Option>
                  </Select>
                  <FormControl.Caption>
                    Caps how many characters of persistent creator memory are injected into model discussions.
                  </FormControl.Caption>
                </FormControl>

                {/* Memory Content Textarea */}
                <FormControl>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <FormControl.Label>Stored Creator Memory & Preferences</FormControl.Label>
                    <Button
                      size="small"
                      type="button"
                      onClick={handleInsertStarterTemplate}
                    >
                      Insert Starter Template
                    </Button>
                  </Box>
                  <Textarea
                    value={memoryContent}
                    onChange={(e) => setMemoryContent(e.target.value)}
                    placeholder="- Ali is building PostPilot (self-hosted LinkedIn content workspace)&#10;- Prefers punchy 1-2 line hooks, whitespace line breaks, actionable takeaways&#10;- Topics: Cloudflare Workers, React, AI, Startups&#10;- Tone: Vulnerable, insightful, direct"
                    rows={6}
                    block
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      resize: 'vertical',
                    }}
                  />
                  <FormControl.Caption>
                    Each bullet point is remembered across all chats and helps PostPilot AI naturally match your voice, bio, and topics.
                  </FormControl.Caption>
                </FormControl>

                {/* Compact Notice */}
                {compactNotice && (
                  <Flash variant="success">
                    <CheckIcon size={14} />
                    {compactNotice}
                  </Flash>
                )}

                {/* Action Buttons for Memory */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    type="button"
                    leadingVisual={BrainIcon}
                    onClick={handleCompactMemory}
                    disabled={isCompacting || !memoryContent.trim()}
                  >
                    {isCompacting ? (
                      <>
                        <Spinner size="small" style={{ marginRight: 6 }} />
                        Compacting with {model}...
                      </>
                    ) : (
                      `Compact with ${model}`
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    leadingVisual={TrashIcon}
                    onClick={handleClearMemory}
                    disabled={isClearing || !memoryContent.trim()}
                  >
                    {isClearing ? 'Clearing...' : 'Clear Memory'}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>

            <Button type="button" leadingVisual={ZapIcon} onClick={handleTest} disabled={isTesting}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </Box>
        </Box>
      </form>
    </Box>
  );
};
