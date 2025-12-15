type Commit = {
  "sha": string,
  "node_id": string,
  "commit": {
    "author": {
      "name": string,
      "email": string,
      "date": string
    },
    "committer": {
      "name": string,
      "email": string,
      "date": string
    },
    "message": string,
    "tree": {
      "sha": string,
      "url": string
    },
    "url": string,
    "comment_count": number,
    "verification": {
      "verified": boolean,
      "reason": string,
      "signature": null,
      "payload": null,
      "verified_at": null
    }
  },
  "url": string,
  "html_url": string,
  "comments_url": string,
  "author": {
    "login": string,
    "id": number,
    "node_id": string,
    "avatar_url": string,
    "gravatar_id": string,
    "url": string,
    "html_url": string,
    "followers_url": string,
    "following_url": string,
    "gists_url": string,
    "starred_url": string,
    "subscriptions_url": string,
    "organizations_url": string,
    "repos_url": string,
    "events_url": string,
    "received_events_url": string,
    "type": string,
    "user_view_type": string,
    "site_admin": boolean
  },
  "committer": {
    "login": string,
    "id": number,
    "node_id": string,
    "avatar_url": string,
    "gravatar_id": string,
    "url": string,
    "html_url": string,
    "followers_url": string,
    "following_url": string,
    "gists_url": string,
    "starred_url": string,
    "subscriptions_url": string,
    "organizations_url": string,
    "repos_url": string,
    "events_url": string,
    "received_events_url": string,
    "type": string,
    "user_view_type": string,
    "site_admin": boolean
  },
  "parents": [
    {
      "sha": string,
      "url": string,
      "html_url": string
    }
  ]
};

