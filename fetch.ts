import monk from 'monk';
import fs from 'fs';
import { safeLoad, safeDump } from 'js-yaml';
import { Issue, GHComment } from './Issue';

type Fraction = {
  owner: string;
  repository: string;
  bugs: number;
  dependencies: number;
  fraction: number;
};

type Results = {
  fractions: Fraction;
  positives: Issue[];
  negatives: Issue[];
};

const url = '127.0.0.1:27017/github';
const db = monk(url);

async function getIssuesForRepository(
  owner: string,
  repository: string,
): Promise<Results> {
  const getCommentForIssue = async (i: Issue) => {
    const allComments: GHComment[] = await db.get('issue_comments').find({
      $and: [{ owner: owner }, { repo: repository }, { issue_id: i.number }],
    });
    const comments = allComments.filter((i) => Date.parse(i.created_at) < date);
    i.data_comments = comments;
    return i;
  };

  const date = 1561161601000; //22/06/2019 00:00:01
  const allIssues: Issue[] = await db.get('issues').find({
    $and: [{ owner: owner }, { repo: repository }],
  });

  const issuesWithBugLabels = allIssues.filter(
    (i) =>
      Date.parse(i.created_at) < date &&
      i.labels.length > 0 &&
      i.labels.some((l) => l.name.match('bug') != undefined),
  );

  const issuesWithComments = await Promise.all(
    issuesWithBugLabels.map((i) => getCommentForIssue(i)),
  );

  const issuesWithDependency = issuesWithComments.filter((i) => {
    return (
      (i.body != undefined && i.body.match('dependenc(ies|y)') != null) ||
      (i.title != undefined && i.title.match('dependenc(ies|y)') != null) ||
      i.data_comments.some(
        (c) => c.body != undefined && c.body.match('dependenc(ies|y)') != null,
      )
    );
  });

  const issuesWithoutDependency = issuesWithComments.filter((i) => {
    return (
      (i.body != undefined && !i.body.match('dependenc(ies|y)') != null) ||
      (i.title != undefined && !i.title.match('dependenc(ies|y)') != null) ||
      !i.data_comments.some(
        (c) => c.body != undefined && c.body.match('dependenc(ies|y)') != null,
      )
    );
  });

  console.info(`Parsed /${owner}/${repository}/...`);
  const fraction = issuesWithDependency.length / issuesWithComments.length;
  return {
    fractions: {
      owner: owner,
      repository: repository,
      bugs: issuesWithComments.length,
      dependencies: issuesWithDependency.length,
      fraction: isNaN(fraction) || !isFinite(fraction) ? 0 : fraction,
    },
    positives: issuesWithDependency,
    negatives: issuesWithoutDependency,
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
  const filename = 'fractions.yaml';
  const path = 'results';
  const fractions = rs.reduce((acc, r) => acc.concat(r.fractions), []);
  const positives = rs.reduce((acc, r) => acc.concat(r.positives), []);
  const negatives = rs.reduce((acc, r) => acc.concat(r.negatives), []);
  fs.mkdirSync('results');
  fs.writeFileSync(`${path}/${filename}`, safeDump(fractions));
  fs.writeFileSync(`${path}/positives.yaml`, safeDump(positives));
  fs.writeFileSync(`${path}/negatives.yaml`, safeDump(negatives));
  console.log(`Results have been written to ${path}/${filename}`);
});
