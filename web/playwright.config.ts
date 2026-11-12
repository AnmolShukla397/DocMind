import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:8765',
    channel: process.env.DOCMIND_BROWSER_CHANNEL || 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `cd .. && ${process.env.DOCMIND_PYTHON || 'python3'} -m uvicorn backend.api:app --host 127.0.0.1 --port 8765`,
    url: 'http://127.0.0.1:8765/api/health',
    timeout: 30_000,
    reuseExistingServer: true,
    env: { DOCMIND_OLLAMA_URL: process.env.DOCMIND_TEST_OLLAMA_URL || 'http://127.0.0.1:11435' },
  },
})