type Pull =   {
  "url": string,
  "id": number,
  "node_id": string,
  "html_url": string,
  "diff_url": string,
  "patch_url": string,
  "issue_url": string,
  "commits_url": string,
  "review_comments_url": string,
  "review_comment_url": string,
  "comments_url": string,
  "statuses_url": string,
  "number": number,
  "state": string,
  "locked": boolean,
  "title": string,
  "user": {
    "login": string,
    "id": number,
    "node_id": string,
    "avatar_url": string,
    "gravatar_id": string,
    "url": string,
    "html_url": string,
    "followers_url": string,
    "following_url": string,
    "gists_url": string,
    "starred_url": string,
    "subscriptions_url": string,
    "organizations_url": string,
    "repos_url": string,
    "events_url": string,
    "received_events_url": string,
    "type": string,
    "site_admin": boolean
  },
  "body": string,
  "labels": {
    "id": number,
    "node_id": string,
    "url": string,
    "name": string,
    "description": string,
    "color": string,
    "default": boolean
  }[],
  "milestone": {
    "url": string,
    "html_url": string,
    "labels_url": string,
    "id": number,
    "node_id": string,
    "number": number,
    "state": string,
    "title": string,
    "description": string,
    "creator": {
      "login": string,
      "id": number,
      "node_id": string,
      "avatar_url": string,
      "gravatar_id": string,
      "url": string,
      "html_url": string,
      "followers_url": string,
      "following_url": string,
      "gists_url": string,
      "starred_url": string,
      "subscriptions_url": string,
      "organizations_url": string,
      "repos_url": string,
      "events_url": string,
      "received_events_url": string,
      "type": string,
      "site_admin": boolean
    },
    "open_issues": number,
    "closed_issues": number,
    "created_at": string,
    "updated_at": string,
    "closed_at": string,
    "due_on": string
  },
  "active_lock_reason": string,
  "created_at": string,
  "updated_at": string,
  "closed_at": string,
  "merged_at": string,
  "merge_commit_sha": string,
  "assignee": {
    "login": string,
    "id": number,
    "node_id": string,
    "avatar_url": string,
    "gravatar_id": string,
    "url": string,
    "html_url": string,
    "followers_url": string,
    "following_url": string,
    "gists_url": string,
    "starred_url": string,
    "subscriptions_url": string,
    "organizations_url": string,
    "repos_url": string,
    "events_url": string,
    "received_events_url": string,
    "type": string,
    "site_admin": boolean
  },
  "assignees": {
    "login": string,
    "id": number,
    "node_id": string,
    "avatar_url": string,
    "gravatar_id": string,
    "url": string,
    "html_url": string,
    "followers_url": string,
    "following_url": string,
    "gists_url": string,
    "starred_url": string,
    "subscriptions_url": string,
    "organizations_url": string,
    "repos_url": string,
    "events_url": string,
    "received_events_url": string,
    "type": string,
    "site_admin": boolean
  }[],
  "requested_reviewers": {
    "login": string,
    "id": number,
    "node_id": string,
    "avatar_url": string,
    "gravatar_id": string,
    "url": string,
    "html_url": string,
    "followers_url": string,
    "following_url": string,
    "gists_url": string,
    "starred_url": string,
    "subscriptions_url": string,
    "organizations_url": string,
    "repos_url": string,
    "events_url": string,
    "received_events_url": string,
    "type": string,
    "site_admin": boolean
  }[],
  "requested_teams": {
    "id": number,
    "node_id": string,
    "url": string,
    "html_url": string,
    "name": string,
    "slug": string,
    "description": string,
    "privacy": string,
    "permission": string,
    "notification_setting": string,
    "members_url": string,
    "repositories_url": string,
    "parent": null
  }[],
  "head": {
    "label": string,
    "ref": string,
    "sha": string,
    "user": {
      "login": string,
      "id": number,
      "node_id": string,
      "avatar_url": string,
      "gravatar_id": string,
      "url": string,
      "html_url": string,
      "followers_url": string,
      "following_url": string,
      "gists_url": string,
      "starred_url": string,
      "subscriptions_url": string,
      "organizations_url": string,
      "repos_url": string,
      "events_url": string,
      "received_events_url": string,
      "type": string,
      "site_admin": boolean
    },
    "repo": {
      "id": number,
      "node_id": string,
      "name": string,
      "full_name": string,
      "owner": {
        "login": string,
        "id": number,
        "node_id": string,
        "avatar_url": string,
        "gravatar_id": string,
        "url": string,
        "html_url": string,
        "followers_url": string,
        "following_url": string,
        "gists_url": string,
        "starred_url": string,
        "subscriptions_url": string,
        "organizations_url": string,
        "repos_url": string,
        "events_url": string,
        "received_events_url": string,
        "type": string,
        "site_admin": boolean
      },
      "private": boolean,
      "html_url": string,
      "description": string,
      "fork": boolean,
      "url": string,
      "archive_url": string,
      "assignees_url": string,
      "blobs_url": string,
      "branches_url": string,
      "collaborators_url": string,
      "comments_url": string,
      "commits_url": string,
      "compare_url": string,
      "contents_url": string,
      "contributors_url": string,
      "deployments_url": string,
      "downloads_url": string,
      "events_url": string,
      "forks_url": string,
      "git_commits_url": string,
      "git_refs_url": string,
      "git_tags_url": string,
      "git_url": string,
      "issue_comment_url": string,
      "issue_events_url": string,
      "issues_url": string,
      "keys_url": string,
      "labels_url": string,
      "languages_url": string,
      "merges_url": string,
      "milestones_url": string,
      "notifications_url": string,
      "pulls_url": string,
      "releases_url": string,
      "ssh_url": string,
      "stargazers_url": string,
      "statuses_url": string,
      "subscribers_url": string,
      "subscription_url": string,
      "tags_url": string,
      "teams_url": string,
      "trees_url": string,
      "clone_url": string,
      "mirror_url": string,
      "hooks_url": string,
      "svn_url": string,
      "homepage": string,
      "language": null,
      "forks_count": number,
      "stargazers_count": number,
      "watchers_count": number,
      "size": number,
      "default_branch": string,
      "open_issues_count": number,
      "is_template": boolean,
      "topics": string[],
      "has_issues": boolean,
      "has_projects": boolean,
      "has_wiki": boolean,
      "has_pages": boolean,
      "has_downloads": boolean,
      "archived": boolean,
      "disabled": boolean,
      "visibility": string,
      "pushed_at": string,
      "created_at": string,
      "updated_at": string,
      "permissions": {
        "admin": boolean,
        "push": boolean,
        "pull": boolean
      },
      "allow_rebase_merge": boolean,
      "template_repository": null,
      "temp_clone_token": string,
      "allow_squash_merge": boolean,
      "allow_auto_merge": boolean,
      "delete_branch_on_merge": boolean,
      "allow_merge_commit": boolean,
      "subscribers_count": number,
      "network_count": number,
      "license": {
        "key": string,
        "name": string,
        "url": string,
        "spdx_id": string,
        "node_id": string,
        "html_url": string
      },
      "forks": number,
      "open_issues": number,
      "watchers": number
    }
  },
  "base": {
    "label": string,
    "ref": string,
    "sha": string,
    "user": {
      "login": string,
      "id": number,
      "node_id": string,
      "avatar_url": string,
      "gravatar_id": string,
      "url": string,
      "html_url": string,
      "followers_url": string,
      "following_url": string,
      "gists_url": string,
      "starred_url": string,
      "subscriptions_url": string,
      "organizations_url": string,
      "repos_url": string,
      "events_url": string,
      "received_events_url": string,
      "type": string,
      "site_admin": boolean
    },
    "repo": {
      "id": number,
      "node_id": string,
      "name": string,
      "full_name": string,
      "owner": {
        "login": string,
        "id": number,
        "node_id": string,
        "avatar_url": string,
        "gravatar_id": string,
        "url": string,
        "html_url": string,
        "followers_url": string,
        "following_url": string,
        "gists_url": string,
        "starred_url": string,
        "subscriptions_url": string,
        "organizations_url": string,
        "repos_url": string,
        "events_url": string,
        "received_events_url": string,
        "type": string,
        "site_admin": boolean
      },
      "private": boolean,
      "html_url": string,
      "description": string,
      "fork": boolean,
      "url": string,
      "archive_url": string,
      "assignees_url": string,
      "blobs_url": string,
      "branches_url": string,
      "collaborators_url": string,
      "comments_url": string,
      "commits_url": string,
      "compare_url": string,
      "contents_url": string,
      "contributors_url": string,
      "deployments_url": string,
      "downloads_url": string,
      "events_url": string,
      "forks_url": string,
      "git_commits_url": string,
      "git_refs_url": string,
      "git_tags_url": string,
      "git_url": string,
      "issue_comment_url": string,
      "issue_events_url": string,
      "issues_url": string,
      "keys_url": string,
      "labels_url": string,
      "languages_url": string,
      "merges_url": string,
      "milestones_url": string,
      "notifications_url": string,
      "pulls_url": string,
      "releases_url": string,
      "ssh_url": string,
      "stargazers_url": string,
      "statuses_url": string,
      "subscribers_url": string,
      "subscription_url": string,
      "tags_url": string,
      "teams_url": string,
      "trees_url": string,
      "clone_url": string,
      "mirror_url": string,
      "hooks_url": string,
      "svn_url": string,
      "homepage": string,
      "language": null,
      "forks_count": number,
      "stargazers_count": number,
      "watchers_count": number,
      "size": number,
      "default_branch": string,
      "open_issues_count": number,
      "is_template": boolean,
      "topics": [
        "octocat",
        "atom",
        "electron",
        "api"
      ],
      "has_issues": boolean,
      "has_projects": boolean,
      "has_wiki": boolean,
      "has_pages": boolean,
      "has_downloads": boolean,
      "archived": boolean,
      "disabled": boolean,
      "visibility": string,
      "pushed_at": string,
      "created_at": string,
      "updated_at": string,
      "permissions": {
        "admin": boolean,
        "push": boolean,
        "pull": boolean
      },
      "allow_rebase_merge": boolean,
      "template_repository": null,
      "temp_clone_token": string,
      "allow_squash_merge": boolean,
      "allow_auto_merge": boolean,
      "delete_branch_on_merge": boolean,
      "allow_merge_commit": boolean,
      "subscribers_count": number,
      "network_count": number,
      "license": {
        "key": string,
        "name": string,
        "url": string,
        "spdx_id": string,
        "node_id": string,
        "html_url": string
      },
      "forks": number,
      "open_issues": number,
      "watchers": number
    }
  },
  "_links": {
    "self": {
      "href": string
    },
    "html": {
      "href": string
    },
    "issue": {
      "href": string
    },
    "comments": {
      "href": string
    },
    "review_comments": {
      "href": string
    },
    "review_comment": {
      "href": string
    },
    "commits": {
      "href": string
    },
    "statuses": {
      "href": string
    }
  },
  "author_association": string,
  "auto_merge": null,
  "draft": boolean
};

