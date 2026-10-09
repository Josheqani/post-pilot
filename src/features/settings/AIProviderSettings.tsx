import React, { useState, useEffect } from 'react';
import { Button, FormControl, TextInput, Spinner, Label, Select } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import { CheckIcon, AlertIcon, ZapIcon, GlobeIcon } from '@primer/octicons-react';
import { useAIConfig } from '@/hooks/useAIConfig';
import { AISearchProtocol } from '@/types';

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

  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl || 'https://api.openai.com/v1');
      setModel(config.model || 'gpt-4o');
      setTemperature(String(config.temperature ?? 0.7));
      setEnableSearch(Boolean(config.enableSearch));
      setSearchProtocol(config.searchProtocol || 'auto');
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
      });
      setSuccessNotice('AI configuration updated and encrypted securely.');
      setApiKey(''); // Clear client field after successful save
    } catch {
      // handled by hook error
    }
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
          <span style={{ marginRight: 8 }}>
            <CheckIcon size={16} />
          </span>
          {successNotice}
        </Flash>
      )}

      {error && (
        <Flash variant="danger" sx={{ mb: 3 }}>
          <span style={{ marginRight: 8 }}>
            <AlertIcon size={16} />
          </span>
          {error}
        </Flash>
      )}

      {testResult && (
        <Flash variant={testResult.success ? 'success' : 'danger'} sx={{ mb: 3 }}>
          <span style={{ marginRight: 8 }}>
            {testResult.success ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
          </span>
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
