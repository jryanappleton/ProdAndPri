const env = {
  databaseUrl:
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiClassifyModel: process.env.OPENAI_MODEL_CLASSIFY ?? "gpt-4.1-mini",
  openAiTodayModel: process.env.OPENAI_MODEL_TODAY ?? "gpt-4.1",
  openAiTranscriptionModel:
    process.env.OPENAI_MODEL_TRANSCRIBE ?? "gpt-4o-mini-transcribe",
  githubPersonalAccessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN ?? "",
  appEncryptionKey: process.env.APP_ENCRYPTION_KEY ?? ""
};

export function hasOpenAiConfig() {
  return Boolean(env.openAiApiKey);
}

export function hasGitHubConfig() {
  return Boolean(env.githubPersonalAccessToken);
}

export { env };
