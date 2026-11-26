import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `dotnet run --project "${join('..', 'backend', 'DemoShop.Api', 'DemoShop.Api.csproj')}" --no-launch-profile --urls http://localhost:5080`,
      url: 'http://localhost:5080/api/products',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm start',
      url: 'http://localhost:4200',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
