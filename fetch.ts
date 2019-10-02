import monk from 'monk';
import fs from 'fs';
import { safeLoad, safeDump } from 'js-yaml';
import { Issue, GHComment } from './Issue';

type Fraction = {
  owner: string;
  repository: string;
  bugs: number;
  dependencyIssues: number;
  concurrencyIssues: number;
  memoryIssues: number;
  dependencyFraction: number;
  concurrencyFraction: number;
  memoryFraction: number;
};

type Results = {
  fractions: Fraction;
  dependencyPositives: Issue[];
  concurrencyPositives: Issue[];
  memoryPositives: Issue[];
  dependencyNegatives: Issue[];
  allBugs: number;
  allIssues: number;
};

const url = '127.0.0.1:27017/github';
const db = monk(url);

const toLower = (toLowerCase: string) => toLowerCase.toLowerCase();

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

  const invertMatchWithRegex = (issues: Issue[], regex: string) => {
    return issues.filter((i) => {
      return (
        (i.body != undefined && toLower(i.body).match(regex) == null) ||
        (i.title != undefined && toLower(i.title).match(regex) == null) ||
        i.data_comments.some(
          (c) => c.body != undefined && toLower(c.body).match(regex) == null,
        )
      );
    });
  };

  const fraction = (positives: Issue[], all: Issue[]) => {
    const fraction = positives.length / all.length;
    return isNaN(fraction) || !isFinite(fraction) ? 0 : fraction;
  };

  const date = 1561161601000; //22/06/2019 00:00:01
  const allIssues: Issue[] = await db.get('issues').find({
    $and: [{ owner: owner }, { repo: repository }],
  });

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

  const issuesWithComments = await Promise.all(
    issuesWithBugLabels.map((i) => getCommentForIssue(i)),
  );

  const dependencyIssues = matchWithRegex(issuesWithComments, ['depend']);
  const concurrencyIssues = matchWithRegex(issuesWithComments, [
    'concurren',
    'parallel',
    'deadlock',
    'race',
    'lock',
  ]);
  const memoryIssues = matchWithRegex(issuesWithComments, [
    'leak',
    'null dereference',
    'buffer',
    'overflow',
  ]);
  const withoutDependencyIssues = invertMatchWithRegex(
    issuesWithComments,
    'depend',
  );

  console.info(`Parsed /${owner}/${repository}/...`);
  const dependencyFraction = fraction(dependencyIssues, issuesWithComments);
  const concurrencyFraction = fraction(concurrencyIssues, issuesWithComments);
  const memoryFraction = fraction(memoryIssues, issuesWithComments);
  return {
    fractions: {
      owner: owner,
      repository: repository,
      bugs: issuesWithComments.length,
      dependencyIssues: dependencyIssues.length,
      concurrencyIssues: concurrencyIssues.length,
      memoryIssues: memoryIssues.length,
      dependencyFraction: dependencyFraction,
      concurrencyFraction: concurrencyFraction,
      memoryFraction: memoryFraction,
    },
    dependencyPositives: dependencyIssues,
    dependencyNegatives: withoutDependencyIssues,
    concurrencyPositives: concurrencyIssues,
    memoryPositives: memoryIssues,
    allBugs: issuesWithComments.length,
    allIssues: allIssues.length,
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

const fetchForAllTopStarred = async (path: string) => {
  const content = fs.readFileSync(path);
  const loaded = safeLoad(content.toString());
  const repositories = Object.entries(loaded.repositories)
    .map((repo: any) => {
      const name: string = repo[0];
      const owner: string = repo[1].organisation;
      return { owner: owner, name: name };
    })
    .filter((r) => r !== undefined);

  return await Promise.all(
    repositories.map((r) => getIssuesForRepository(r.owner, r.name)),
  );
};

const shouldRunOnTopStarred = false;
(shouldRunOnTopStarred
  ? fetchForAllTopStarred('data/18-09-2019-top-starred.yaml')
  : fetchForAll('data/22-06-2019-distribution.yaml')
).then((rs) => {
  const mode = shouldRunOnTopStarred ? '_top_starred' : '';
  const filename = `fractions${mode}.yaml`;
  const path = 'results';
  const fractions = rs.reduce((acc, r) => acc.concat(r.fractions), []);
  const dependPositives = rs.reduce(
    (acc, r) => acc.concat(r.dependencyPositives),
    [],
  );
  const concurrencyPositives = rs.reduce(
    (acc, r) => acc.concat(r.concurrencyPositives),
    [],
  );
  const memoryPositives = rs.reduce(
    (acc, r) => acc.concat(r.memoryPositives),
    [],
  );
  const dependNegatives = rs.reduce(
    (acc, r) => acc.concat(r.dependencyNegatives),
    [],
  );

  try {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    fs.writeFileSync(`${path}/${filename}`, safeDump(fractions));
    if (!shouldRunOnTopStarred) {
      fs.writeFileSync(
        `${path}/dependPositives${mode}.yaml`,
        safeDump(dependPositives),
      );
      fs.writeFileSync(
        `${path}/concurrencyPositives${mode}.yaml`,
        safeDump(concurrencyPositives),
      );
      fs.writeFileSync(
        `${path}/memoryPositives${mode}.yaml`,
        safeDump(memoryPositives),
      );
      fs.writeFileSync(
        `${path}/dependencyNegatives${mode}.yaml`,
        safeDump(dependNegatives),
      );
    }
    console.log(`Results have been written to ${path}/`);
    process.exit(0);
  } catch (error) {
    console.error(error);
  }
});
