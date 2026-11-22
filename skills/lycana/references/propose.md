# Propose: turn a diagram change into a proposal

Follow this whenever you want a diagram to change. A proposal is the only way this skill changes a diagram: the person sees the change in Lycana and accepts or rejects it there.

Work on one canvas at a time. A canvas is addressed by its diagram id, plus `--canvas <canvas id>` when it is a subcanvas. Leave `--canvas` out for the top canvas. One edit covers one canvas, so changes on two canvases of the same diagram go one after the other, each after the previous one is answered.

## One waiting proposal per diagram

Lycana keeps one waiting proposal per connection per diagram, counting all of the diagram's subcanvases. A second proposal anywhere in the same diagram replaces the first, which then ends as rejected with reason `replaced`. The person may be halfway through reading the first one, so:

- Group everything you want changed on a canvas into one proposal.
- Before proposing to a diagram, check any proposal you already sent to it (step 5). If it is still waiting, do not send another. Report it and move on.
- Different diagrams wait independently. The Architecture diagram and each area diagram can each hold one waiting proposal at the same time.
- Send a replacement on purpose only when the user asks you to revise a waiting proposal. Send the whole revised change, not the difference.

No command lists waiting proposals, so keep every proposal id you are given.

## Steps

### 1. Confirm the change is real

For each node you will add or point at code, confirm its source exists: `git ls-files <path>` prints something, or the folder is on disk. Drop any node that fails. Note which nodes, links and descriptions you inferred and did not read from code; step 4 needs that list.

### 2. Read the canvas

```sh
lycana get <diagram id> [--canvas <canvas id>] --json
```

Keep `version` and the `id` of every object you will link to, change or place a node beside. Each canvas has its own version. Check that what you intend to add is not already there under another name or source. Reuse a read made earlier in the same task, and keep it small with the `jq` filter in step 2 of [check.md](check.md).

Skip this read for a canvas you know is new and empty: a diagram you made with `lycana create` in this session, whose output gives its `version`, 0, or a subcanvas from a `create_subcanvas` just accepted, which also starts at version 0. Use `"expectedVersion": 0`. If someone has drawn there since, the edit conflicts (exit 4) and you read the canvas then.

### 3. Write the operations file

The file is JSON: the version you read and a list of operations. Operations run in order, all or none, at most 50 per file. `lycana help operations` lists every operation and field; do not rely on memory for field names.

This file adds a node for `services/billing` and a link to it from a node already on the canvas. Replace `<api node id>` with that node's `id` from step 2.

```json
{
  "expectedVersion": 7,
  "operations": [
    {
      "op": "upsert_node",
      "tempId": "billing",
      "source": "services/billing",
      "name": "Billing",
      "description": "Creates invoices and charges cards",
      "preset": "architecture.service",
      "near": { "id": "<api node id>", "side": "right" }
    },
    {
      "op": "upsert_link",
      "from": "<api node id>",
      "to": "billing",
      "label": "creates invoices",
      "preset": "relationship.sends"
    }
  ]
}
```

