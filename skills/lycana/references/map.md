# Map: put a section of the repository into Lycana

Follow this when the user asks to map the repository or part of it, or agrees to map placed or unmapped paths. The person approves twice: the mapping plan in the conversation, then each proposal in Lycana.

The layout and the words mapped, placed and unmapped are in [SKILL.md](../SKILL.md): one Architecture diagram, one area diagram per mapped area, detail in subcanvases. Sending a proposal, its exit codes and its answer are in [propose.md](propose.md). This file covers what to map and in which order to send it.

## Limits that shape the work

- One waiting proposal per diagram, counting all its subcanvases. A second one replaces the first. So the canvases of one diagram are approved one after another, never together.
- An edit addresses one canvas and holds at most 50 operations.
- Each proposal costs the person a review, and every subcanvas is one more, sent after the canvas above it is accepted. Plan for few rounds.
- `lycana create` makes an empty diagram at once, never as a proposal. A Free organization keeps three diagrams: see [setup.md](setup.md#the-free-plan-limit).
- `upsert_node` finds an existing node by its source on the canvas being edited only. `find` and `outline` do not look inside linked diagrams.
- Node `description` holds 280 characters, a note 160, `details` 8,000.

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
- **Shared libraries are not areas.** Code that only other parts import gets no area node and no links. When the libraries share a folder, show them as one node on Architecture, such as `Shared libraries` with source `packages`, whose description names them. Otherwise list them under "Left out". Give a library its own node only when the user asks to map it.
- **Leaf rule.** A node gets a subcanvas only when it has several distinct internal parts with relationships worth drawing. Single files, thin wrappers, generated code, configuration and external systems stay leaves. Do not add a node whose only job is to hold everything else, such as `Source`: put the area's parts on the area diagram's top canvas.
- **Ceilings, not targets.** About 20 nodes on a canvas, and three levels of subcanvas below an area diagram. A smaller true map beats a full one: it is read more, and it costs fewer approvals.
- **Every node is checkable.** Give each node that describes code one source, usually a folder. Run `git ls-files <path>` for every source and drop or fix any that prints nothing. Do not give two nodes on one canvas the same source.
- **External systems have no source.** A database, queue or third-party API gets a `service` (such as `postgresql.postgresql`) or a `preset` such as `architecture.database`, `architecture.queue` or `architecture.external_system`.
- **Links show communication at run time.** Draw a link only where code shows one part calling, sending to, reading or writing another, and label what flows, such as `creates invoices`. An import or a build dependency is not a link. When a link comes from naming or documentation, end its label with `(inferred)`.
- **Describe only what you read.** Write a description from code you opened. Start the description of a node you inferred with `Inferred:`. A placed node gets one line taken from its manifest or README, ending `(from manifest)` or `(from README)`.
- **Scope.** Map the section asked for. When the user asks for one area, the Architecture diagram gets that area as a node opening its area diagram, every other area as a placed node (a source, a one-line description, nothing beneath it), and only the links that touch the requested area. List what stays placed or unmapped.
- **Neighbours.** When a part of the area talks to another area, show that area on the area diagram as one node with no source, named exactly as its node on the Architecture diagram, and put the detail in the link's label. A source there would make the other area look mapped.

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
in_out: what this folder calls outside itself, and what calls it, each with its evidence file.
questions: anything you could not settle from the code.
```

Compose the canvas above from the summaries: each folder becomes one node, and its `in_out` lines become the links between nodes.

## 3. Show the mapping plan in the conversation

Before touching Lycana, give the user the plan as an indented outline and wait for their answer. Naming and granularity are cheap to fix here and slow to fix through proposals.

```
Mapping plan at commit 4f2a9c1 (section: services/api)

Architecture
  API               services/api      HTTP API for web and partners        -> area diagram "API"
  Web app           apps/web          Customer site (from README)          placed
  Worker            services/worker   Background jobs (from manifest)      placed
  Shared libraries  packages          ui, config (from manifests)          placed, no links
  Postgres          (external)        Main database
  Stripe            (external)        Card payments
  links: Web app -> API "REST calls"; API -> Postgres "reads and writes";
         API -> Worker "queues jobs"; API -> Stripe "charges cards (inferred)"

API (area diagram)
  Routes          services/api/src/routes     Request handlers
  Billing         services/api/src/billing    Invoices and charges     -> subcanvas
    Invoices      services/api/src/billing/invoices   Builds and stores invoices
    Stripe client services/api/src/billing/stripe.ts  Wraps the Stripe API
  Auth            services/api/src/auth       Sessions and API keys
  Web app         (neighbour, no source)
  ...

Left out: scripts/, docs/ (no runtime part).
Placed, not mapped: apps/web, services/worker, packages.
Creates now, without a proposal: empty diagrams "Architecture", "API".
Approvals: 2 proposals at once, then 1 more for the Billing subcanvas.
```

Also say, before the user answers:

- which diagrams `lycana create` will make immediately, because those are not proposals;
- how many approvals the plan needs, and what a shallower plan would save;
- the Free plan limit, when the plan creates diagrams and you do not know the organization's plan: ask. Where diagrams are limited, keep Architecture and the largest areas as diagrams and hold each other mapped area as a subcanvas of its Architecture node. Those subcanvases share Architecture's one waiting proposal, so they take longer to approve.

Done when the user has agreed to the outline, with their corrections applied.

## 4. Send it to Lycana, top-down

Write each operations file and send it as [propose.md](propose.md) says, always with `--review`, also when the connection has Full access. Lycana places new objects itself: leave out positions, and use `near` only to put a new node beside an existing neighbour. Do not send `move` or `resize`.

1. **Create the missing diagrams.** From the repository root, `lycana create "<name>" --json` for Architecture and for the area diagram of each area being mapped, named exactly as its area node. Create none for placed areas. Keep each `diagramId`. A linked repository puts them in its project. A new diagram is empty at version 0, so its first file needs no `lycana get`: use `"expectedVersion": 0`.
2. **Send the top canvas of every diagram**, one proposal per diagram. These can all wait at the same time. Each file holds the canvas's nodes and links, a `create_subcanvas` for every node that gets one, and the map stamp. On Architecture, the node of each area being mapped also gets a `link_diagram` to its `diagramId` from step 1; placed nodes get nothing beneath them. Put `create_subcanvas` in the same file as its node: an edit that only adds empty subcanvases applies at once, and inside a proposal it waits with the rest.
3. **Tell the user what waits**: each proposal id with the link of the canvas that holds it, and what comes next in each diagram. Prepare the next files meanwhile. Do not send them.
4. **When a top canvas is accepted** (`lycana proposal <id> --no-wait --json` exits 0), read `created`: each node and `create_subcanvas` `tempId` maps to its id or canvas id. Send the first subcanvas of that diagram with `--canvas <canvas id>` and `"expectedVersion": 0`.
5. **One subcanvas at a time per diagram.** Send the next only after the last is accepted. Finish a level before going deeper: a deeper subcanvas gets its canvas id from the proposal that fills the canvas above it. Different diagrams move independently.
6. **If a proposal is rejected**, stop on that diagram and ask the user what was wrong. Canvases below it cannot be sent. An empty diagram from step 1 stays until the person deletes it in Lycana; tell them.

A canvas that needs more than 50 operations: send its nodes, subcanvases and map stamp first, and its links in a second proposal once the first is accepted, using the real ids from `created`.

### Operations this needs

Architecture, an area node that opens its area diagram:

```json
{"op": "upsert_node", "tempId": "api", "source": "services/api", "name": "API",
 "description": "HTTP API for web and partners", "preset": "architecture.service"},
{"op": "link_diagram", "node": "api", "diagram": "<diagramId of the API diagram>"}
```

An area diagram's top canvas, with a node that gets a subcanvas, an external system and the map stamp. A neighbour is written like the external system, with a `name` and no `source`:

```json
{
  "expectedVersion": 0,
  "operations": [
    {"op": "upsert_node", "tempId": "billing", "source": "services/api/src/billing",
     "name": "Billing", "description": "Invoices and charges", "preset": "architecture.service"},
    {"op": "create_subcanvas", "node": "billing", "tempId": "billingCanvas"},
    {"op": "create_node", "tempId": "stripe", "name": "Stripe",
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

- **Upsert, keyed on source.** The same source on the same canvas updates the node in place. Fields you leave out stay as they are, so leave out `description` where the person's wording still fits, and send the existing `name`, which `upsert_node` requires.
- **A node whose code moved**: `{"op": "update_node", "id": "<node id>", "source": "<new path>"}`. This keeps its place, its links and its subcanvas. Deleting and adding again loses them.
- **External systems and neighbours** have no source: look each up by name before `create_node`, as step 3 of [propose.md](propose.md) says.
- **A placed area that is now being mapped**: create its area diagram, and in the Architecture proposal give the existing area node, by its id, a `link_diagram` and a description from the code you read.
- **Keep the person's layout.** `near` only places new nodes; existing ones stay where they are.
- **Removals.** Propose a `delete` only for a node whose source is gone from the repository. List every removal for the user by name in the conversation and in your report, and never clear a canvas to rebuild it.
- **A new subcanvas on an existing node**: put `create_subcanvas` in the same file as another change to that canvas, so it waits as a proposal.

## 5. Closing report

Report when you stop, also when proposals are still waiting. Give the user:

- what was mapped: diagrams, canvases, and the count of nodes and links. `outline` holds no links: count them from the files you sent or from `lycana get` on each canvas;
- what waits for approval: each proposal id with its diagram, canvas and link, and which canvases come after it;
- what was created at once without a proposal, such as empty diagrams;
- what was left out and why, including areas still placed, paths still unmapped and any stamp not moved;
- what was inferred, or taken from a manifest or README, and not read from code;
- any removals proposed, by name.

Say a proposal was accepted only after `lycana proposal <id>` confirms it.
