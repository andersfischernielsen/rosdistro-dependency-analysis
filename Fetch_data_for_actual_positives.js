"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const monk_1 = __importDefault(require("monk"));
const moment_1 = __importDefault(require("moment"));
const fs_1 = __importDefault(require("fs"));
const url = '127.0.0.1:27017/github';
const db = monk_1.default(url, { collectionOptions: { useUnifiedTopology: true } });
function getIssuesForRepository(owner, repository, number) {
    return __awaiter(this, void 0, void 0, function* () {
        const getCommentForIssue = (i) => __awaiter(this, void 0, void 0, function* () {
            const allComments = yield db.get('issue_comments').find({
                $and: [{ owner: owner }, { repo: repository }, { issue_id: i.number }],
            });
            const comments = allComments.filter((i) => Date.parse(i.created_at) < date);
            i.data_comments = comments;
            return i;
        });
        // const hasContributed = async (username: string) => {
        //   const commits: any[] = await db.get('commits').find({
        //     $and: [{ user: username }, { repo: repository }],
        //   });
        //   return commits.length > 0;
        // };
        const date = 1561161601000; //22/06/2019 00:00:01
        const issueResults = (yield db.get('issues').find({
            $and: [{ owner: owner }, { repo: repository }],
        })).filter((i) => i.number == number);
        const issueWithComments = yield Promise.all(issueResults.map((i) => getCommentForIssue(i)));
        const issue = issueWithComments[0];
        const days = moment_1.default(issue.closed_at).diff(moment_1.default(issue.created_at), 'days');
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
    });
}
const fetchForAll = (path) => __awaiter(this, void 0, void 0, function* () {
    const content = fs_1.default.readFileSync(path);
    const loaded = content.toString().split(/\r?\n/);
    const repositories = loaded
        .map((repo) => {
        const split = repo.split('/');
        const name = split[1];
        const owner = split[0];
        const number = split[3];
        return { owner: owner, name: name, number: number };
    })
        .filter((r) => r !== undefined);
    return yield Promise.all(repositories.map((r) => getIssuesForRepository(r.owner, r.name, r.number)));
});
fetchForAll('data/actual_positives_urls.txt').then((rs) => {
    const filename = 'results.json';
    const path = 'results_actual_positives';
    const issues = rs.reduce((acc, r) => acc.concat(r), []);
    try {
        if (!fs_1.default.existsSync(path)) {
            fs_1.default.mkdirSync(path);
        }
        fs_1.default.writeFileSync(`${path}/${filename}`, JSON.stringify(issues));
        console.log(`Results have been written to ${path}/${filename}`);
        process.exit(0);
    }
    catch (error) {
        console.error(error);
    }
});
//# sourceMappingURL=Fetch_data_for_actual_positives.js.map