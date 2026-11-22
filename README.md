# Lycana skills

Agent skills for [Lycana](https://lycana.ai), the system-design diagram app. A skill is a folder of instructions that a coding agent loads when a task calls for it.

## Skills

- `lycana`: makes a coding agent check architecture work and new features against the diagrams in Lycana, and map the parts of a repository that no diagram covers yet. New mappings are proposals that a person approves before they change a diagram.

## Install

With the `lycana` command-line tool:

```sh
npm i -g lycana
lycana skill install
```

Or directly:

```sh
npx skills add LycanaAI/skills
```

## Layout

```
skills/<name>/SKILL.md      the skill's instructions, with name and description in its frontmatter
skills/<name>/references/   longer guides the skill loads when it needs them
scripts/validate-skills.mjs checks every skill's frontmatter and reference links
```

Run `node scripts/validate-skills.mjs` before committing a change to a skill. CI runs it on every push and pull request.

## Licence

MIT. See [LICENSE](LICENSE).
