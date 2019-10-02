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
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = require("js-yaml");
const monk_1 = __importDefault(require("monk"));
const url = '127.0.0.1:27017/github';
const db = monk_1.default(url);
function getIssuesForRepository(owner, repository) {
    return __awaiter(this, void 0, void 0, function* () {
        const toLower = (toLowerCase) => toLowerCase.toLowerCase();
        const getCommentForIssue = (i) => __awaiter(this, void 0, void 0, function* () {
            const allComments = yield db.get('issue_comments').find({
                $and: [{ owner: owner }, { repo: repository }, { issue_id: i.number }],
            });
            const comments = allComments.filter((i) => Date.parse(i.created_at) < date);
            i.data_comments = comments;
            return i;
        });
        const matchWithRegex = (issues, regex) => {
            const joined = regex.join('|');
            return issues.filter((i) => {
                return ((i.body != undefined && toLower(i.body).match(joined) != null) ||
                    (i.title != undefined && toLower(i.title).match(joined) != null) ||
                    i.data_comments.some((c) => c.body != undefined && toLower(c.body).match(joined) != null));
            });
        };
        const date = 1561161601000; //22/06/2019 00:00:01
        const allIssues = (yield db.get('issues').find({
            $and: [{ owner: owner }, { repo: repository }],
        })).filter((i) => Date.parse(i.created_at) < date);
        const issuesWithBugLabels = allIssues.filter((i) => Date.parse(i.created_at) < date &&
            i.labels.length > 0 &&
            i.labels.some((l) => toLower(l.name).match('bug') != undefined ||
                toLower(l.name).match('critical') != undefined));
        const bugIssuesWithComments = yield Promise.all(issuesWithBugLabels.map((i) => getCommentForIssue(i)));
        const dependencyIssues = matchWithRegex(bugIssuesWithComments, ['depend']);
        const allIssueParticipants = new Set((yield Promise.all(allIssues.map((i) => getCommentForIssue(i))))
            .map((i) => i.data_comments.map((c) => c.user.login).concat([i.user.login]))
            .flat());
        const bugIssueParticipants = new Set((yield Promise.all(issuesWithBugLabels.map((i) => getCommentForIssue(i))))
            .map((i) => i.data_comments.map((c) => c.user.login).concat([i.user.login]))
            .flat());
        const dependencyIssueParticipants = new Set(dependencyIssues
            .map((i) => i.data_comments.map((c) => c.user.login).concat([i.user.login]))
            .flat());
        const allIntersection = new Set([...allIssueParticipants].filter((x) => dependencyIssueParticipants.has(x)));
        const bugIntersection = new Set([...bugIssueParticipants].filter((x) => dependencyIssueParticipants.has(x)));
        console.log(`Parsed ${owner}/${repository}`);
        return {
            repo: `${owner}/${repository}`,
            allIssueParticipants: allIssueParticipants.size,
            bugIssueParticipants: bugIssueParticipants.size,
            allUsersParticipatingInDep: allIntersection.size,
            bugUsersParticipatingInDep: bugIntersection.size,
        };
    });
}
const fetchForAll = (path) => __awaiter(this, void 0, void 0, function* () {
    const content = fs_1.default.readFileSync(path);
    const loaded = js_yaml_1.safeLoad(content.toString());
    const repositories = Object.entries(loaded.repositories)
        .map((repo) => {
        const content = repo[1];
        if (!content.source)
            return undefined;
        let url = content.source.url;
        if (url.match('bitbucket'))
            return undefined;
        const initial = url.split(/(https:\/\/github.com\/)/)[2];
        const split = initial ? initial.split('/') : undefined;
        if (!split)
            return undefined;
        const nameWithoutGit = split[1].replace('.git', '');
        const owner = split[0];
        return { owner: owner, name: nameWithoutGit };
    })
        .filter((r) => r !== undefined);
    return yield Promise.all(repositories.map((r) => getIssuesForRepository(r.owner, r.name)));
});
fetchForAll('data/22-06-2019-distribution.yaml').then((rs) => {
    const path = 'results';
    if (!fs_1.default.existsSync(path)) {
        fs_1.default.mkdirSync(path);
    }
    fs_1.default.writeFileSync(`${path}/userparticipation.yaml`, js_yaml_1.safeDump(rs));
    process.exit(0);
});
//# sourceMappingURL=UserDiscussion.js.map