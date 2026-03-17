import { env, hasGitHubConfig } from "@/lib/env";

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  body: string | null;
  updated_at: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  full_name: string;
}

export async function fetchRepositoryIssues(owner: string, repo: string) {
  if (!hasGitHubConfig()) {
    return [];
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=20`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.githubPersonalAccessToken}`,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub sync failed with ${response.status}.`);
  }

  const issues = (await response.json()) as GitHubIssue[];
  return issues.filter((issue) => !("pull_request" in issue));
}

export async function createRepositoryIssue(input: {
  owner: string;
  repo: string;
  title: string;
  body: string;
}) {
  if (!hasGitHubConfig()) {
    throw new Error("GitHub is not configured.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.repo}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.githubPersonalAccessToken}`,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({
        title: input.title,
        body: input.body
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub issue creation failed with ${response.status}.`);
  }

  return (await response.json()) as GitHubIssue;
}

export async function listAccessibleRepositories() {
  if (!hasGitHubConfig()) {
    return [];
  }

  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.githubPersonalAccessToken}`,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub repository discovery failed with ${response.status}.`);
  }

  const repositories = (await response.json()) as GitHubRepository[];
  return repositories.map((repository) => ({
    id: String(repository.id),
    owner: repository.owner.login,
    repo: repository.name,
    label: repository.full_name
  }));
}
