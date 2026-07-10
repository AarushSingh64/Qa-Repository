import { getEnvConfig } from './utils/env';

export default async function globalSetup(): Promise<void> {
  getEnvConfig();
}
