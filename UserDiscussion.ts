import fs from 'fs';
import { safeLoad, safeDump } from 'js-yaml';
import { Issue, GHComment } from './Issue';
import monk from 'monk';

type Results = {
  repo: string;
  allUsersParticipatingInDep: number;
  bugUsersParticipatingInDep: number;
  allIssueParticipants: number;
  bugIssueParticipants: number;
};

const url = '127.0.0.1:27017/github';
const db = monk(url);

async function getIssuesForRepository(
  owner: string,
  repository: string,
): Promise<Results> {
  const toLower = (toLowerCase: string) => toLowerCase.toLowerCase();
  const getCommentForIssue = async (i: Issue) => {
    const allComments: GHComment[] = await db.get('issue_comments').find({
      $and: [{ owner: owner }, { repo: repository }, { issue_id: i.number }],
    });
    const comments = allComments.filter((i) => Date.parse(i.created_at) < date);
    i.data_comments = comments;
    return i;
  };
  const matchWithRegex = (issues: Issue[], regex: string[]) => {
    const joined = regex.join('|');
    return issues.filter((i) => {
      return (
        (i.body != undefined && toLower(i.body).match(joined) != null) ||
        (i.title != undefined && toLower(i.title).match(joined) != null) ||
        i.data_comments.some(
          (c) => c.body != undefined && toLower(c.body).match(joined) != null,
        )
      );
    });
  };

  const date = 1561161601000; //22/06/2019 00:00:01
  const allIssues: Issue[] = (await db.get('issues').find({
    $and: [{ owner: owner }, { repo: repository }],
  })).filter((i) => Date.parse(i.created_at) < date);

  const issuesWithBugLabels = allIssues.filter(
    (i) =>
      Date.parse(i.created_at) < date &&
      i.labels.length > 0 &&
      i.labels.some(
        (l) =>
          toLower(l.name).match('bug') != undefined ||
          toLower(l.name).match('critical') != undefined,
      ),
  );

  const bugIssuesWithComments = await Promise.all(
    issuesWithBugLabels.map((i) => getCommentForIssue(i)),
  );
  const dependencyIssues = matchWithRegex(bugIssuesWithComments, ['depend']);

  const allIssueParticipants = new Set(
    (await Promise.all(allIssues.map((i) => getCommentForIssue(i))))
      .map((i) =>
        i.data_comments.map((c) => c.user.login).concat([i.user.login]),
      )
      .flat(),
  );

  const bugIssueParticipants = new Set(
    (await Promise.all(issuesWithBugLabels.map((i) => getCommentForIssue(i))))
      .map((i) =>
        i.data_comments.map((c) => c.user.login).concat([i.user.login]),
      )
      .flat(),
  );

  const dependencyIssueParticipants = new Set(
    dependencyIssues
      .map((i) =>
        i.data_comments.map((c) => c.user.login).concat([i.user.login]),
      )
      .flat(),
  );

  const allIntersection = new Set(
    [...allIssueParticipants].filter((x) => dependencyIssueParticipants.has(x)),
  );
  const bugIntersection = new Set(
    [...bugIssueParticipants].filter((x) => dependencyIssueParticipants.has(x)),
  );
  console.log(`Parsed ${owner}/${repository}`);
  return {
    repo: `${owner}/${repository}`,
    allIssueParticipants: allIssueParticipants.size,
    bugIssueParticipants: bugIssueParticipants.size,
    allUsersParticipatingInDep: allIntersection.size,
    bugUsersParticipatingInDep: bugIntersection.size,
  };
}

const fetchForAll = async (path: string) => {
  const content = fs.readFileSync(path);
  const loaded = safeLoad(content.toString());
  const repositories = Object.entries(loaded.repositories)
    .map((repo: any) => {
      const content = repo[1];
      if (!content.source) return undefined;
      let url = content.source.url as string;
      if (url.match('bitbucket')) return undefined;

      const initial = url.split(/(https:\/\/github.com\/)/)[2];
      const split = initial ? initial.split('/') : undefined;
      if (!split) return undefined;
      const nameWithoutGit = split[1].replace('.git', '');
      const owner = split[0];
      return { owner: owner, name: nameWithoutGit };
    })
    .filter((r) => r !== undefined);

  return await Promise.all(
    repositories.map((r) => getIssuesForRepository(r.owner, r.name)),
  );
};

fetchForAll('data/22-06-2019-distribution.yaml').then((rs) => {
  const path = 'results';
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
  fs.writeFileSync(`${path}/userparticipation.yaml`, safeDump(rs));
  process.exit(0);
});
