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
  allBugs: number;
};

const url = '127.0.0.1:27017/github';
const db = monk(url, { collectionOptions: { useUnifiedTopology: true } });

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

  const date = 1568797200000; //18/09/2019 09:00:00
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

  const regex = 'depend';
  const issuesWithDependency = issuesWithComments.filter((i) => {
    return (
      (i.body != undefined && toLower(i.body).match(regex) != null) ||
      (i.title != undefined && toLower(i.title).match(regex) != null) ||
      i.data_comments.some(
        (c) => c.body != undefined && toLower(c.body).match(regex) != null,
      )
    );
  });

  const issuesWithoutDependency = issuesWithComments.filter((i) => {
    return (
      (i.body != undefined && toLower(i.body).match(regex) == null) ||
      (i.title != undefined && toLower(i.title).match(regex) == null) ||
      i.data_comments.some(
        (c) => c.body != undefined && toLower(c.body).match(regex) == null,
      )
    );
  });

  console.info(`Parsed /${owner}/${repository}`);
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
    allBugs: issuesWithComments.length,
  };
}

const fetchForAll = async (path: string) => {
  const content = fs.readFileSync(path);
  const loaded = safeLoad(content.toString());
  const repositories = Object.entries(loaded.repositories)
    .map((repo: any) => {
      const name = repo[0];
      const owner = repo[1].organisation;
      return { owner: owner, name: name };
    })
    .filter((r) => r !== undefined);

  return await Promise.all(
    repositories.map((r) => getIssuesForRepository(r.owner, r.name)),
  );
};

fetchForAll('data/18-09-2019-top-starred.yaml').then((rs) => {
  const filename = 'fractions.yaml';
  const path = 'results_top_starred';
  const fractions = rs.reduce((acc, r) => acc.concat(r.fractions), []);
  const positives = rs.reduce((acc, r) => acc.concat(r.positives), []);
  const negatives = rs.reduce((acc, r) => acc.concat(r.negatives), []);
  const allBugs = rs.reduce((acc, r) => acc + r.allBugs, 0);
  const totalFraction = positives.length / allBugs;

  console.log(
    `The total fraction is: ${positives.length}/${allBugs} = ${totalFraction}`,
  );

  try {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    fs.writeFileSync(`${path}/${filename}`, safeDump(fractions));
    // fs.writeFileSync(`${path}/positives.yaml`, safeDump(positives));
    // fs.writeFileSync(`${path}/negatives.yaml`, safeDump(negatives));
    console.log(`Results have been written to ${path}/${filename}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
  }
});
