# Map: put a section of the repository into Lycana

Follow this when the user asks to map the repository or part of it, or agrees to map placed or unmapped paths. The person approves twice: the mapping plan in the conversation, then each proposal in Lycana.

The layout and the words mapped, placed and unmapped are in [SKILL.md](../SKILL.md): one Architecture diagram, one area diagram per mapped area, detail in subcanvases, boundaries grouping the nodes of each canvas. Sending a proposal, its exit codes and its answer are in [propose.md](propose.md). This file covers what to map and in which order to send it.

## Limits that shape the work

- One waiting proposal per diagram, counting all its subcanvases. A second one replaces the first. So the canvases of one diagram are approved one after another, never together.
- An edit addresses one canvas and holds at most 50 operations. Boundaries count.
- Each proposal costs the person a review, and every subcanvas is one more, sent after the canvas above it is accepted. Plan for few rounds.
- `lycana create` makes an empty diagram at once, never as a proposal. A Free organization keeps three diagrams: see [setup.md](setup.md#the-free-plan-limit).
- `upsert_node` finds an existing node by its source on the canvas being edited only. `find` and `outline` do not look inside linked diagrams.
- Node `description` holds 280 characters, a note 160, `details` 8,000. A boundary has a `name` and `details` only: no source, no description.
- A link prints three words and 24 characters of its label at most. The rest shows only on hover.
- No command arranges a canvas. The file's shape decides it: see [Lay the canvas out](#lay-the-canvas-out).

## 1. Gather facts

Name nothing yet. Record the commit first, and map every canvas from that commit.

```sh
git rev-parse --short HEAD
git ls-files | cut -d/ -f1-2 | sort | uniq -c | sort -rn    # where the code is
git ls-files | grep -Ei '(^|/)(package\.json|pyproject\.toml|go\.(mod|work)|Cargo\.toml|pom\.xml|build\.gradle[^/]*|[^/]*\.csproj|Gemfile|composer\.json|Dockerfile[^/]*|[^/]*compose[^/]*\.ya?ml|[^/]*\.tf|Procfile)$'
```

`git ls-files` leaves out ignored and generated files. Then read, for the section being mapped:

- **Manifests**: workspace or module lists, dependencies on sibling units, scripts.
- **How it runs**: Dockerfiles, compose files, CI workflows, infrastructure code. They show the deployable units, and the databases, queues and outside services.
- **Entry points**: the `main` or server start file, and where routes, handlers, commands or jobs are registered.
- **Who talks to whom at run time**: HTTP clients and their base addresses, queue publish and consume calls, database clients. Search with `git grep -n <unit name or address> -- <other unit>`. Imports between units show which code is a shared library; they are not communication.

Done when you can name, for every top-level unit in the section, the file it starts from and the code that shows each thing it talks to.

## 2. Decide the areas, nodes and depth

- **Derive the areas.** An area is something that runs or ships on its own: an app, a service, a worker, a command-line tool. Frontend and backend are one common result, not a template. A small repository may be one area.
- **Shared libraries are not areas.** Code that only other parts import gets no area diagram and no links. Show up to about six as one placed node each, inside one boundary named `Shared libraries` on Architecture. More than that: one node for their folder, whose description names them, or "Left out" when they share no folder.
- **Leaf rule.** A node gets a subcanvas only when it has several distinct internal parts with relationships worth drawing. Single files, thin wrappers, generated code, configuration and external systems stay leaves. Do not add a node whose only job is to hold other nodes, such as `Source` or `Storage layer`: put the parts on the canvas, in a boundary when they are a group of peers.
- **Ceilings, not targets.** About 20 nodes on a canvas, about five columns across and eight rows down, and three levels of subcanvas below an area diagram. Past that it does not fit a screen: move a group into a subcanvas, never widen. A smaller true map beats a full one: it is read more, and it costs fewer approvals.
- **Every node is checkable.** Give each node that describes code one source, usually a folder. Run `git ls-files <path>` for every source and drop or fix any that prints nothing. Do not give two nodes on one canvas the same source.
- **External systems have no source.** A database, queue or third-party API gets a `service` (such as `postgresql.postgresql`) or a `preset` such as `architecture.database`, `architecture.queue` or `architecture.external_system`.
- **Links show communication at run time.** Draw a link only where code shows one part calling, sending to, reading or writing another, and label what flows in three words and 24 characters at most, such as `creates invoices`. Longer wording goes in the link's `details`. An import or a build dependency is not a link. When a link comes from naming or documentation, end its label with `(inferred)` if it still fits, or else start its `details` with `Inferred:`.
- **Describe only what you read.** Write a description from code you opened. Start the description of a node you inferred with `Inferred:`. A placed node gets one line taken from its manifest or README, ending `(from manifest)` or `(from README)`.
- **Scope.** Map the section asked for. When the user asks for one area, the Architecture diagram gets that area as a node opening its area diagram, every other area as a placed node (a source, a one-line description, nothing beneath it), and only the links that touch the requested area. List what stays placed or unmapped.
- **Neighbours.** When a part of the area talks to another area, show that area on the area diagram as one node with no source, named exactly as its node on the Architecture diagram, and put the detail in the link's label. A source there would make the other area look mapped.

### Group every canvas with boundaries

Plan boundaries with the nodes, not after them.

- **What a boundary says.** Its members share something a reader needs to see: where they run (the user's machine, a server, a third party), who owns or operates them, a layer or a stage in a flow, a trust or network edge, or that they lie outside this repository.
- **Boundary or subcanvas.** A boundary answers "what do these have in common". A subcanvas answers "what is inside this one". Peers get a boundary on the same canvas, which costs no extra approval. A part with inner workings of its own gets a subcanvas.
- **Name it for what the members share**, such as `Runs in the browser`, `Deployed by docker-compose.yml`, `Request handling` or `External`. Not `Group 1`, `Misc` or the canvas's own title.
- **How many.** A canvas of about six nodes or fewer needs none. Above that, two to five, covering most of the nodes. Leftover nodes stay outside. No boundary around a single node, unless it marks an edge, such as `External`. Boundaries can nest: use one level of nesting at most, for a real second level such as a network inside a cloud account.
- **Back it with something real**: a folder, a manifest, a deploy unit, a network edge. Write that evidence as one line in the boundary's `details`. When the grouping is your reading and nothing in the repository or its deployment shows it, end the name with `(inferred)`.
- **Pick one question per canvas.** Boundaries that mix where things run with what layer they are in read as noise.

Groupings that often fit, as examples, not a template:

- **Architecture**: areas grouped by where they run or how they ship; `Shared libraries`; `External` for systems the repository calls and does not contain.
- **An area diagram**: the area's own parts grouped by layer or stage, or left ungrouped when they are few; `Other areas` for neighbours; `External`.
- **A subcanvas**: layers, such as request handling, domain logic and storage, or the stages of a flow, in order.

Links still join nodes. Link to a boundary only when one part truly talks to every member alike.

### Lay the canvas out

Lycana lays out everything one file creates in a single pass, left to right along the links. A link's `from` sits one column left of its `to`. Objects that share a column pile downwards in the order the file creates them, and so do objects with no links at all. So the file decides the shape. Positions cannot be given at creation.

1. **Point links along the main flow**, caller to callee. The longest chain of links is the number of columns.
2. **Write the file in flow order**: each boundary followed by its members, then the nodes outside boundaries, then the links, subcanvases and the stamp.
3. **Chain the boundaries.** Give each boundary after the first `"near": {"id": "<an earlier boundary>", "side": "right"}`. Two boundaries placed right of the same one share a column, one under the other: that is how a canvas gets a second row. `above` and `below` do nothing on a new boundary.
4. **Fold each boundary.** Members joined by links run in a row, one column each. To put a member under another, give it `"near": {"id": "<that member>", "side": "below"}`: both must be new nodes in the same boundary, or both outside any. `"side": "right"` starts the next column. Aim for two columns of up to four.
5. **Place every hub.** A node that three or more groups link to goes in a column of its own between them: `near` it to the right of the boundary that calls it, and `near` the boundaries it calls to its right. Or give it a boundary of its own, with the ungrouped nodes it works with. Default placement strands it.
6. **Count before writing.** Columns: the longest chain of links and `right` hints, a stack of `below` hints counting once. Rows: the most nodes piled in one column, across boundaries. Over five columns or eight rows, fold more, then split by subcanvas.

Put no `move`, `set_ports` or `set_waypoints` after a file's first create: each one cuts the layout into separate passes. Never send `resize`: a boundary always wraps its members, and Lycana sizes nodes.

**Check before sending.** For each canvas, write down: each boundary's members and columns; which boundary it sits right of; where each hub goes; the column and row counts; that no label is over the limit.

### Large sections

When your tool can start subagents, give each area or large folder to one, with this brief. Otherwise do the same yourself, one folder at a time.

```
Summarise the folder <path> in the repository at <root> so it can be drawn as one canvas
of an architecture diagram. Read code; change nothing. Start from `git ls-files <path>`,
the manifests and the entry points. Return only this, with no prose and no file contents:

parts: up to 20. For each: name, source (repo-relative path that `git ls-files` confirms,
  forward slashes, no leading ./ or trailing slash), purpose in one line under 200
  characters, kind (client, service, worker, library, database, queue, external system),
  and deeper: yes only if it has several internal parts whose relationships matter.
links: from -> to, what flows, and the file that shows it. Write "inferred" in place of
  the file when you did not see it in code.
groups: two to five sets of parts that share a layer, a stage or where they run, each with
  the folder or file that shows it. None when the parts do not group.
in_out: what this folder calls outside itself, and what calls it, each with its evidence file.
questions: anything you could not settle from the code.
```

Compose the canvas above from the summaries: each folder becomes one node, and its `in_out` lines become the links between nodes. Its `groups` become the boundaries of that folder's own canvas.

## 3. Show the mapping plan in the conversation

Before touching Lycana, give the user the plan as an indented outline and wait for their answer. Show each boundary in square brackets, with its evidence and its members indented beneath, so the person approves the grouping too. These are cheap to fix here and slow to fix through proposals.

```
Mapping plan at commit 4f2a9c1 (section: services/api)

Architecture
  [Deployed by docker-compose.yml]
    API             services/api      HTTP API for web and partners        -> area diagram "API"
    Worker          services/worker   Background jobs (from manifest)      placed
    Postgres        (external)        Main database
  Web app           apps/web          Customer site (from README)          placed
  [Shared libraries]                  packages/, imported only, no links
    UI              packages/ui       Components (from manifest)           placed
    Config          packages/config   Settings loader (from manifest)      placed
  [External]                          called over the network
    Stripe          (external)        Card payments
  links: Web app -> API "REST calls"; API -> Postgres "reads and writes";
         API -> Worker "queues jobs"; API -> Stripe "charges cards (inferred)"

API (area diagram)
  [Request handling]                  services/api/src/http
    Routes        services/api/src/http/routes   Request handlers
    Auth          services/api/src/http/auth     Sessions and API keys
  [Domain (inferred)]
    Billing       services/api/src/billing       Invoices and charges     -> subcanvas (2 nodes, no boundary)
      Invoices      services/api/src/billing/invoices   Builds and stores invoices
      Stripe client services/api/src/billing/stripe.ts  Wraps the Stripe API
    Accounts      services/api/src/accounts      Customers and plans
  [Other areas]
    Web app       (neighbour, no source)
  ...

Left out: scripts/, docs/ (no runtime part).
Placed, not mapped: apps/web, services/worker, packages/ui, packages/config.
Creates now, without a proposal: empty diagrams "Architecture", "API".
Approvals: 2 proposals at once, then 1 more for the Billing subcanvas.
```

Also say, before the user answers:

- which diagrams `lycana create` will make immediately, because those are not proposals;
- how many approvals the plan needs, and what a shallower plan would save;
- the Free plan limit, when the plan creates diagrams and you do not know the organization's plan: ask. Where diagrams are limited, keep Architecture and the largest areas as diagrams and hold each other mapped area as a subcanvas of its Architecture node. Those subcanvases share Architecture's one waiting proposal, so they take longer to approve.

Done when the user has agreed to the outline, with their corrections applied.

## 4. Send it to Lycana, top-down

Write each operations file and send it as [propose.md](propose.md) says, always with `--review`, also when the connection has Full access. Shape each file as [Lay the canvas out](#lay-the-canvas-out) says.

1. **Create the missing diagrams.** From the repository root, `lycana create "<name>" --json` for Architecture and for the area diagram of each area being mapped, named exactly as its area node. Create none for placed areas. Keep each `diagramId`. A linked repository puts them in its project. A new diagram is empty at version 0, so its first file needs no `lycana get`: use `"expectedVersion": 0`.
2. **Send the top canvas of every diagram**, one proposal per diagram. These can all wait at the same time. Each file holds the canvas's boundaries and nodes, then its links, a `create_subcanvas` for every node that gets one, and the map stamp. On Architecture, the node of each area being mapped also gets a `link_diagram` to its `diagramId` from step 1; placed nodes get nothing beneath them. Put `create_subcanvas` in the same file as its node: an edit that only adds empty subcanvases applies at once, and inside a proposal it waits with the rest.
3. **Tell the user what waits**: each proposal id with the link of the canvas that holds it, and what comes next in each diagram. Prepare the next files meanwhile. Do not send them.
4. **When a top canvas is accepted** (`lycana proposal <id> --no-wait --json` exits 0), [check its layout](#check-the-layout-after-acceptance) and read `created`: each node and `create_subcanvas` `tempId` maps to its id or canvas id. Send the first subcanvas of that diagram with `--canvas <canvas id>` and `"expectedVersion": 0`.
5. **One subcanvas at a time per diagram.** Send the next only after the last is accepted. Finish a level before going deeper: a deeper subcanvas gets its canvas id from the proposal that fills the canvas above it. Different diagrams move independently.
6. **If a proposal is rejected**, stop on that diagram and ask the user what was wrong. Canvases below it cannot be sent. An empty diagram from step 1 stays until the person deletes it in Lycana; tell them.

A canvas that needs more than 50 operations: send its boundaries, nodes, subcanvases and map stamp first, and its links in a second proposal once the first is accepted, using the real ids from `created`.

### Check the layout after acceptance

Read the accepted canvas once. Each `box` is the top-left corner and the size:

```sh
lycana get <diagram id> [--canvas <canvas id>] --json | jq '[.boundaries[], .nodes[] | {name, boundary, box}]'
```

A defect is any of: two boundaries whose boxes cross; an ungrouped node within 40 units of a boundary's edge, where it reads as a member; a boundary far wider than its members need; a canvas over about 2,400 wide or 1,400 high, or three times wider than high.

For a defect, one tidy proposal per canvas is allowed. Tell the person what looked wrong. It holds `move` operations only: each puts an object's top-left corner at the `x`, `y` given, or just beside it when that spot is taken. Work from the boxes, 400 units a column and 170 a row:

- First move members inside their boundary's present box. The boundary shrinks around them.
- Then move a boundary by its own id. Its members go with it. It pushes aside every outside node it passes over, so move it through empty space.
- Last, move ungrouped nodes, 80 units or more from any boundary.

This is the only use of `move`. When another proposal is due on that canvas, put the moves first in its file, before any create, and save an approval. On a canvas this skill created, any object may move. On a canvas a person arranged, move only the boundaries you added, their members, and nodes those boundaries displaced: the rest is the person's layout.

### Operations this needs

Architecture, an area node that opens its area diagram:

```json
{"op": "upsert_node", "tempId": "api", "source": "services/api", "name": "API",
 "description": "HTTP API for web and partners", "preset": "architecture.service"},
{"op": "link_diagram", "node": "api", "diagram": "<diagramId of the API diagram>"}
```

An area diagram's top canvas, with a boundary, a node that gets a subcanvas, an external system and the map stamp. A neighbour is written like the external system, with a `name` and no `source`. Create a boundary before the first operation that names it. Lycana sizes it to wrap its members:

```json
{
  "expectedVersion": 0,
  "operations": [
    {"op": "upsert_node", "tempId": "billing", "source": "services/api/src/billing",
     "name": "Billing", "description": "Invoices and charges", "preset": "architecture.service"},
    {"op": "create_subcanvas", "node": "billing", "tempId": "billingCanvas"},
    {"op": "create_boundary", "tempId": "external", "name": "External", "preset": "group.boundary",
     "details": "Called over the network. Not in this repository.",
     "near": {"id": "billing", "side": "right"}},
    {"op": "create_node", "tempId": "stripe", "name": "Stripe", "boundary": "external",
     "preset": "architecture.external_system"},
    {"op": "upsert_link", "from": "billing", "to": "stripe", "label": "charges cards (inferred)"},
    {"op": "create_note", "text": "Mapped at commit 4f2a9c1, 2026-03-14"}
  ]
}
```

After it is accepted, `created` holds `"billingCanvas": "<canvas id>"`. Fill that subcanvas with a second file, whose operations are written as for any canvas:

```sh
lycana edit <API diagram id> --canvas <canvas id> --review --no-wait --json billing.json
```

A node holds a subcanvas or a linked diagram, never both, so do not add `create_subcanvas` to an area node that has `link_diagram`. `lycana help operations` lists every field, preset and limit.

## The map stamp

One note on the top canvas of each diagram: `Mapped at commit <short sha>, <YYYY-MM-DD>`, with the commit from step 1 and today's date.

- New diagram: `create_note`, in the top canvas's proposal.
- Stamp already there: find it in the `notes` of `lycana get <diagram id> --json` and change it with `{"op": "update_note", "id": "<note id>", "text": "..."}`. Keep one stamp per diagram.
- Move the stamp only when you compared every canvas of that diagram with the commit. After mapping one part of a diagram, leave the stamp and say in your report that it still shows the older commit.
- Between mappings, a diff check moves the stamp when its diff covers every commit since: step 6 of [check.md](check.md).

## Mapping again

When the section is already mapped, read it first, then change only what the code changed.

```sh
lycana outline <diagram id> --depth 10 --json    # every canvas, node, source and canvas id
```

An outline leaves out boundaries: `lycana get` shows a canvas's `boundaries`, and each node's `boundary`, the id of the one it sits in or `null`.

- **Upsert, keyed on source.** The same source on the same canvas updates the node in place. Fields you leave out stay as they are, so leave out `description` where the person's wording still fits, and send the existing `name`, which `upsert_node` requires.
- **A node whose code moved**: `{"op": "update_node", "id": "<node id>", "source": "<new path>"}`. This keeps its place, its links and its subcanvas. Deleting and adding again loses them.
- **External systems and neighbours** have no source: look each up by name before `create_node`, as step 3 of [propose.md](propose.md) says.
- **A placed area that is now being mapped**: create its area diagram, and in the Architecture proposal give the existing area node, by its id, a `link_diagram` and a description from the code you read.
- **Keep the person's layout.** `near` only places new objects. Existing ones stay where they are, except what a new boundary displaces.
- **Adding boundaries to a flat canvas.** Plan the grouping in the conversation as in step 3, then send one proposal per canvas, top canvas first: each `create_boundary` followed by one `put_in_boundary` per member, as [propose.md](propose.md) shows, and no `move`. This disturbs least, and still rearranges. A new boundary wraps its members where they stand, keeping their order and closing wide gaps, so members that stood far apart make a wide boundary. A non-member that stood among them is pushed just outside the edge. Other nodes can shift to make room for links, and two new boundaries can overlap. No hint prevents this. From the boxes of `lycana get`, find the nodes inside each planned boundary's outline, and name them in the plan and the proposal message as nodes that will move. Say a tidy proposal may follow, and count it in the approvals. Then [check the layout](#check-the-layout-after-acceptance). Leave the person's own boundaries as they are.
- **Regrouping.** `put_in_boundary` moves a node to another boundary, or out of all with `"boundary": null`. `update_boundary` renames one. Deleting a boundary keeps its members: they move up to the canvas, or to the boundary around it, and only links attached to the boundary itself go. Tell the user so: "removes the boundary `Workers`; its three nodes stay".
- **Removals.** Propose a `delete` only for a node whose source is gone from the repository. List every removal for the user by name in the conversation and in your report, and never clear a canvas to rebuild it.
- **A new subcanvas on an existing node**: put `create_subcanvas` in the same file as another change to that canvas, so it waits as a proposal.

## 5. Closing report

Report when you stop, also when proposals are still waiting. Give the user:

- what was mapped: diagrams, canvases, and the count of nodes, links and boundaries. `outline` holds nodes only: count the rest from the files you sent or from `lycana get` on each canvas;
- what waits for approval: each proposal id with its diagram, canvas and link, and which canvases come after it;
- what was created at once without a proposal, such as empty diagrams;
- what was left out and why, including areas still placed, paths still unmapped and any stamp not moved;
- what was inferred, boundaries included, or taken from a manifest or README, and not read from code;
- any removals, regroupings or tidy proposals, by name, and any layout defect left unfixed.

Say a proposal was accepted only after `lycana proposal <id>` confirms it.
