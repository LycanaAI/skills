# Setup: first run in a repository

Follow this when the preflight in [SKILL.md](../SKILL.md) fails. Start at the first step that is not yet done, then return to the preflight.

Setup needs the person several times: to approve the sign-in, to choose the project, and to agree to what gets committed. Ask each time and wait for the answer.

## 1. Install the tool

```sh
lycana --version
```

Missing, or older than 0.7.1: ask the user before installing, because this installs software globally on their machine.

```sh
npm install -g lycana    # needs Node 20 or later
```

Without Node, tell the user that standalone binaries for macOS, Linux and Windows exist (the `lycana` page on npm says where), and let them install one.

Done when `lycana --version` prints 0.7.1 or later.

## 2. Sign in

```sh
lycana auth status
```

Exit 0: already signed in, go to step 3. Exit 3: sign in.

```sh
lycana login
```

The command prints a link and a short code at once, then waits up to ten minutes for the person to approve. Run it so you can read its output while it waits, in the background if your tool allows that. Give the user the link and the code. If you cannot keep a command running, ask the user to run `lycana login` in their own terminal.

In the browser the person checks the code and chooses how much this connection may do:

- **Propose**: every change waits as a proposal for their answer.
- **Full access**: changes apply as they are made.

Recommend Propose. This skill sends every change as a proposal either way, and Propose makes Lycana enforce that for any other use of the same connection.

On a machine with no browser, or in automation, see `lycana login --help` for signing in with an agent key. Never ask the user to paste a key into the conversation.

Done when `lycana auth status` exits 0. It names the connection and says whether it proposes changes or has Full access.

## 3. Choose the project

The convention is one Lycana project per repository, holding every diagram for it.

```sh
lycana orgs --json        # Personal, and the organizations the person belongs to
lycana projects --json    # the projects in them
```

Show the user the organizations and projects and ask which one is this repository's. Do not guess from names: a diagram proposed into the wrong project lands in front of the wrong people.

If there is no project for this repository yet, ask the user to create one, named after the repository: in Lycana's dashboard, the Projects list in the sidebar has a "New project" control. The tool lists projects but cannot create them. Run `lycana projects --json` again once they say it is done.

Tell the user about [the Free plan limit](#the-free-plan-limit) now if the organization may be on Free, not after a command fails.

Done when you hold one organization id and one project id that the user confirmed.

## 4. Link the repository

From the repository root:

```sh
lycana link --org <org id> --project <project id>
```

Pass both options. Without `--org` the command asks a question, which fails when no person is at the terminal.

The command writes `.lycana/config.json` and adds a `.lycana` line to the repository's `.gitignore`, creating that file if there is none. Tell the user: this is a change to a tracked file that they did not ask for by name. From then on, commands run anywhere in the repository use that organization and project, so `lycana diagrams` lists only this repository's diagrams.

Done when `lycana auth status --json` shows `linkedDirectory` as the repository root and a `project` that is not `null`.

## 5. Decide what to commit

`.lycana/config.json` holds the address of the Lycana API and the ids and names of the organization and project. It holds no secret: the sign-in key is kept in the system credential store, outside the repository. Read the file and confirm that before you tell the user it is safe.

The folder is now ignored, so each clone and each git worktree has to be linked again. Committing the file removes that step for teammates and their agents. Ask the user which they want:

- **Keep it ignored**: the `.gitignore` change from step 4 is still uncommitted. Ask whether to commit it or leave it to them. Tell the user the two ids, so they can link another checkout with the command from step 4.
- **Share it**: stage the file with `git add -f .lycana/config.json`. The `-f` is needed because the folder is ignored; once tracked, the file stays tracked. In a public repository, mention that the organization's and project's names become public with it.

If this skill was installed into the repository, the installer left the skill's folder and possibly a `skills-lock.json` file there. Name them too. Whether any of these files is committed is the user's decision; make a commit only when they ask.

## 6. Look for the Architecture diagram

```sh
lycana diagrams --json
```

- A diagram titled `Architecture` exists: setup is done. Return to the preflight in [SKILL.md](../SKILL.md).
- None exists: the repository is not mapped yet. Tell the user, and ask whether to map it now. On yes, follow [map.md](map.md), which creates the Architecture diagram and the area diagrams. On no, stop using this skill for this task and say that the work was not checked against Lycana.
- The project has diagrams, but none titled `Architecture`: ask the user whether one of them is the top diagram before creating anything. Do not rename a diagram to fit: a diagram's name cannot be sent as a proposal, and the person cannot undo the rename.

## The Free plan limit

An organization on Lycana's Free plan keeps three saved diagrams, which Lycana also calls saved canvases. Every top-level diagram in the organization counts, in any project. Subcanvases do not count. `lycana create` is refused when the organization already has three, with exit 1 and code `upgrade_required`; the same code comes back for an edit to a diagram the plan holds read-only. The message names a diagram that can still change. Paid plans have no limit.

The tool does not report the plan. When a mapping would create diagrams and you do not know the plan, ask the user. [map.md](map.md) says how to map with few diagrams.
