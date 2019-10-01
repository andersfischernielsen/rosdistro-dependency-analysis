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
const db = monk_1.default(url);
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
        const matchWithRegex = (issues, regex) => {
            const joined = regex.join('|');
            return issues.filter((i) => {
                return ((i.body != undefined && toLower(i.body).match(joined) != null) ||
                    (i.title != undefined && toLower(i.title).match(joined) != null) ||
                    i.data_comments.some((c) => c.body != undefined && toLower(c.body).match(joined) != null));
            });
        };
        const invertMatchWithRegex = (issues, regex) => {
            return issues.filter((i) => {
                return ((i.body != undefined && toLower(i.body).match(regex) == null) ||
                    (i.title != undefined && toLower(i.title).match(regex) == null) ||
                    i.data_comments.some((c) => c.body != undefined && toLower(c.body).match(regex) == null));
            });
        };
        const fraction = (positives, all) => {
            const fraction = positives.length / all.length;
            return isNaN(fraction) || !isFinite(fraction) ? 0 : fraction;
        };
        const date = 1561161601000; //22/06/2019 00:00:01
        const allIssues = yield db.get('issues').find({
            $and: [{ owner: owner }, { repo: repository }],
        });
        const issuesWithBugLabels = allIssues.filter((i) => Date.parse(i.created_at) < date &&
            i.labels.length > 0 &&
            i.labels.some((l) => toLower(l.name).match('bug') != undefined ||
                toLower(l.name).match('critical') != undefined));
        const issuesWithComments = yield Promise.all(issuesWithBugLabels.map((i) => getCommentForIssue(i)));
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
        const withoutDependencyIssues = invertMatchWithRegex(issuesWithComments, 'depend');
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
    const filename = 'fractions.yaml';
    const path = 'results';
    const fractions = rs.reduce((acc, r) => acc.concat(r.fractions), []);
    const dependPositives = rs.reduce((acc, r) => acc.concat(r.dependencyPositives), []);
    const concurrencyPositives = rs.reduce((acc, r) => acc.concat(r.concurrencyPositives), []);
    const memoryPositives = rs.reduce((acc, r) => acc.concat(r.memoryPositives), []);
    const dependNegatives = rs.reduce((acc, r) => acc.concat(r.dependencyNegatives), []);
    try {
        if (!fs_1.default.existsSync('results')) {
            fs_1.default.mkdirSync('results');
        }
        fs_1.default.writeFileSync(`${path}/${filename}`, js_yaml_1.safeDump(fractions));
        fs_1.default.writeFileSync(`${path}/dependPositives.yaml`, js_yaml_1.safeDump(dependPositives));
        fs_1.default.writeFileSync(`${path}/concurrencyPositives.yaml`, js_yaml_1.safeDump(concurrencyPositives));
        fs_1.default.writeFileSync(`${path}/memoryPositives.yaml`, js_yaml_1.safeDump(memoryPositives));
        fs_1.default.writeFileSync(`${path}/dependencyNegatives.yaml`, js_yaml_1.safeDump(dependNegatives));
        console.log(`Results have been written to ${path}/`);
        process.exit(0);
    }
    catch (error) {
        console.error(error);
    }
});
//# sourceMappingURL=Fetch.js.map