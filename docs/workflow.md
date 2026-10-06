# Repo Collaboration Workflow

One public monorepo, `github.com/shoumiksoul01/salon-platform`, owned by Shoumik, with Shomrat as a collaborator.

**Decision:** we both commit straight to `main` for the whole project. No feature branches, no pull requests, no branch protection. Change this only if we both agree.

## One-time setup
- **Invite:** Shoumik goes to the repo, Settings, Collaborators, Add people, and adds Shomrat. Shomrat accepts the invite from his email.
- **Git identity:** each person runs `git config user.name`, `git config user.email` (the email must belong to their own GitHub account, or the commits will not count for them) and `git config pull.rebase true`.

## The loop (every edit is one commit)
```
git pull
# make one edit, run the app or the tests
git add <the files>
git commit -m "feat(FR-21): add slots table migration"
git pull
git push
```
Always `git pull` at the start of a session and again right before `git push`. If `git push` is rejected, someone pushed first: run `git pull`, then `git push` again.

## Keeping `main` healthy
- Run the app or the tests before every push. Never push something that does not start or that fails its tests.
- Keep the build green after every commit. If an FR needs several commits, order them so the app still works after each one.
- GitHub Actions CI runs on every push to `main`. If it goes red, whoever pushed fixes it first, before any new work.
- Never force-push and never rewrite history on `main`.
- Before starting an FR, tell the other person which one, and stay in your own files to avoid conflicts.

## Review without pull requests
After pushing, the other person looks at the new commits on GitHub (the Commits page) within about a day and leaves a comment on the commit or messages directly. Fixes go in as new commits (`fix(FR-NN): ...`). The reviewer checks: it runs, tests pass, it matches the FR and its use case description, no secrets.

## Rules
- **Commit messages:** `type(FR-NN): short imperative description`. Types: feat, fix, docs, test, chore, refactor.
- **File ownership:** each person edits only the files of their own FRs. Shared files are `docs/schema.sql`, database migrations, the FastAPI router registration in `backend/`, the route table and `package.json` plus its lockfile in `frontend/`, and `requirements.txt`. Before editing a shared file, `git pull`; make that change as its own small commit, push it quickly, and tell the other person to pull.
- **Migrations:** timestamp-named, one migration per change (for example `202610201430_create_slots.sql`). Never edit a migration that has been pushed; add a new one.
- **Secrets:** `.env` files are in `.gitignore`. Commit a `.env.example` with variable names only. Share real values privately, never in the repo or in a chat. If a key leaks, rotate it.
- **Conflicts:** `git pull` rebases your local commits on top of the other person's. If a conflict appears, git lists the files: fix them, run `git add <the files>`, then `git rebase --continue`, run the app and tests, then push. Never blindly accept "mine" or "theirs".
- **After finishing an FR,** update its Status on `Salon_Platform_Task_Board.xlsx`. Short weekly sync with a demo.
- **Check the commit count** any time with `git shortlog -sn --no-merges`.