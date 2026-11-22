---
name: lycana
description: Checks planned or finished code changes against the system architecture a team keeps as diagrams in Lycana (lycana.ai), and proposes diagram updates for a person to approve. Use when planning or finishing work that adds or changes architecture - a new feature, service, module, data store, external integration or route group, a change in how parts communicate, or responsibilities moving between parts - and when the user asks to map the repository, or part of it, into Lycana. Do not use for bug fixes, styling, wording or text changes, tests, dependency bumps, or refactors that stay inside one part that is already mapped. Do not use merely because a task mentions Lycana or runs the `lycana` command - this is not a guide to that tool.
---

# Lycana

Lycana holds this repository's architecture as diagrams. This skill compares your work with those diagrams and keeps them current. It never changes a diagram directly: every change is a proposal that a person accepts or rejects in Lycana.

## Leave now if the work is not architecture

Stop and carry on without this skill when the task is a bug fix, styling, a wording or text change, tests, a dependency bump, or a refactor that stays inside one part that is already mapped. These do not change what the diagrams say. A task that only mentions Lycana, or uses the `lycana` command for something else, is no reason to stay.

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
- **Covering node**: for a repo path, the node whose source is that path or the nearest folder above it, compared by whole path segments.
- **Mapped**, **placed**, **unmapped**: the three states of a repo path, decided in step 3. Mapped: the covering node has detail beneath it, or sits inside an area's own detail. Placed: the covering node is on the Architecture diagram with nothing beneath it, so Lycana knows the part exists and no more. Unmapped: no node covers the path.
- **Map stamp**: the note that records the last commit a whole diagram was compared with.
- **Plan check**, **diff check**: the two times this skill runs. **Verdict**: the short result of a check.

## How the architecture is laid out in Lycana

- One Lycana project per repository. Every diagram for the repository is in it.
- The Architecture diagram has one node per area. A mapped area's node opens its area diagram as a linked diagram. An area node with no linked diagram and no subcanvas is placed only.
- Detail below an area lives in subcanvases of the area diagram.
- A node that stands for another area inside an area diagram (a neighbour) carries no source and has exactly the name of that area's node on the Architecture diagram. So every source in an area's detail lies inside that area.
- Every node that describes code carries its source. Write a source with forward slashes and no leading `./` or trailing slash, such as `services/billing`. Use the same spelling every time, because nodes are found again by their source.
- Each diagram has one map stamp on its top canvas: a note whose text is `Mapped at commit <short sha>, <YYYY-MM-DD>`. Lycana stores no commit, so this note is the only way to tell a map's age. It moves only at a mapping, or at a diff check under step 6 of [check.md](references/check.md).

## Steps

### 1. Preflight

Run these from the repository root:

```sh
lycana --version            # must print 0.7.1 or later
lycana auth status --json   # exit 3 means not signed in
```

Go to [references/setup.md](references/setup.md) and come back when any of these is true: the command is missing or older than 0.7.1; `auth status` exits 3; or its output has `"linkedDirectory": null` or `"project": null`.

The output's `connection.mode` is the access the person gave this connection: `"propose"` is Propose, where every edit waits as a proposal, and `"apply"` is Full access, where an edit applies at once unless sent with `--review`.

Only then list the diagrams. Until the repository is linked to a project, this command lists the whole organization, and an unrelated diagram could pass for this repository's.

```sh
lycana diagrams --json      # the linked project's diagrams
```

No diagram titled `Architecture`: go to step 6 of [setup.md](references/setup.md). Otherwise keep the diagram ids and titles. Every later command takes a diagram id.

### 2. List the repo paths the work touches

- Plan check, before coding: the folders and files the plan will add or change.
- Diff check, after coding: the paths in the diff, from `git diff --name-only` against the commit the work started from.

Reduce the list to the folders that matter. Twenty files in one folder are one path.

### 3. Look each path up

Read every source once, then match locally:

```sh
lycana outline <diagram id> --depth 10 --json    # once for each diagram of the project
```

The output nests canvases under `outline`: a canvas has `canvasId` (`null` for the top canvas), `version` and `nodes`; a node has `id`, `name` and, when present, `source`, `subcanvas` (a canvas) and `linkedDiagram`. It does not follow linked diagrams, so read every diagram. A subcanvas that says `"truncated": true` was not read: read it with `--canvas <canvasId>`. An outline holds nodes only. Links, descriptions and notes come from `lycana get`, one canvas at a time.

For each path:

