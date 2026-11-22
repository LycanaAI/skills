# Check: compare a plan or a diff with the mapped architecture

Follow this when step 3 of [SKILL.md](../SKILL.md) found a covering node for at least one path the work touches. You arrive with each path's state (mapped, placed or unmapped) and, for mapped and placed paths, a diagram id, a canvas id (`null` for the top canvas) and a node id.

A check reads the diagrams, reads the work, and returns a verdict. It is advice: it never blocks the work and never edits code. It runs at two moments:

- **Plan check**, before coding. Input: the plan and the paths it will touch. Output: the verdict, and a list of the diagram changes the work will need. It sends no proposal, because nothing exists yet to confirm them against.
- **Diff check**, after coding. Input: the real diff. Output: the verdict, and at most one proposal per diagram for the changes the code confirms.

## Hand it to a subagent

When your tool can start a subagent, give it this brief, filled in, so that reading stays out of your context. Without subagents, do steps 1 to 6 yourself. If you are that subagent, start at step 1.

```text
Run a Lycana <plan | diff> check and return a verdict. Do not edit code.
Repository root: <path>
Follow, from "Steps": <full path of check.md>
For proposals (diff check only): <full path of propose.md>
Diagrams: <id and title of every diagram in the project>
Touched paths and their covering nodes:
  <path> -> <mapped | placed>, diagram <id>, canvas <id or "top">, node <id> "<name>"
Touched paths with no covering node (unmapped): <paths, or "none">
Work to check: <the plan, in full | commits <base>..HEAD, where <base> is the commit the work started from>
Proposals from this session: <id, diagram, canvas, and waiting | accepted | rejected; or "none">
Rules: <the "Rules that always hold" section of SKILL.md, word for word>
Read each canvas you need yourself with `lycana get`: you hold no canvas contents or versions yet.
Return only the verdict, in the format check.md gives, at most 18 lines.
```

## Steps

### 1. Read the work

- Plan check: the plan text. Open the existing files it names, so you know what is there now. When the plan adds something the system may already have, such as a handler or a client, search for it with `git grep -n`.
- Diff check: `git diff <base>...HEAD --stat`, then the changed files themselves. Read the code, not only the commit messages: the diff check exists to catch what the plan did not say.

Write down what the work adds, changes, moves and removes, as parts and as communication between parts. Mark each item `read` (you saw it in code), `plan` (the plan states it) or `inferred` (your guess).

### 2. Read just enough of the diagrams

Read canvases, not whole diagrams, and only those that hold a touched node. One canvas of fifteen nodes is about 27 KB of JSON, most of it layout, so filter it when `jq` is installed:

```sh
lycana get <diagram id> [--canvas <canvas id>] --json | jq -c '{version, path: .canvas.path,
  nodes: [.nodes[] | {id, name, source, description, details, boundary}],
  links: [.links[] | {id, label, from: .from.id, to: .to.id}],
  boundaries: [.boundaries[] | {id, name}], notes: [.notes[] | {id, text}]}'
```

That keeps about a quarter. Without `jq`, write the output to a file outside the repository and read only those fields.

- From each canvas take the touched node's `description` and `details`, every link that starts or ends at the node, with its label and direction, the boundary the node sits in, and the node at the other end of each link.
- Go one level up for context. `path` names the node that holds this canvas; read that node and its links on the canvas above. For an area diagram's top canvas, the level above is the area's node on the Architecture diagram.
- To see what else is mapped near the touched paths, such as sibling folders, run `lycana outline <diagram id> --json`. It holds nodes only.
- A placed path has one thing to read: its area node on the Architecture diagram's top canvas, with that node's links. Nothing lies beneath it.
- A node with no source in an area diagram, named as an area node on the Architecture diagram, is a neighbour. It stands for that other area as a whole and is not evidence about what is inside it.
- Stop there. Canvases the work does not touch are not evidence.

### 3. Say how current each diagram is

A map stamp, `Mapped at commit <short sha>, <YYYY-MM-DD>`, says that the whole diagram was compared with the code at that commit, and nothing later. Find it in `notes` of the diagram's top canvas. For each diagram that holds a touched node, or that you will propose to, count the commits it has not been compared with:

