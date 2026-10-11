# Repo Collaboration Workflow

One public monorepo, `github.com/shoumiksoul01/salon-platform`, owned by Shoumik, with Shomrat as a collaborator. **Decision: we both commit straight to `main`, for the whole project. No feature branches, no pull requests, no branch protection.** Change this only if we both agree. Because there is no review gate, the rules below are what keeps `main` working.

## One-time setup (each person, once)
- **Invite:** Shoumik goes to the repo, Settings, Collaborators, Add people, and adds Shomrat. Shomrat accepts the invite from his email.
- **Git identity and pull behaviour:**
  ```
  git config user.name "Your Name"
  git config user.email "the email of your GitHub account"
  git config pull.rebase true
  git config rebase.autoStash true
  ```
  The email must belong to your own GitHub account, or the commits will not count for you. `autoStash` lets `git pull` work even with uncommitted changes.
- **Line endings:** on Windows run `git config core.autocrlf true`; on Mac or Linux run `git config core.autocrlf input`. In VS Code set `"files.eol": "\n"`. This stops whole-file diffs that only change line endings.
- **Same tool versions:** agree the Node and Python versions in phase 0 and write them in `docs/workflow.md` (in the commit that adds them, for example Shoumik's commit 4 or 5, when the scaffolds need them). Both install exactly those, so "works on my machine" problems do not start.
- **Do not run a formatter over files you do not own.** Format only the files you are changing.

## Accounts and who owns them
| Account | Owner | Shared with | Notes |
|---|---|---|---|
| GitHub repo | Shoumik | Shomrat (collaborator) | Actions secrets are set by Shoumik |
| Supabase (two free projects: dev and demo) | Shoumik | Shomrat, as a team member if the free plan allows it; otherwise the dev connection details are sent privately | One shared dev database for both of us, see "Database migrations" |
| Render (backend) and Cloudflare Pages or Vercel (frontend) | Shoumik | Shomrat, if needed | If they deploy from `main` automatically, a bad push breaks the live demo: stop pushing an hour before a demo, or switch to manual deploy |
| SSLCommerz sandbox | Shomrat applies | Credentials sent to Shoumik privately | Needed before phase 6 |
| Email service (Resend or Brevo) | Shoumik | API key sent privately | Needed for OTP in phase 2 |

Real values for keys and passwords are always sent privately (never in the repo or in a chat). Both of us keep our own `.env` file.

## The loop (every edit is one commit)
```
git pull
# make one edit, run the app or the tests
git status
git add <the files>
git commit -m "feat(FR-03.2): add slots table migration"
git pull
git push
```
`git status` before `git add` shows whether anything of the other person's, or a `.env`, is about to go in. Always `git pull` at the start of a session and again right before `git push`. If `git push` is rejected, someone pushed first: run `git pull`, then `git push` again.

## Before every push (this is the whole review gate)
1. The app starts, or the tests pass: backend `pytest`, frontend `npm run build` (and `npm test` once tests exist).
2. `git status` shows only your files, and no `.env` or key.
3. Nothing of the other person's is half-changed.
If CI (phase 0, commit 9) goes red after your push, you fix it first, before any new work.

## Keeping `main` healthy
- Never push something that does not start or that fails its tests.
- Keep the build green after every commit. If an FR needs several commits, order them so the app still works after each one.
- Never force-push and never rewrite history on `main`. That also protects the 200-commit count.

## Who works on what, and when (avoid overlap)
- Before starting an FR or page, send the other person one line ("starting FR-03.2"). Before changing a shared contract (schema, an API response shape, a mock shape, the shared kit), message first and agree.
- If you are blocked by the other person's unfinished work, do not wait: take the next item on your own list that does not depend on it, and tell them what you need.
- Hand-offs that other work waits for:
  - **Phase 0:** Shomrat's commit 6 is done and his commits 7 and 8 (docs only) can go at any time; his commit 9 (CI) starts after Shoumik's commit 5; commit 10 (draft schema) is designed together.
  - **Phase 1:** Shomrat's layouts and pages start after UI-SK-01 to UI-SK-06 are pushed; UI-SM-01 (fixtures) can start at once.
  - **Phase 2 and later:** FR-01.5 (Shomrat) is pushed before FR-03.2 (Shoumik) starts, and FR-01.2 (Shoumik) is pushed before FR-03.2 too. FR-10.1 (Shoumik) needs FR-01.1 (Shomrat). C-08 (Shomrat) is pushed before FR-05.1, FR-05.3 and FR-06.4. FR-03.3 (Shomrat) comes after FR-03.2's slot schema is agreed. The SSLCommerz credentials arrive before phase 6.

## Shared files (the usual conflict spots)
| File | Rule |
|---|---|
| `package.json` and `package-lock.json` | Add a dependency in its own commit, push at once, message the other, who pulls and runs `npm install`. On a lockfile conflict never edit it by hand: `git checkout --ours package-lock.json` (during a rebase, "ours" is the other person's version), run `npm install`, `git add package-lock.json`, `git rebase --continue` |
| `requirements.txt` | One package per line, kept in alphabetical order. Own small commit. If both lines were added, keep both |
| `backend/app/main.py` (router registration) | One line per feature router, each feature in its own router file. Add the line in its own tiny commit. On a conflict, keep both lines |
| `frontend/src/routes/` | One file per layout (the UI plan, section 6A of the project context file), so each person edits their own |
| `frontend/src/locales/` | One file pair per area (the UI plan, section 6A of the project context file), so each person edits their own |
| `frontend/src/components/kit/` | Owned by Shoumik. Shomrat asks, or makes a small separate commit after telling him |
| `docs/schema.sql` and migrations | See "Database migrations" below |
| This context file | Either of us may edit it in a small `docs:` commit. Pull first, tell the other person, and both chats paste the latest version from the repo |
| `Salon_Platform_Task_Board.xlsx` | Only Shoumik edits it (section 6 of the project context file), weekly |

## Database migrations (one shared dev database)
- Timestamp-named, one migration per change (for example `202610201430_create_slots.sql`). Never edit a migration that has been pushed; add a new one.
- Update `docs/schema.sql` in the same commit as the migration.
- Order: write the migration, apply it to the dev database, run the tests, push. The other person pulls and runs the same apply command, so the dev database never gets a migration twice and a pushed migration is always one that worked.
- If two people need to change the same table (for example the slot and booking tables for FR-03.2 and FR-03.3), agree the change in chat first, then one person writes it.
- Do not run destructive commands (drop, truncate) on the shared dev database without telling the other person. The second Supabase project is for the demo only.

## Review without pull requests
After pushing, the other person looks at the new commits on GitHub (the Commits page) within about a day and leaves a comment on the commit or messages directly. Fixes go in as new commits (`fix(FR-NN.N): ...`). The reviewer checks: it runs, tests pass, it matches the FR and its use case description, no secrets.

## Rules
- **Commit messages:** `type(FR-NN.N): short imperative description`. Types: feat, fix, docs, test, chore, refactor. In phase 1 the scope is `ui` instead of an FR id, for example `feat(ui): Home page with hero search, nearby shops and featured offers`. A wire-up commit uses the FR id, for example `feat(FR-03.2): wire slot grid to the real API`.
- **File ownership:** each person edits only the files of their own FRs. In the frontend: pages, layouts, route files and locale files belong to the person who owns that page or layout (the UI plan, section 6A of the project context file); each `frontend/src/api/<feature>.ts` module belongs to the owner of that FR. Shared files follow the table above.
- **Secrets:** `.env` files are in `.gitignore`. Commit a `.env.example` with variable names only. If a key leaks, rotate it first (the repo is public, so removing it from the code is not enough).
- **Conflicts:** `git pull` rebases your local commits on top of the other person's. If a conflict appears, Git lists the files: fix them, run `git add <the files>`, then `git rebase --continue`, run the app and tests, then push. Never blindly accept "mine" or "theirs"; paste the conflict to Claude if unsure.
- **Check the commit count** any time with `git shortlog -sn --no-merges`.

## When something goes wrong
| Problem | What to do |
|---|---|
| `git push` rejected | Someone pushed first. `git pull`, then `git push` |
| Conflict during `git pull` | Fix the listed files, `git add`, `git rebase --continue`. If you are lost: `git rebase --abort` puts you back where you were, and nothing is lost |
| CI went red after your push | Fix it first, as a new `fix(...)` commit |
| Last commit is wrong and not pushed yet | `git reset --soft HEAD~1`, fix, commit again |
| Last commit is wrong and already pushed | `git revert <hash>` (a new commit; never rewrite history) |
| A secret was committed | Rotate the key now. Then remove it from the file in a new commit and tell the other person |
| Commits went in under the wrong name or email | Fix `git config` now. Old commits stay as they are; do not rewrite history |
| The other person's change broke your work | Message them with the commit hash and the error. Do not "fix" their files yourself unless you agree it |

## Progress log (no commits needed)
One pinned GitHub Issue in this repo called **Progress log**. At the end of every session each of us adds a comment: Done, In progress, Blocked, Next step, Needs from the other person. Use it to ask for something too. Once a week, at the sync, Shoumik copies the statuses into the task board.

## Where the rest is
The project context file (`docs/Project_Context_Salon_Platform.md`, added in phase 0) holds the requirements, the plan and the UI conventions. This file is only the day-to-day git workflow.