1. Collect the nodes whose source equals the path, or is a folder above it: the path starts with the source followed by `/`. Compare exactly and on whole segments, so `src/commands` does not cover `src/commands.ts`. Leave out a node on an area diagram whose source lies outside that area: it is a neighbour that should carry no source, so it says nothing about its own area. Report it to the user as a map defect. Of the rest, the one with the longest source is the covering node.
2. No such node: the path is **unmapped**.
3. The covering node is on the top canvas of the Architecture diagram and has neither a `linkedDiagram` nor a `subcanvas` with nodes in it: the path is **placed**.
4. Anything else: the path is **mapped**.

For mapped and placed paths keep the diagram id, the canvas id and the node id: they address the node for [check.md](references/check.md) and [propose.md](references/propose.md). A path that lies above the sources, such as `apps`, is too coarse: replace it with the folders below it that the work touches.

`lycana find <diagram id> --source <text> --json` suits a single lookup. It returns every node whose source contains the text, so it brings siblings and descendants and never a folder above. Apply rule 1 to its results.

### 4. Act on what you found

- **Mapped paths**: follow [references/check.md](references/check.md). It compares the plan or the diff with what the diagrams say and returns a verdict.
- **Placed paths**: check.md compares them at the level of the Architecture diagram only. Tell the user the part is on the map with no detail, and ask whether to map it.
- **Unmapped paths**: tell the user which paths are not in Lycana and ask whether to map them.
- For both, on yes follow [references/map.md](references/map.md). On no, continue and say what the check did not cover.
- **The work adds or alters architecture** (a new node, a new or changed link, a moved responsibility): follow [references/propose.md](references/propose.md), at the diff check, once the code exists. At the plan check, only tell the user what the plan would add to the map.

### 5. Report

Give the user the verdict in a few lines: what matches the map, what differs, what is placed or unmapped, how old the map is, and any proposal waiting for them with its link. The verdict is advice. Continue the work unless the user says otherwise.

## Run it twice

Run steps 2 to 5 once on the plan, before writing code, and once on the diff, after. The plan check catches a design that fights the architecture while it is still easy to change. The diff check catches what the plan did not say, and is the only time to propose diagram changes.

## Delegate the check and the mapping

When your tool can start a subagent, give it the check or the mapping, so that reading canvases and files stays out of your own context. A check done inline costs 10 to 15 commands and roughly 10,000 to 15,000 tokens; a subagent returns 18 lines. Without subagents, do the work yourself.

The subagent knows nothing about this conversation. Its brief must hold:

- the repository root, and the full path of the reference file to follow (`check.md` or `map.md`), plus `propose.md` when it may propose;
- the diagram ids and titles from step 1, and each path's state and node, canvas and diagram ids from step 3;
- the plan text, or the commit the work started from, for the diff;
- every proposal sent in this session, with its diagram, canvas and state, and an instruction to read the canvases itself;
- the rules below, word for word;
- what to return: a verdict of at most 18 lines, with any proposal id and link, and any change left for you to send.

[check.md](references/check.md) has this brief ready to fill in. Read the verdict, then report to the user yourself.

## Rules that always hold

- **Send every diagram change as a proposal**, with `lycana edit --review`, even when the connection has Full access. The person, not the agent, decides what the architecture is. `lycana edit --help` calls `--review` "not for routine additions"; under this skill no change to the architecture is routine.
- **Name only what exists.** Before a node goes into a proposal, confirm its source is in the repository with `git ls-files <path>` or the file system. An external system has no source: confirm it from the code that calls it.
- **Mark inference.** When a node or link comes from a guess and not from code you read, say so in the proposal and in your report. Do not describe a part you have not read: a placed node gets one line taken from its manifest or README, ending `(from manifest)` or `(from README)`.
- **Keep approvals few.** Each proposal costs the person a review. Group changes, and prefer a shallower map that needs fewer rounds.
- **Report only what Lycana confirms.** Call a proposal accepted only after `lycana proposal <id>` says so.
- **Read `lycana --help` for anything not written here.** `lycana <command> --help` and `lycana help operations` are the current reference for options, operations and exit codes.

## Reference files

- [references/setup.md](references/setup.md): first run in a repository. Install, sign in, pick the project, link the repository.
- [references/check.md](references/check.md): compare a plan or a diff with the mapped architecture and produce the verdict.
- [references/map.md](references/map.md): map the repository, or a placed or unmapped part of it, into Lycana.
- [references/propose.md](references/propose.md): turn one intended diagram change into a proposal and follow it to an answer. `check.md` and `map.md` both end here.
