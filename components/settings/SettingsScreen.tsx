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
    createTag,
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
  const [newTagName, setNewTagName] = useState("");

  const preferenceRows: {
    key: keyof typeof state.preferences;
    label: string;
    hint?: string;
    min?: number;
    max?: number;
  }[] = [
    {
      key: "quickWinsPreference",
      label: "Prefer quick wins",
      hint: "Biases Today toward smaller tasks that clear fast.",
      min: 0,
      max: 100
    },
    {
      key: "deepWorkPreference",
      label: "Prefer deep work",
      hint: "Biases Today toward longer focused sessions.",
      min: 0,
      max: 100
    },
    {
      key: "revenueWeight",
      label: "Revenue emphasis",
      hint: "Weight applied to revenue-tagged tasks.",
      min: 0,
      max: 100
    },
    {
      key: "unblockWeight",
      label: "Unblocking emphasis",
      hint: "Weight applied to tasks that unblock others.",
      min: 0,
      max: 100
    },
    {
      key: "strategicWeight",
      label: "Strategic emphasis",
      hint: "Weight applied to strategic, long-horizon tasks.",
      min: 0,
      max: 100
    },
    {
      key: "adminWeight",
      label: "Admin cleanup emphasis",
      hint: "Weight applied to administrative cleanup tasks.",
      min: 0,
      max: 100
    }
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
      const response = await fetch("/api/github/discover", { cache: "no-store" });
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
    const repository = discoveredRepositories.find(
      (entry) => entry.id === selectedRepository
    );
    if (!repository) return;
    await addGitHubRepository(repository.owner, repository.repo);
    setSelectedRepository("");
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createTag(newTagName);
    setNewTagName("");
  }

  return (
    <div className="settings-page">
      <div className="settings-head">
        <h1>Settings</h1>
        <p>
          Tune how Today feels, manage tags, and wire up integrations. Changes
          persist against the live database.
        </p>
      </div>

      <section className="settings-section">
        <h2>Today defaults</h2>
        <p className="section-lede">
          Balance between lens focus and task dimensions.
        </p>
        <div className="settings-grid">
          <label className="field-block">
            <span>Default lens</span>
            <select
              value={state.preferences.defaultLens}
              onChange={(event) =>
                updatePreferences("defaultLens", event.target.value as TodayLens)
              }
              disabled={isSaving}
            >
              <option value="balanced">Balanced</option>
              <option value="revenue">Revenue</option>
              <option value="unblock">Unblock</option>
              <option value="strategic">Strategic</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <div className="settings-grid" style={{ marginTop: 18 }}>
          {preferenceRows.map((row) => (
            <div key={row.key} className="pref-row">
              <div className="pref-label">
                <span>{row.label}</span>
                {row.hint ? <small>{row.hint}</small> : null}
              </div>
              <span className="pref-value">
                {state.preferences[row.key] as number}
              </span>
              <input
                type="range"
                min={row.min}
                max={row.max}
                value={state.preferences[row.key] as number}
                onChange={(event) =>
                  updatePreferences(row.key, Number(event.target.value))
                }
                disabled={isSaving}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>Tags</h2>
        <p className="section-lede">
          Tags are persisted in the data model and can be assigned from Task
          Detail.
        </p>
        <form className="form-row" onSubmit={handleCreateTag}>
          <input
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            placeholder="Create a tag…"
            disabled={isSaving}
          />
          <button
            type="submit"
            className="btn"
            disabled={isSaving || !newTagName.trim()}
          >
            Add tag
          </button>
        </form>
        <div className="tag-list">
          {state.tags.length ? (
            state.tags.map((tag) => (
              <span key={tag.id} className="tag-pill">
                {tag.name}
              </span>
            ))
          ) : (
            <span className="muted-note">No tags yet.</span>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h2>OpenAI</h2>
        <p className="section-lede">
          {integrations.openAi.configured
            ? "OpenAI is configured. Inbox suggestions and Today briefings can use the configured models."
            : "OpenAI is not configured yet. Deterministic fallbacks are used until you add your API key to the environment."}
        </p>
        <div className="info-list">
          <div>
            <strong>Classify model:</strong> {integrations.openAi.classifyModel}
          </div>
          <div>
            <strong>Today model:</strong> {integrations.openAi.todayModel}
          </div>
          <div>
            <strong>Transcription model:</strong>{" "}
            {integrations.openAi.transcriptionModel}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>GitHub</h2>
        <p className="section-lede">
          {integrations.github.configured
            ? "Connect GitHub, load a repository, then create issues from Task Detail."
            : "Add a GitHub personal access token in the environment to enable real issue creation and sync."}
        </p>
        <div className="action-row">
          <button
            type="button"
            className="btn"
            onClick={toggleGithubConnected}
            disabled={isSaving}
          >
            {state.githubConnected
              ? "Disconnect workspace GitHub"
              : "Connect workspace GitHub"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={syncGithubIssues}
            disabled={
              isSaving ||
              !integrations.github.configured ||
              !state.githubRepositories.length
            }
          >
            Sync configured repo issues
          </button>
          <button
            type="button"
            className="btn"
            onClick={loadRepositories}
            disabled={isSaving || isDiscovering || !integrations.github.configured}
          >
            {isDiscovering ? "Loading repos…" : "Load my repositories"}
          </button>
        </div>

        {discoveredRepositories.length ? (
          <div className="form-row" style={{ marginTop: 14 }}>
            <label className="field-block" style={{ flex: 1 }}>
              <span>Available repositories</span>
              <select
                value={selectedRepository}
                onChange={(event) => setSelectedRepository(event.target.value)}
                disabled={isSaving || isDiscovering}
              >
                <option value="">Choose a repository…</option>
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
              className="btn"
              onClick={addSelectedRepository}
              disabled={isSaving || !selectedRepository}
            >
              Add selected
            </button>
          </div>
        ) : null}

        <form
          className="form-row"
          style={{ marginTop: 14 }}
          onSubmit={handleGitHubRepository}
        >
          <label className="field-block" style={{ flex: 1 }}>
            <span>Owner</span>
            <input
              value={githubOwner}
              onChange={(event) => setGitHubOwner(event.target.value)}
              placeholder="octocat"
              disabled={isSaving || !integrations.github.configured}
            />
          </label>
          <label className="field-block" style={{ flex: 1 }}>
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
            className="btn"
            disabled={
              isSaving ||
              !integrations.github.configured ||
              !githubOwner.trim() ||
              !githubRepo.trim()
            }
          >
            Add manually
          </button>
        </form>

        <div className="info-list">
          {state.githubRepositories.length ? (
            state.githubRepositories.map((entry) => (
              <div key={entry.id}>
                <strong>{entry.label}</strong>
              </div>
            ))
          ) : (
            <div>
              No repositories configured yet. Load one from GitHub or add one
              manually, then create issues from Task Detail.
            </div>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h2>Import</h2>
        <p className="section-lede">
          Validate the import persistence path with a deterministic sample.
        </p>
        <div className="action-row">
          <button
            type="button"
            className="btn"
            onClick={importSampleTasks}
            disabled={isSaving}
          >
            Import sample task
          </button>
        </div>
        {state.importHistory.length ? (
          <div className="activity-log">
            {state.importHistory.map((entry) => (
              <p key={entry}>{entry}</p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="settings-section">
        <h2>Database</h2>
        <p className="section-lede">
          The app runs against a real Prisma-backed layer for tasks, comments,
          Today planning inputs, imports, and integration state.
        </p>
        <div className="info-list">
          <div>
            <strong>Provider:</strong> {integrations.database.provider} ·{" "}
            {integrations.database.ready ? "ready" : "not ready"}
          </div>
        </div>
      </section>
    </div>
  );
}