- `expectedVersion` is the `version` from step 2. With it, Lycana refuses the edit if an object you touch changed after you read it, so you never overwrite the person's newer work.
- `tempId` is your own name for a new object. Later operations in the same file use it as an id, as the link's `to` does here. The answer maps each `tempId` to the real id.
- Prefer `upsert_node` and `upsert_link` over `create_node` and `create_link`. An upsert updates the node on this canvas that already has that source, or the link already between those two objects, so proposing the same thing twice makes no duplicates.
- A node with no source cannot be upserted, because `upsert_node` requires `source`. That covers external systems, such as a database or a third-party service, and neighbours. Look for it by name in the `nodes` from step 2. If it is there, use its `id`. If not, add it with `{"op": "create_node", "tempId": "stripe", "name": "Stripe", "preset": "architecture.external_system"}`, or with a `service` such as `postgresql.postgresql`. `create_node` makes a new node every time, so never send it without that lookup. Confirm an external system from the code that calls it.
- To change a node that exists, send `{"op": "update_node", "id": "<node id>", "description": "..."}`. Fields you leave out stay as they are. Use it for a description, a name, or a `source` that moved.
- A boundary groups nodes on one canvas. It has a `name`, `details` and a `preset`, and no source, so it cannot be upserted: look it up by name in the `boundaries` from step 2, and send `create_boundary` only when it is missing. Create it before any operation that names it. A new node, or an upserted one, takes `"boundary"`; any other existing node needs `put_in_boundary`, because `update_node` has no such field:

  ```json
  {"op": "create_boundary", "tempId": "workers", "name": "Background workers", "preset": "group.boundary",
   "details": "Started by the worker service in docker-compose.yml"},
  {"op": "upsert_node", "source": "services/mailer", "name": "Mailer", "boundary": "workers"},
  {"op": "put_in_boundary", "id": "<existing node id>", "boundary": "workers"}
  ```

  Lycana sizes a boundary to wrap its members and arranges them inside it, so never `move` or `resize` one. Deleting a boundary keeps its members, which move up a level. When to draw one is in [map.md](map.md#group-every-canvas-with-boundaries).
- A link joins two objects on the same canvas. To show a connection between canvases, link the nodes that hold them, one level up.
- Removing an object is the `delete` operation. Removing a node also removes its links. If the node has a subcanvas, read it first and list in step 4 what goes with the node.
- To give a new node a subcanvas, add `{"op": "create_subcanvas", "node": "<tempId or id>", "tempId": "<your name>"}` to the same file. The canvas id arrives once the proposal is accepted (step 5); fill the subcanvas after that, with `--canvas`.

Save the file outside the repository, or pipe it on standard input with `-` in place of the file name, so it is never committed.

### 4. Send it, and tell the user

```sh
lycana edit <diagram id> [--canvas <canvas id>] --review --no-wait --json <file>
```

`--review` makes the edit a proposal even when the connection could apply it. `--no-wait` returns at once; without it the command waits about 50 seconds for the person's answer.

What the exit code means:

| Exit | Meaning | Do this |
| --- | --- | --- |
| 6 | Proposed, and waiting. The output has `proposalId`, and `replacedProposalId` if it replaced one of yours. | Keep the `proposalId`. Tell the user (below). |
| 0 | Accepted already, or `"unchanged": true` because the canvas already matched and nothing was sent. | Read `created` for the real ids. |
| 2 | The JSON or the command line is wrong. Nothing was sent. | Fix it from the message and `lycana help operations`. |
| 4 | Conflict: an object you touch changed after you read it. | Go back to step 2, once. If it conflicts again, someone is editing: tell the user and stop. |
| 5 | Rejected, or it could no longer apply. | See "After the answer". |
| 7 | Locked: another agent's waiting proposal holds objects this edit changes. | Do not retry. Tell the user what is waiting. |
| 8 | Too many changes too quickly. | Wait as long as the message says, then send once more. |
| 1 | Refused. With `--json` the error on standard error has a `code`, `message` and `hint`. | Tell the user what it says. `upgrade_required` is the Free plan limit, described in [setup.md](setup.md#the-free-plan-limit). A teammate editing the diagram is named in the message. |

If the network fails mid-send, the message gives a `--request-id`. Retry with that option and the edit is made at most once.

Then tell the user, in a few lines:

- what you proposed, as a plain list of nodes, links and boundaries added, changed and removed, and which nodes change boundary;
- which parts are inferred and not read from code;
- which diagram and canvas, with the link to the canvas that holds the proposal. `lycana get <diagram id> [--canvas <canvas id>]` without `--json` prints that canvas's link on its last line. For a subcanvas, pass `--canvas`: the link then ends in the canvas id and opens the subcanvas, where Accept and Reject are. The diagram's own link opens the top canvas, a step away from the proposal;
- that it waits for Accept or Reject in Lycana, and the proposal id.

Do not wait for the answer. Carry on with work that does not depend on it. While the proposal waits, no other agent can edit, link or remove the objects it touches.

### 5. Check the answer

```sh
lycana proposal <proposal id> --no-wait --json
```

Check when the user says they answered, before you report the outcome, and before you propose to the same diagram again. Never report a proposal as accepted from anything but this command.

- Exit 0: accepted. The output has the new `version` and `created`, mapping the `tempId` of each new node to its real id and of each `create_subcanvas` to the canvas id. Do not expect the tempIds of links and notes there: read the canvas with `lycana get` when you need their ids.
- Exit 6: still waiting.
- Exit 5: not applied. `reason` says why.

## After the answer

- **Accepted**: keep the real ids from `created`. If more depends on them, such as filling a new subcanvas, start again at step 2 on that canvas. Acceptance does not move the map stamp: one accepted change does not make the whole diagram current. The stamp moves only when a proposal carries an `update_note` for it, which a mapping ([map.md](map.md)) and a diff check (step 6 of [check.md](check.md)) add under their own rules.
- **Rejected** (`reason: rejected`): the diagram is unchanged. Do not send the same change again. Ask the user what was wrong, and treat their answer as the correction to the map or to the code.
- **Conflict** (`reason: conflict`): the canvas changed while the proposal waited. Go back to step 2 and propose again from the new version.
- **Replaced** (`reason: replaced`): your newer proposal on that diagram took its place. Follow the newer one.
- **Connection removed** (`reason: connection_removed`): the person removed this agent's access. Stop, and tell them. Signing in again is in [setup.md](setup.md).

## What cannot be a proposal

Three things apply at once, with or without `--review`. Ask the user in the conversation before doing any of them.

- `lycana create <name>` creates an empty diagram immediately, and it counts toward the Free plan limit. Edits to a diagram this connection created also apply at once unless sent with `--review`, which is one more reason to always pass it.
- An edit that only gives nodes empty subcanvases applies immediately. Put `create_subcanvas` in the same file as a visible change and it waits with the rest.
- `lycana rename` on a diagram applies immediately and the person cannot undo it. This skill does not rename diagrams.