type Author = {
  "login": string,
  "id": number,
  "node_id": string,
  "avatar_url": string,
  "gravatar_id": string,
  "url": string,
  "html_url": string,
  "followers_url": string,
  "following_url": string,
  "gists_url": string,
  "starred_url": string,
  "subscriptions_url": string,
  "organizations_url": string,
  "repos_url": string,
  "events_url": string,
  "received_events_url": string,
  "type": string,
  "user_view_type": string,
  "site_admin": false,
  "name": string,
  "company": string,
  "blog": string,
  "location": string,
  "email": string|null,
  "hireable": string|null,
  "bio": string,
  "twitter_username": string|null,
  "public_repos": number,
  "public_gists": number,
  "followers": number,
  "following": number,
  "created_at": string,
  "updated_at": string
};

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const owner = config.public.githubOwner as string;
  const repo = config.public.githubRepo as string;
  const token = config.githubToken as string | undefined;

  if (!owner || !repo) {
    return {
      ok: false,
      error: 'GitHub non configuré. Définissez NUXT_PUBLIC_GITHUB_OWNER et NUXT_PUBLIC_GITHUB_REPO.',
    }
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    // Récupère les 10 derniers PRs fermés et prend le plus récent mergé
    const pulls = await $fetch<Pull[]>(`https://api.github.com/repos/${owner}/${repo}/pulls?per_page=100`, {
      query: {
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      },
      headers
    })

    if (pulls.length > 0) {
      const merged = pulls.find(p => !!p.merged_at);
      if (!merged) {
        return { ok: true, data: null }
      }

      const mergeSha = merged.merge_commit_sha;
      let commitMessage: string | null = null
      if (mergeSha) {
        try {
          const commit = await $fetch<Commit>(`https://api.github.com/repos/${owner}/${repo}/commits/${mergeSha}`, { headers })
          commitMessage = commit?.commit?.message ?? null
        } catch (_) {
          // ignore commit fetch errors
        }
      }

      return {
        ok: true,
        data: {
          number: merged.number,
          title: merged.title,
          message: commitMessage,
          mergedAt: merged.merged_at,
          htmlUrl: merged.html_url,
          author: merged.user?.login ?? null,
          authorAvatar: merged.user?.avatar_url ?? null
        }
      }
    }

    const commits = await $fetch<Commit[]>(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`, { headers });
    const merged = commits.find(c => !!c.commit?.message && c.commit.message.startsWith('Merge pull request')) ?? commits[0];
    const commitMessage = merged?.commit?.message ?? null;

    const author = await $fetch<Author>(merged.author.url, { headers });

    return {
      ok: true,
      data: {
        number: merged.parents[0].sha,
        title: merged.commit.message.split('\n')[0] + (merged.commit.message.split('\n').length > 1 ? '...' : ''),
        message: commitMessage,
        mergedAt: merged.commit.committer.date,
        htmlUrl: merged.html_url,
        author: author?.name ?? null,
        authorAvatar: author?.avatar_url ?? null
      }
    }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || 'Erreur inconnue lors de la récupération depuis GitHub.'
    }
  }
})
