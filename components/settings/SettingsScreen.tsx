"use client";

import { FormEvent, useState } from "react";
import { useAppState } from "@/components/shared/AppStateProvider";
import { GitHubRepositoryOption, TodayLens } from "@/lib/types";

export function SettingsScreen() {
  const {
    state,
    integrations,
    isSaving,
    updatePreferences,
    addGitHubRepository,
    toggleGithubConnected,
    importSampleTasks,
    syncGithubIssues
  } = useAppState();
  const [githubOwner, setGitHubOwner] = useState("");
  const [githubRepo, setGitHubRepo] = useState("");
  const [discoveredRepositories, setDiscoveredRepositories] = useState<GitHubRepositoryOption[]>([]);
  const [selectedRepository, setSelectedRepository] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);

  const preferenceRows: {
    key: keyof typeof state.preferences;
    label: string;
    min?: number;
    max?: number;
  }[] = [
    { key: "quickWinsPreference", label: "Prefer quick wins", min: 0, max: 100 },
    { key: "deepWorkPreference", label: "Prefer deep work", min: 0, max: 100 },
    { key: "revenueWeight", label: "Revenue emphasis", min: 0, max: 100 },
    { key: "unblockWeight", label: "Unblocking emphasis", min: 0, max: 100 },
    { key: "strategicWeight", label: "Strategic emphasis", min: 0, max: 100 },
    { key: "adminWeight", label: "Admin cleanup emphasis", min: 0, max: 100 }
  ];

  async function handleGitHubRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addGitHubRepository(githubOwner, githubRepo);
    setGitHubOwner("");
    setGitHubRepo("");
  }

  async function loadRepositories() {
    setIsDiscovering(true);
    try {
      const response = await fetch("/api/github/discover", {
        cache: "no-store"
      });
      const data = (await response.json()) as {
        repositories?: GitHubRepositoryOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load repositories.");
      }

      setDiscoveredRepositories(data.repositories ?? []);
    } finally {
      setIsDiscovering(false);
    }
  }

  async function addSelectedRepository() {
    const repository = discoveredRepositories.find((entry) => entry.id === selectedRepository);
    if (!repository) return;
    await addGitHubRepository(repository.owner, repository.repo);
    setSelectedRepository("");
  }

  return (
    <div className="settings-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Preferences</p>
            <h2>Tune how Today feels by default</h2>
          </div>
        </div>
        <div className="settings-grid">
          <label className="field-block">
            <span>Default lens</span>
            <select
              value={state.preferences.defaultLens}
              onChange={(event) =>
                updatePreferences("defaultLens", event.target.value as TodayLens)
              }
            >
              <option value="balanced">Balanced</option>
              <option value="revenue">Revenue</option>
              <option value="unblock">Unblock</option>
              <option value="strategic">Strategic</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {preferenceRows.map((row) => (
            <label key={row.key} className="field-block">
              <span>{row.label}</span>
              <input
                type="range"
                min={row.min}
                max={row.max}
                value={state.preferences[row.key] as number}
                onChange={(event) => updatePreferences(row.key, Number(event.target.value))}
              />
              <strong>{state.preferences[row.key] as number}</strong>
            </label>
          ))}
        </div>
      </section>

      <div className="detail-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">OpenAI</p>
              <h3>AI readiness</h3>
            </div>
          </div>
          <p className="muted-copy">
            {integrations.openAi.configured
              ? "OpenAI is configured. Inbox suggestions and Today briefings can use the configured models."
              : "OpenAI is not configured yet. The app is using deterministic fallbacks until you add your API key to the environment."}
          </p>
          <div className="activity-list">
            <div className="activity-row">
              <p>Classify model: {integrations.openAi.classifyModel}</p>
            </div>
            <div className="activity-row">
              <p>Today model: {integrations.openAi.todayModel}</p>
            </div>
            <div className="activity-row">
              <p>Transcription model: {integrations.openAi.transcriptionModel}</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">GitHub</p>
              <h3>Connect repos, then create issues from tasks</h3>
            </div>
          </div>
          <p className="muted-copy">
            {integrations.github.configured
              ? "1. Connect GitHub here. 2. Load and add one of your repositories. 3. Open a task and create an issue in the chosen repository."
              : "Add a GitHub personal access token in the environment when you want real issue creation and sync."}
          </p>
          <div className="action-row">
            <button type="button" onClick={toggleGithubConnected} disabled={isSaving}>
              {state.githubConnected ? "Disconnect workspace GitHub" : "Connect workspace GitHub"}
            </button>
            <button
              type="button"
              onClick={syncGithubIssues}
              disabled={
                isSaving || !integrations.github.configured || !state.githubRepositories.length
              }
            >
              Sync configured repo issues
            </button>
            <button
              type="button"
              onClick={loadRepositories}
              disabled={isSaving || isDiscovering || !integrations.github.configured}
            >
              {isDiscovering ? "Loading repos..." : "Load my repositories"}
            </button>
          </div>
          {discoveredRepositories.length ? (
            <div className="task-edit-form">
              <label className="field-block">
                <span>Available repositories</span>
                <select
                  value={selectedRepository}
                  onChange={(event) => setSelectedRepository(event.target.value)}
                  disabled={isSaving || isDiscovering}
                >
                  <option value="">Choose a repository...</option>
                  {discoveredRepositories
                    .filter(
                      (repository) =>
                        !state.githubRepositories.some(
                          (configured) => configured.label === repository.label
                        )
                    )
                    .map((repository) => (
                      <option key={repository.id} value={repository.id}>
                        {repository.label}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                onClick={addSelectedRepository}
                disabled={isSaving || !selectedRepository}
              >
                Add selected repository
              </button>
            </div>
          ) : null}
          <form className="placement-grid github-repo-form" onSubmit={handleGitHubRepository}>
            <label className="field-block">
              <span>Owner</span>
              <input
                value={githubOwner}
                onChange={(event) => setGitHubOwner(event.target.value)}
                placeholder="octocat"
                disabled={isSaving || !integrations.github.configured}
              />
            </label>
            <label className="field-block">
              <span>Repository</span>
              <input
                value={githubRepo}
                onChange={(event) => setGitHubRepo(event.target.value)}
                placeholder="my-repo"
                disabled={isSaving || !integrations.github.configured}
              />
            </label>
            <button
              type="submit"
              disabled={
                isSaving ||
                !integrations.github.configured ||
                !githubOwner.trim() ||
                !githubRepo.trim()
              }
            >
              Add repository
            </button>
          </form>
          <div className="activity-list">
            {state.githubRepositories.length ? (
              state.githubRepositories.map((entry) => (
                <div key={entry.id} className="activity-row">
                  <p>{entry.label}</p>
                </div>
              ))
            ) : (
              <div className="activity-row">
                <p>No repositories configured yet. Load one from GitHub or add one manually, then create issues from Task Detail.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="detail-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Import</p>
              <h3>Seeded review flow</h3>
            </div>
          </div>
          <p className="muted-copy">
            Use this to validate the real import persistence path while we keep the source
            data intentionally simple.
          </p>
          <button type="button" onClick={importSampleTasks} disabled={isSaving}>
            Import sample task
          </button>
          <div className="activity-list">
            {state.importHistory.map((entry) => (
              <div key={entry} className="activity-row">
                <p>{entry}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Database</p>
              <h3>Runtime foundation</h3>
            </div>
          </div>
          <p className="muted-copy">
            The app is now running against a real Prisma-backed database layer for tasks,
            comments, Today planning inputs, imports, and integration state.
          </p>
          <div className="activity-row">
            <p>
              Provider: {integrations.database.provider} ·{" "}
              {integrations.database.ready ? "ready" : "not ready"}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
