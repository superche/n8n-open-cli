import Conf from 'conf';

interface ConfigSchema {
  baseUrl: string;
  apiKey: string;
}

const config = new Conf<ConfigSchema>({
  projectName: 'n8n-open-cli',
  schema: {
    baseUrl: { type: 'string', default: '' },
    apiKey: { type: 'string', default: '' },
  },
});

export function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.N8N_BASE_URL || config.get('baseUrl');
  const apiKey = process.env.N8N_API_KEY || config.get('apiKey');
  return { baseUrl, apiKey };
}

export function setConfig(baseUrl?: string, apiKey?: string): void {
  if (baseUrl) config.set('baseUrl', baseUrl);
  if (apiKey) config.set('apiKey', apiKey);
}

export function clearConfig(): void {
  config.clear();
}

export function getConfigPath(): string {
  return config.path;
}

export function validateConfig(): { baseUrl: string; apiKey: string } | null {
  const { baseUrl, apiKey } = getConfig();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

export default config;
