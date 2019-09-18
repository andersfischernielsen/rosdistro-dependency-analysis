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
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = require("js-yaml");
const url = '127.0.0.1:27017/github';
const db = monk_1.default(url, { collectionOptions: { useUnifiedTopology: true } });
const toLower = (toLowerCase) => toLowerCase.toLowerCase();
function getIssuesForRepository(owner, repository) {
    return __awaiter(this, void 0, void 0, function* () {
        const getCommentForIssue = (i) => __awaiter(this, void 0, void 0, function* () {
            const allComments = yield db.get('issue_comments').find({
                $and: [{ owner: owner }, { repo: repository }, { issue_id: i.number }],
            });
            const comments = allComments.filter((i) => Date.parse(i.created_at) < date);
            i.data_comments = comments;
            return i;
        });
        const date = 1568797200000; //18/09/2019 09:00:00
        const allIssues = yield db.get('issues').find({
            $and: [{ owner: owner }, { repo: repository }],
        });
        const issuesWithBugLabels = allIssues.filter((i) => Date.parse(i.created_at) < date &&
            i.labels.length > 0 &&
            i.labels.some((l) => toLower(l.name).match('bug') != undefined ||
                toLower(l.name).match('critical') != undefined));
        const issuesWithComments = yield Promise.all(issuesWithBugLabels.map((i) => getCommentForIssue(i)));
        const regex = 'depend';
        const issuesWithDependency = issuesWithComments.filter((i) => {
            return ((i.body != undefined && toLower(i.body).match(regex) != null) ||
                (i.title != undefined && toLower(i.title).match(regex) != null) ||
                i.data_comments.some((c) => c.body != undefined && toLower(c.body).match(regex) != null));
        });
        const issuesWithoutDependency = issuesWithComments.filter((i) => {
            return ((i.body != undefined && toLower(i.body).match(regex) == null) ||
                (i.title != undefined && toLower(i.title).match(regex) == null) ||
                i.data_comments.some((c) => c.body != undefined && toLower(c.body).match(regex) == null));
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
            allBugs: issuesWithComments.length,
        };
    });
}
const fetchForAll = (path) => __awaiter(this, void 0, void 0, function* () {
    const content = fs_1.default.readFileSync(path);
    const loaded = js_yaml_1.safeLoad(content.toString());
    const repositories = Object.entries(loaded.repositories)
        .map((repo) => {
        const name = repo[0];
        const owner = repo[1].organisation;
        return { owner: owner, name: name };
    })
        .filter((r) => r !== undefined);
    return yield Promise.all(repositories.map((r) => getIssuesForRepository(r.owner, r.name)));
});
fetchForAll('data/18-09-2019-top-starred.yaml').then((rs) => {
    const filename = 'fractions_top_starred.yaml';
    const path = 'results_top_starred';
    const fractions = rs.reduce((acc, r) => acc.concat(r.fractions), []);
    const positives = rs.reduce((acc, r) => acc.concat(r.positives), []);
    const negatives = rs.reduce((acc, r) => acc.concat(r.negatives), []);
    const allBugs = rs.reduce((acc, r) => acc + r.allBugs, 0);
    const totalFraction = positives.length / allBugs;
    console.log(`The total fraction is: ${positives.length}/${allBugs} = ${totalFraction}`);
    try {
        if (!fs_1.default.existsSync(path)) {
            fs_1.default.mkdirSync(path);
        }
        fs_1.default.writeFileSync(`${path}/${filename}`, js_yaml_1.safeDump(fractions));
        fs_1.default.writeFileSync(`${path}/positives.yaml`, js_yaml_1.safeDump(positives));
        fs_1.default.writeFileSync(`${path}/negatives.yaml`, js_yaml_1.safeDump(negatives));
        console.log(`Results have been written to ${path}/${filename}`);
        process.exit(0);
    }
    catch (error) {
        console.error(error);
    }
});
//# sourceMappingURL=Fetch_top_starred.js.map