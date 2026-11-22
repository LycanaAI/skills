---
name: lycana
description: Checks architecture work against the system architecture recorded in Lycana (lycana.ai diagrams) and proposes diagram updates for a person to approve, using the `lycana` command-line tool. Use when planning or finishing work that adds or changes architecture - a new feature, service, module, data store, external integration or route group, a change in how parts communicate, or responsibilities moving between parts - and when the user asks to map the repository, or part of it, into Lycana. Do not use for bug fixes, styling, copy, tests, dependency bumps, or refactors that stay inside one part that is already mapped.
---

# Lycana

Lycana holds this repository's architecture as diagrams. This skill compares your work with those diagrams and keeps them current. It never changes a diagram directly: every change is a proposal that a person accepts or rejects in Lycana.

## Leave now if the work is not architecture

Stop and carry on without this skill when the task is a bug fix, styling, copy, tests, a dependency bump, or a refactor that stays inside one part that is already mapped. These do not change what the diagrams say, so a check would only cost the user time.

Continue when the work adds or changes a service, module, data store, external integration or route group, changes how parts communicate, moves a responsibility from one part to another, or when the user asked to map the repository.

## Words used in this skill

Lycana's own words, used exactly:

- **Diagram**: one system design. **Canvas**: the space a diagram is arranged on.
- **Node**: a component. **Link**: a line between two nodes. **Boundary**: an area around related nodes. **Note**: free-standing text.
- **Subcanvas**: a canvas inside a node, showing that node one level deeper.
- **Linked diagram**: a separate diagram opened from a node. A node holds a subcanvas or a linked diagram, not both.
- **Source**: the repo-relative path a node describes, usually a folder. One path per node.
- **Proposal**: a diagram change waiting for a person's answer in Lycana.

This skill's words:

- **Architecture diagram**: the top diagram, named `Architecture`, showing the whole system.
- **Area**: a main part of the repository, found by reading it, such as a frontend, a backend, a command-line tool or workers. **Area diagram**: the diagram for one area.
- **Mapped**: a repo path is mapped when a node's source is that path or a folder above it. Otherwise it is **unmapped**.
- **Map stamp**: the note that records which commit a diagram was mapped at.
- **Plan check**, **diff check**: the two times this skill runs. **Verdict**: the short result of a check.

## How the architecture is laid out in Lycana

- One Lycana project per repository. Every diagram for the repository is in it.
- The Architecture diagram has one node per area. Each area node opens its area diagram as a linked diagram.
- Detail below an area lives in subcanvases of the area diagram.
- Every node that describes code carries its source. Write a source with forward slashes and no leading `./` or trailing slash, such as `services/billing`. Use the same spelling every time, because nodes are found again by their source.
- Each diagram has one map stamp on its top canvas: a note whose text is `Mapped at commit <short sha>, <YYYY-MM-DD>`. Lycana stores no commit itself, so this note is the only way to tell how old a map is.

## Steps

### 1. Preflight

Run these from the repository root:

```sh
lycana --version            # must print 0.7.1 or later
lycana auth status --json   # exit 3 means not signed in
lycana diagrams --json      # the project's diagrams
```

Go to [references/setup.md](references/setup.md) and come back when any of these is true: the command is missing or older than 0.7.1; `auth status` exits 3; its output has `"linkedDirectory": null` or `"project": null`; or no diagram is titled `Architecture`.

Keep the diagram ids and titles. Every later command takes a diagram id.

### 2. List the repo paths the work touches

- Plan check, before coding: the folders and files the plan will add or change.
- Diff check, after coding: the paths in the diff, from `git diff --name-only` against the commit the work started from.

Reduce the list to the folders that matter. Twenty files in one folder are one path.

### 3. Look each path up

Search every diagram of the project, because a search covers one diagram and its subcanvases and does not follow linked diagrams:

```sh
lycana find <diagram id> --source <path> --json
```

`--source` matches any node whose source contains the text, ignoring case. So a search for `src/pay` also returns `src/payments` and everything below it. Take the match whose source is the path itself or the nearest folder above it, and ignore the rest. No such match: drop the last path segment and search again, up to the repository root.

Each match gives the node id and `canvas.id` (`null` for the top canvas). Keep both with the diagram id: they address the node for [check.md](references/check.md) and [propose.md](references/propose.md).

With many paths, read all sources once with `lycana outline <diagram id> --depth 10 --json` and match locally.

### 4. Act on what you found

- **Mapped paths**: follow [references/check.md](references/check.md). It compares the plan or the diff with what the diagrams say and returns a verdict.
- **Unmapped paths**: tell the user which paths are not in Lycana and ask whether to map them. On yes, follow [references/map.md](references/map.md). On no, continue and say the check did not cover them.
- **The work adds or alters architecture** (a new node, a new or changed link, a moved responsibility): follow [references/propose.md](references/propose.md), at the diff check, once the code exists. At the plan check, only tell the user what the plan would add to the map.

### 5. Report

Give the user the verdict in a few lines: what matches the map, what differs, what is unmapped, how old the map is, and any proposal waiting for them with its link. The verdict is advice. Continue the work unless the user says otherwise.

## Run it twice

Run steps 2 to 5 once on the plan, before writing code, and once on the diff, after. The plan check is cheap and catches a design that fights the architecture while it is still easy to change. The diff check catches what the plan did not say, and is the only time to propose diagram changes.

## Delegate the check and the mapping

A check or a mapping reads many canvases and files. When your tool can start a subagent, give it the work so that reading stays out of your own context. Without subagents, do the work yourself.

The subagent knows nothing about this conversation. Its brief must hold:

- the repository root, and the full path of the reference file to follow (`check.md` or `map.md`), plus `propose.md` when it may propose;
- the diagram ids and titles from step 1, and the node, canvas and diagram ids from step 3;
- the plan text, or the commit range of the diff;
- the rules below, word for word;
- what to return: a verdict of at most fifteen lines, with any proposal id and link.

Read the verdict, then report to the user yourself.

## Rules that always hold

- **Send every diagram change as a proposal**, with `lycana edit --review`, even when the connection has Full access. The person, not the agent, decides what the architecture is.
- **Name only what exists.** Before a node goes into a proposal, confirm its source is in the repository with `git ls-files <path>` or the file system.
- **Mark inference.** When a node, link or description comes from a guess and not from code you read, say so in the proposal and in your report.
- **Report only what Lycana confirms.** Call a proposal accepted only after `lycana proposal <id>` says so.
- **Read `lycana --help` for anything not written here.** `lycana <command> --help` and `lycana help operations` are the current reference for options, operations and exit codes.

## Reference files

- [references/setup.md](references/setup.md): first run in a repository. Install, sign in, pick the project, link the repository.
- [references/check.md](references/check.md): compare a plan or a diff with the mapped architecture and produce the verdict.
- [references/map.md](references/map.md): map the repository, or an unmapped part of it, into Lycana.
- [references/propose.md](references/propose.md): turn one intended diagram change into a proposal and follow it to an answer. `check.md` and `map.md` both end here.
