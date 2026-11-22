# Check: compare a plan or a diff with the mapped architecture

Follow this when step 3 of [SKILL.md](../SKILL.md) found nodes for the paths the work touches. You arrive with a diagram id, a canvas id (`null` for the top canvas) and a node id for each mapped path.

A check reads the diagrams, reads the work, and returns a verdict. It is advice: it never blocks the work and never edits code. It runs at two moments:

- **Plan check**, before coding. Input: the plan and the paths it will touch. Output: the verdict, and a list of the diagram changes the work will need. It sends no proposal, because nothing exists yet to confirm them against.
- **Diff check**, after coding. Input: the real diff. Output: the verdict, and one proposal per diagram for the changes the code confirms.

## Hand it to a subagent

A check reads several canvases and many files. When your tool can start a subagent, give it this brief, filled in, so that reading stays out of your context. Without subagents, do steps 1 to 6 yourself. If you are that subagent, start at step 1.

```text
Run a Lycana <plan | diff> check and return a verdict. Do not edit code.
Repository root: <path>
Follow, from "Steps": <full path of check.md>
For proposals (diff check only): <full path of propose.md>
Diagrams: <id and title of every diagram in the project>
Touched paths and the nodes that cover them:
  <path> -> diagram <id>, canvas <id or "top">, node <id> "<name>"
Touched paths with no node (unmapped): <paths, or "none">
Work to check: <the plan, in full | commit range <base>...HEAD>
Proposals already sent in this session: <proposal ids, or "none">
Rules: <the "Rules that always hold" section of SKILL.md, word for word>
Return only the verdict, in the format check.md gives, at most 15 lines.
```

## Steps

### 1. Read the work

- Plan check: the plan text. Open the existing files it names, so you know what is there now.
- Diff check: `git diff <base>...HEAD --stat`, then the changed files themselves. Read the code, not only the commit messages: the diff check exists to catch what the plan did not say.

Write down what the work adds, changes, moves and removes, as parts and as communication between parts. Mark each item `read` (you saw it in code), `plan` (the plan states it) or `inferred` (your guess).

### 2. Read just enough of the diagrams

Read canvases, not whole diagrams. A verdict needs the touched nodes and their surroundings.

```sh
lycana outline <diagram id> --json                      # names, ids and sources, nested by canvas
lycana get <diagram id> [--canvas <canvas id>] --json   # one canvas in full
```

- Run `get` on each canvas that holds a touched node. From it take that node's `description` and `details`, every link that starts or ends at the node, with its label and direction, the boundary the node sits in, and the node at the other end of each link.
- Go one level up for context. `canvas.path` in the `get` output names the node that holds this canvas; read that node and its links on the canvas above. For an area diagram's top canvas, the level above is the area's node on the Architecture diagram.
- Use `outline` to see what else is mapped near the touched paths, such as sibling folders. It has no links or descriptions, so it cannot replace `get`.
- Stop there. Canvases the work does not touch are not evidence.

### 3. Say how old the map is

Each diagram's top canvas has a map stamp: a note whose text is `Mapped at commit <short sha>, <YYYY-MM-DD>`. Find it in `notes` of `lycana get <diagram id> --json`, then ask the repository what changed since:

```sh
git cat-file -e <sha>^{commit}                    # fails when the repository does not know the commit
git rev-list --count <sha>..HEAD -- <paths>       # commits touching the mapped paths since the stamp
git log --oneline <sha>..HEAD -- <path>           # what they were
```

Use the sources of the touched nodes as `<paths>`. Report the stamp and the count in the verdict. Zero commits means the map is current for those paths. Commits that are not part of the work mean the map may already be out of date, which matters in step 5.

- No stamp: say the age is unknown.
- The commit is unknown to the repository (a shallow clone, rewritten history): say so, and use the date instead with `git log --oneline --since=<date> -- <path>`.

### 4. Compare

Answer each question for the touched nodes. Each "no" or "yes, and the diagram lacks it" is a finding.

- **Place**: does the work put code where the diagram says that responsibility lives? Compare each new file's folder with the node whose `description` claims the job.
- **New parts**: does the work add a service, module, data store or external service that no node describes?
- **Communication**: does the work add or change how parts talk: a new link, a reversed direction, a different protocol or label?
- **Boundaries**: does the work reach across a boundary the diagram draws, or around a node the diagram routes through, such as a client calling a data store directly when the diagram puts a service between them?
- **Removed or renamed**: does the work delete, move or rename a mapped folder or file?
- **Sources**: does each touched node's source still exist? `git ls-files <source>` printing nothing means it is gone.