```sh
git cat-file -e <sha>^{commit}                    # fails when the repository does not know the commit
git rev-list --count <sha>..<base> -- <sources>   # commits before the work that the diagram never saw
git log --oneline <sha>..<base> -- <sources>      # what they were
```

- `<base>` is the commit the work started from; at a plan check, `HEAD`. The work's own commits never count against the map: this check compares them.
- `<sources>` are the diagram's sources. For an area diagram, the area's source, which is the source of its node on the Architecture diagram. For the Architecture diagram, the sources of the nodes on its top canvas.
- Zero: the diagram was current when the work began. Report `current`.
- More: report `<n> commits not compared`. That is not a finding. It matters in step 5 only when one of those commits changed the code a finding is about.
- A placed node was never compared with the code, so the stamp says nothing about its area.
- No stamp: say the age is unknown. A commit the repository does not know (a shallow clone, rewritten history): say so, and use the date with `git log --oneline --since=<date> -- <sources>`.

### 4. Compare

Answer each question for the touched nodes. Each "no" or "yes, and the diagram lacks it" is a finding.

- **Place**: does the work put code where the diagram says that responsibility lives? Compare each new file's folder with the node whose `description` claims the job.
- **New parts**: does the work add a service, module, data store or external service that no node describes?
- **Communication**: does the work add or change how parts talk: a new link, a reversed direction, a different protocol or label?
- **Boundaries**: does the work reach across a boundary the diagram draws, or around a node the diagram routes through, such as a client calling a data store directly when the diagram puts a service between them?
- **Removed or renamed**: does the work delete, move or rename a mapped folder or file?
- **Sources**: does each touched node's source still exist? `git ls-files <source>` printing nothing means it is gone.

A finding needs evidence on both sides: a node or link named from the diagram, and a file path or plan line from the work. Two kinds of finding have one side only, and say so in their label:

- **Code only**: code already in the repository bears on the work and no diagram shows it, such as a handler that already does what the plan would build. Cite the file path and line.
- **Cannot tell from the map**: judging a claim needs a node the diagram does not have, such as a data store when the plan writes to a database. Say that for this one point. Do not stand a nearby node in as evidence.

Anything else with one side is not a finding. Leave it out, or put the question in the `Next` line.

### 5. Name the cause of each finding

The remedy depends on the cause:

- **Departs**: the diagram records a decision and the work goes against it. Signs: the node's `description` or a boundary states the rule, and no uncompared commit from step 3 touched that code. Remedy: the user decides, either change the work or change the architecture on purpose.
- **Out of date**: the work is sound and the diagram simply has not caught up. Signs: the work extends what is drawn without contradicting it, or an uncompared commit from step 3 already moved the code. Remedy: a diagram update.
- **Code only**: the diagram is silent and the code is not. Remedy: tell the user what exists, because it may change the plan. When that code lies in a mapped part, also list the missing node or link under `Diagram changes`, which step 6 may propose.
- **Cannot tell from the map**: remedy: offer to add the missing node, as a diagram change once code confirms it.
- **Placed**: the path's covering node is on the Architecture diagram with no detail. The diagram says that the area exists and what it talks to, and no more. Judge only the links between areas, say that nothing inside the area was checked, and offer mapping, see [map.md](map.md).
- **Unmapped**: no node covers the path, so the diagram says nothing. Remedy: offer mapping.

When you cannot tell departs from out of date, say so in the finding and let the user decide. Do not settle it by assuming the code is right.

### 6. Turn confirmed changes into proposals (diff check only)

At the plan check, list the changes under `Diagram changes` in the verdict and stop.

At the diff check:

