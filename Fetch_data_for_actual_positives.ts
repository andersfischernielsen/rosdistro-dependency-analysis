import monk from 'monk';
import moment from 'moment';
import fs from 'fs';
import { safeLoad, safeDump } from 'js-yaml';
import { Issue, GHComment } from './Issue';

type Results = {
  url: string;
  days_open: number;
  opened_by: string;
  creator_is_contributor: boolean;
  closed_by: string;
  unique_users_participating: number;
  number_of_comments: number;
};

const url = '127.0.0.1:27017/github';
const db = monk(url, { collectionOptions: { useUnifiedTopology: true } });

async function getIssuesForRepository(
  owner: string,
  repository: string,
  number: number,
): Promise<Results> {
  const getCommentForIssue = async (i: Issue) => {
    const allComments: GHComment[] = await db.get('issue_comments').find({
      $and: [{ owner: owner }, { repo: repository }, { issue_id: i.number }],
    });
    const comments = allComments.filter((i) => Date.parse(i.created_at) < date);
    i.data_comments = comments;
    return i;
  };

  // const hasContributed = async (username: string) => {
  //   const commits: any[] = await db.get('commits').find({
  //     $and: [{ user: username }, { repo: repository }],
  //   });
  //   return commits.length > 0;
  // };

  const date = 1561161601000; //22/06/2019 00:00:01
  const issueResults: Issue[] = (await db.get('issues').find({
    $and: [{ owner: owner }, { repo: repository }],
  })).filter((i) => i.number == number);

  const issueWithComments = await Promise.all(
    issueResults.map((i) => getCommentForIssue(i)),
  );

  const issue = issueWithComments[0];
  const days = moment(issue.closed_at).diff(moment(issue.created_at), 'days');
  const openedBy = issue.user.login;
  const isContributor = false; //await hasContributed(issue.user.login);
  const closedBy = issue.closed_at
    ? issue.closed_by
      ? issue.closed_by.login
      : issue.user.login
    : undefined;
  const uniqueUsers = [
    ...new Set(issue.data_comments.map((c) => c.user.login)),
  ];
  const numberOfComments = issue.data_comments.length;

  console.info(`Parsed /${owner}/${repository}/issues/${number}`);
  return {
    url: `${owner}/${repository}/issues/${number}`,
    days_open: days + 1,
    opened_by: openedBy,
    creator_is_contributor: isContributor,
    closed_by: closedBy,
    unique_users_participating: uniqueUsers.length,
    number_of_comments: numberOfComments,
  };
}

const fetchForAll = async (path: string) => {
  const content = fs.readFileSync(path);
  const loaded = content.toString().split(/\r?\n/);
  const repositories = loaded
    .map((repo: any) => {
      const split = repo.split('/');
      const name = split[1];
      const owner = split[0];
      const number = split[3];
      return { owner: owner, name: name, number: number };
    })
    .filter((r) => r !== undefined);

  return await Promise.all(
    repositories.map((r) => getIssuesForRepository(r.owner, r.name, r.number)),
  );
};

fetchForAll('data/actual_positives_urls.txt').then((rs) => {
  const filename = 'results.json';
  const path = 'results_actual_positives';
  const issues = rs.reduce((acc, r) => acc.concat(r), []);
  try {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    fs.writeFileSync(`${path}/${filename}`, JSON.stringify(issues));
    console.log(`Results have been written to ${path}/${filename}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
  }
});
