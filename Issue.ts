export interface PullRequest {
  diff_url: string;
  html_url: string;
  patch_url: string;
}

export interface User {
  type: string;
  received_events_url: string;
  followers_url: string;
  following_url: string;
  organizations_url: string;
  url: string;
  gravatar_id: string;
  avatar_url: string;
  starred_url: string;
  gists_url: string;
  login: string;
  subscriptions_url: string;
  repos_url: string;
  id: number;
  events_url: string;
}

export interface Issue {
  _id: string;
  body: string;
  milestone?: any;
  title: string;
  updated_at: Date;
  comments_url: string;
  labels_url: string;
  url: string;
  comments: number;
  assignee?: any;
  state: string;
  pull_request: PullRequest;
  user: User;
  html_url: string;
  created_at: string;
  labels: Label[];
  number: number;
  id: number;
  closed_at: Date;
  events_url: string;
  repo: string;
  owner: string;
  data_comments: GHComment[];
}

export interface GHComment {
  id: number;
  node_id: string;
  url: string;
  html_url: string;
  body: string;
  user: any;
  created_at: string;
  updated_at: Date;
}

export interface Label {
  color: string;
  name: string;
  url: string;
}