1. Take the diagram changes whose code side is marked `read`. Leave departs findings alone until the user chooses to change the architecture. Do not add detail for a placed or unmapped area this way: that is a mapping.
2. Sort them. A **structural** change alters what the diagram says about parts or communication: a node added or removed, a link added or changed, a responsibility or a source moved. A **wording** change only makes a description fuller. Spend an approval on structural changes only. Add a wording change to a proposal that is going to its canvas anyway; otherwise list it under `Diagram changes` as `wording, not sent`.
3. Group the changes by diagram, then by canvas.
4. For each diagram, check any proposal already sent to it with `lycana proposal <proposal id> --no-wait --json`. Exit 6 means it still waits: send nothing to that diagram, and list your changes in the verdict as not sent.
5. Send one proposal per diagram, following [propose.md](propose.md). A new proposal anywhere in a diagram replaces the one waiting there, so two to one diagram would lose the first.
6. An edit covers one canvas. When a diagram needs structural changes on two canvases, send the higher canvas now. For each other canvas, write its operations file, save it outside the repository, and list it under `To send`, naming any `tempId` in it that the first proposal's answer must replace with a real id. The main agent sends it after the answer, because a subagent has returned by then.
7. Move the stamp when the diagram is now current. Add `{"op": "update_note", "id": "<stamp note id>", "text": "Mapped at commit <short sha of HEAD>, <today>"}` to a top-canvas proposal when all of these hold: step 3 counted zero for that diagram; the work is committed; you compared every path the diff changes under the diagram's sources; and every change you found for the diagram is sent or listed under `To send`, with no departs finding open. The diff then covers every commit since the old stamp. Otherwise leave the stamp: it must never claim more than was compared. When they hold and nothing else goes to that top canvas, do not send the stamp alone: report `can move to <sha>`.

## The verdict

Return exactly this, at most 18 lines:

```text
Lycana <plan | diff> check: <result>
Read: <diagram title> / <canvas>, ...
Stamps: <diagram title> <sha>, <date>: <current | <n> commits not compared | moved to <sha> in the proposal | can move to <sha>>; ...
Findings:
1. <departs | out of date | code only | cannot tell from the map | placed | unmapped>: <what differs, or what was not checked, one sentence>.
   Diagram: <"<node or link name>" and what it says | none>. Work: <file path, with the line for code only> (<read | plan | inferred>).
2. ...
Diagram changes: <nodes and links to add, change or remove | wording, not sent: ... | none>
Proposals: <proposal id and the link of the canvas that holds it | not sent: <why> | none at a plan check>
To send: <after <proposal id> is answered: <file path>, diagram <id>, canvas <id>, what it changes | none>
Next: <one recommended step>
```

`<result>` is the most serious of these that applies:

- `conflicts`: at least one finding departs.
- `cannot tell (<why>)`: the evidence is missing, such as placed or unmapped paths, a missing node, a plan too vague to place, or a map too old to trust.
- `fits, diagram needs updating`: every finding is out of date or code only.
- `fits`: no findings.

Put departs findings first, then code only. With more findings than fit, keep the most serious and end the list with `<n> more, same cause`. Leave out everything that matches; the result line already says it.

## What the main agent does with the verdict

- Show the user the verdict, shortened to the result, the findings and any proposal link. Do this at both checks, even on `fits`.
- On `conflicts`, ask the user before continuing down the conflicting path: change the work, or change the architecture on purpose. Work that does not depend on the answer can go on.
- When the user chooses to change the architecture, that choice makes the finding out of date: propose the change at the diff check.
- Change a diagram only for a difference the user has seen. Sending a proposal that quietly redraws the diagram to match the code hides the conflict the check found.
- On `cannot tell`, say what the check did not cover and carry on.
- `To send`: once `lycana proposal <id> --no-wait --json` shows the earlier proposal accepted, send each listed file as step 4 of [propose.md](propose.md) says. If it was rejected, ask the user before sending the rest.
- `can move to <sha>`: tell the user that one more approval would move that diagram's stamp, and send it only on yes.

## Edge cases

- **Several areas**: run steps 2 to 5 per area diagram, and read the Architecture diagram for links between areas. Return one verdict. Each diagram gets its own proposal.
- **Partly mapped**: check the mapped paths, list the placed and unmapped ones as findings of that kind, and give `cannot tell` only when the architecture change is in a placed or unmapped part.
- **A sibling of a mapped folder**: the node's source is `services/billing` and the work adds `services/invoicing`. If the folder above them is mapped, the new folder is a new part on the canvas that holds the sibling, not territory that needs a mapping.
- **A very old map**: many commits not compared, several sources gone, or canvases that no longer resemble the folders. Give `cannot tell (map out of date)` and recommend mapping the area again with [map.md](map.md).
