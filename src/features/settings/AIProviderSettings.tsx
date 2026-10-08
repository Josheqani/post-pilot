import React, { useState, useEffect } from 'react';
import { Button, FormControl, TextInput, Spinner } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import { CheckIcon, AlertIcon, ZapIcon } from '@primer/octicons-react';
import { useAIConfig } from '@/hooks/useAIConfig';

export const AIProviderSettings: React.FC = () => {
  const { config, isLoading, isSaving, isTesting, testResult, error, saveConfig, testConnection } =
    useAIConfig();

  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState('0.7');
  const [headersJson, setHeadersJson] = useState('{}');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl || 'https://api.openai.com/v1');
      setModel(config.model || 'gpt-4o');
      setTemperature(String(config.temperature ?? 0.7));
      if (config.customHeaders) {
        setHeadersJson(JSON.stringify(config.customHeaders, null, 2));
      }
    }
  }, [config]);

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

    try {
      await saveConfig({
        baseUrl,
        apiKey: apiKey.trim() || undefined,
        model,
        temperature: parseFloat(temperature) || 0.7,
        customHeaders: parsedHeaders,
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

    await testConnection({
      baseUrl,
      apiKey: apiKey.trim() || undefined,
      model,
      customHeaders: parsedHeaders,
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
              Must point to an OpenAI-compatible /v1 endpoint (e.g. https://api.openai.com/v1,
              https://api.groq.com/openai/v1, or http://localhost:11434/v1).
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
              Any model supported by your endpoint (e.g. gpt-4o, gpt-4o-mini,
              llama-3.3-70b-versatile, claude-3-5-sonnet).
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