A finding needs evidence on both sides: a node or link named from the diagram, and a file path or plan line from the work. With only one side, it is not a finding. Leave it out, or put the question in the `Next` line.

### 5. Name the cause of each finding

The same mismatch has three possible causes, and the remedy differs:

- **Departs**: the diagram records a decision and the work goes against it. Signs: the node's `description` or a boundary states the rule, and step 3 shows the map is current there. Remedy: the user decides, either change the work or change the architecture on purpose.
- **Out of date**: the work is sound and the diagram simply has not caught up. Signs: the work extends what is drawn without contradicting it, or step 3 shows earlier commits already moved the code. Remedy: a diagram update.
- **Unmapped**: no node covers the path, so the diagram says nothing. Remedy: offer mapping, see [map.md](map.md).

When you cannot tell departs from out of date, say so in the finding and let the user decide. Do not settle it by assuming the code is right.

### 6. Turn confirmed changes into proposals (diff check only)

At the plan check, list the changes under `Diagram changes` in the verdict and stop.

At the diff check:

1. Take the out-of-date findings whose code side is marked `read`. Leave departs findings alone until the user chooses to change the architecture.
2. Group the changes by diagram, then by canvas.
3. For each diagram, check any proposal already sent to it with `lycana proposal <proposal id> --no-wait --json`. Exit 6 means it still waits: send nothing to that diagram, and list your changes in the verdict as not sent.
4. Send one proposal per diagram, following [propose.md](propose.md). A connection has one waiting proposal per diagram, and a new one anywhere in that diagram replaces it, so two proposals to one diagram would lose the first.
5. An edit covers one canvas. When a diagram needs changes on two canvases, send the higher canvas first and list the rest in the verdict as "after the answer".

## The verdict

Return exactly this, at most 15 lines:

```text
Lycana <plan | diff> check: <result>
Read: <diagram title> / <canvas>, ... Map stamp <sha>, <date>; <n> commits on these paths since.
Findings:
1. <departs | out of date | unmapped>: <what differs, one sentence>.
   Diagram: "<node or link name>" <what it says>. Work: <file path> (<read | plan | inferred>).
2. ...
Diagram changes: <nodes and links to add, change or remove | none>
Proposals: <proposal id and diagram link | not sent: <why> | none at a plan check>
Next: <one recommended step>
```

`<result>` is one of:

- `fits`: no findings.
- `fits, diagram needs updating`: every finding is out of date.
- `conflicts`: at least one finding departs.
- `cannot tell (<why>)`: the evidence is missing, such as unmapped paths, a plan too vague to place, or a map too old to trust.

Put departs findings first. With more findings than fit, keep the most serious and end the list with `<n> more, same cause`. Leave out everything that matches; the result line already says it.

## What the main agent does with the verdict

- Show the user the verdict, shortened to the result, the findings and any proposal link. Do this at both checks, even on `fits`.
- On `conflicts`, ask the user before continuing down the conflicting path: change the work, or change the architecture on purpose. Work that does not depend on the answer can go on.
- When the user chooses to change the architecture, that choice makes the finding out of date: propose the change at the diff check.
- Change a diagram only for a difference the user has seen. Sending a proposal that quietly redraws the diagram to match the code hides the conflict the check found.
- On `cannot tell`, say what the check did not cover and carry on.

## Edge cases

- **Several areas**: run steps 2 to 5 per area diagram, and read the Architecture diagram for links between areas. Return one verdict. Each diagram gets its own proposal.
- **Partly mapped**: check the mapped paths, list the unmapped ones as unmapped findings, and give `cannot tell` only when the unmapped part is where the architecture change is.
- **A sibling of a mapped folder**: the node's source is `services/billing` and the work adds `services/invoicing`. The new folder is not covered by that node. Treat it as a new part on the canvas that holds the sibling, not as unmapped territory that needs a mapping.
- **A proposal already waits on the same objects**: sending exits 7 when another agent's proposal holds them. Do not retry. Report what waits and list your changes as not sent. Your own waiting proposal is replaced instead, which is why step 6 checks first.
- **A very old map**: many commits since the stamp, several sources gone, or canvases that no longer resemble the folders. Give `cannot tell (map out of date)` and recommend mapping the area again with [map.md](map.md). A run of proposals cannot repair a map that no longer describes the code.
