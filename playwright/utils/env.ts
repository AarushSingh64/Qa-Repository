export interface EnvConfig {
  baseUrl: string;
  superAdminEmail: string;
  superAdminPassword: string;
  tenantEmail?: string;
  tenantPassword?: string;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function isHeadedMode(): boolean {
  if (process.env.HEADED?.trim().toLowerCase() === 'true') {
    return true;
  }

  return process.argv.includes('--headed');
}

export function getEnvConfig(): EnvConfig {
  return {
    baseUrl: getRequiredEnv('BASE_URL'),
    superAdminEmail: getRequiredEnv('SUPERADMIN_EMAIL'),
    superAdminPassword: getRequiredEnv('SUPERADMIN_PASSWORD'),
    tenantEmail: getOptionalEnv('TENANT_EMAIL'),
    tenantPassword: getOptionalEnv('TENANT_PASSWORD'),
  };
}
