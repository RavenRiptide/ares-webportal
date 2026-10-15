# Custom Creatures

**Status: answered** on 2026-10-14; phase 1 under way. Proposed 2026-10-10. Raven's answers to the open questions are in §8 and are folded into the sections below. Server work would go on `feat/derived-stats` in `aresmush`, pages on `feat/pf2-encounter-pages` in `ares-webportal`.

Asked for: help staff build out custom creatures, with an access layer deciding who gets to use them, and probably a web-based creature creator.

## Mock-ups

Drawn by hand in the game's skin, as HTML in `mockups/` with a render of each beside it. Names, figures and bands in them are examples: the benchmark tables are not transcribed yet (section 6), so no band shown is a ruling.

| Screen | Section | Render |
|---|---|---|
| The library: yours, shared with you, published, the bestiary | 4, Page: library | [1-library.png](mockups/1-library.png) |
| A creature's page: stat block, who may use it, history | 4, Page: a creature | [2-creature.png](mockups/2-creature.png) |
| The editor on its Strikes tab, with an error and the live preview | 4, Page: editor | [3-editor.png](mockups/3-editor.png) |
| The editor on its Abilities tab: what the game will roll and what it only announces | 4, Page: editor | [4-abilities.png](mockups/4-abilities.png) |
| Starting a creature: clone, benchmarks, a pasted description, blank | 4, Page: editor | [5-start.png](mockups/5-start.png) |
| The staff approval queue | 4, Page: approval queue | [6-queue.png](mockups/6-queue.png) |
| The editor at phone width | 4, Accessibility and mobile | [7-editor-phone.png](mockups/7-editor-phone.png) |

## What is there today

Read from the code on 2026-10-10.

- **One-line creatures.** `Pf2e::Described.read(name, text)` (`aresmush/plugins/pf2e/helpers/described.rb`) reads figures (hardness among them), then `;`-separated parts from a `PARTS` table: skills, immune, weak, resist, traits, senses, size, rarity, strike/ranged, ability, shield. It needs only `ac` and `hp` (`NEEDED`); level, Perception and saves default to 0. It cannot express spellcasting, a Strike's attack effects, an ability's traits or `hp_details`.
- **Adding one.** `PF2EncounterAddCmd` (`plugins/pf2e/commands/encounter/encounter_creature.rb`) tries `Described.read` first and refuses a described creature unless `Gm.plotmaster?`. Otherwise it calls `Bestiary.find`, then `Gm.open?`.
- **The instance.** `Pf2eNpc` (`plugins/pf2e/models/npcs.rb`) holds `creature` (a bestiary name) or `described` (a hash). `written_stat_block` is `Bestiary.entry(creature) || described`, with `Adjustments.apply` over it. A bestiary creature is therefore read live by name; only a described creature is the encounter's own copy.
- **History.** `History.snapshot` (`plugins/pf2e/helpers/history.rb`) copies every `Pf2eNpc`'s attributes, `described` included, into the `before` and `after` of every entry.
- **The bestiary.** 2,994 creatures, levels -1 to 25, no duplicate names across packs. Entry keys: `pack source level size rarity traits ac hp perception saves abilities speeds skills`, and optionally `senses immunities weaknesses resistances strikes actions spellcasting hp_details hardness shield`.
  - Strike: `name bonus damage traits`, optional `effects range rules`. A damage instance is `[formula, type, category]`, category one of nil, `persistent`, `precision`, `splash`.
  - Action: `name type traits`, optional `cost text rules`. Type is `action` (cost 1-3), `reaction`, `free` or `passive`.
  - Spellcasting: `name tradition type dc attack spells`, with spells keyed by rank `'0'`..`'10'`, and optionally `slots` (castings per rank, for a spontaneous caster) and `uses` (castings per day of a named innate spell). A prepared spell is listed once for each time it is prepared. Types in use: innate, prepared, spontaneous, focus.
  - Shield: `name hardness hp`, optional `ac`. `hardness` on the creature itself is a number.
- **Resolution points.** `Bestiary.find/search/entry/named/index` are called from seven places only: `encounter_creature.rb` (five), `helpers/gm.rb:71`, `models/npcs.rb:58`.
- **GM kinds.** `Pf2e::Gm::KINDS` (`helpers/gm.rb`): staff (`is_admin?`), Plotmaster (`has_permission?('kill_pc')`), event runner (everyone else). `Gm.open?(char, creature)` is `plotmaster? || pack in pf2e.event_runner_bestiaries`. `has_permission?` is true for any admin (`plugins/roles/public/roles_char.rb:5`).
- **What the engine mechanises for a creature:**
  - A Strike effect named Grab, Knockdown or Push, or its Improved form, offers the follow-up action (`Acting::FOLLOW_UPS`, `helpers/acting.rb`). Any other effect is announced.
  - An ability whose words match `CreatureAbilities.damage_save` has its basic save rolled and damage dealt. One with `Critical Success` or `Critical Failure` in its text is announced only.
  - An ability or Strike with Foundry `rules` feeds the rules engine (`Npcs.ability_sources`).
  - `hp_details` reading `regeneration N` or `fast healing N` heals at turn start (`Npcs::HEALING`).
  - `hardness` comes off each blow, and a `shield` can be raised and can block (`Npcs.hardened`, `Npcs.shield`).
  - A creature's castings are counted: each preparation of a prepared spell, the `slots` of a rank for a spontaneous one, once or its `uses` for an innate one, and never for a cantrip or a spell marked at will or constant (`Npcs.spell_limit`).
  - A spell found in `pf2e_spell_mechanics` (2,015 entries) is resolved; one that is not is announced (`Acting.cast`). 87% of the spell names in Monster Core 1, 2 and NPC Core are in that catalogue.
- **Formulas.** `Pf2e.roll_formula` (`helpers/persistent_damage.rb:122`) reads a term that is neither dice nor a number as 0, without complaint. `Pf2e.average(formula)` exists beside it.
- **Web.** `plugins/pf2e/web/encounter_handlers.rb` is the pattern to copy: a module of serialisers (`EncounterWeb`) plus one small handler class per request, each calling `Website.check_login`, routed in `Pf2e.get_web_request_handler` (`plugins/pf2e/pf2e.rb:397`). The five feat handlers still call the non-existent `WebHelpers`; do not copy them.
- **Portal.** Routes are registered in `app/custom-routes.js`; a page is a route file calling `gameApi.requestOne`, a template, and sometimes a controller (`app/routes/pf2-encounter.js`, `app/templates/pf2-encounter.hbs`). All existing pf2 pages are read-only. There are no portal tests and no CI.
- **Not there.** No benchmark tables (no hit for "benchmark" or "Building Creatures" in config, plugins, scripts or docs). No list of legal creature traits, senses or damage types in config. No command root `creature` in any plugin.

## Decisions

| Question | Recommendation | Why |
|---|---|---|
| Where a saved stat block lives | Immutable revisions, pinned by the encounter's `Pf2eNpc` | Edits and deletion cannot reach an encounter; history snapshots stay small; "approve exactly this" and "who changed what" come free |
| How names resolve | Exact bestiary name wins; `c:<name or id>` forces a saved creature; a saved creature may not take a bestiary name | Every existing `+e/add goblin warrior` keeps its meaning |
| Who authors | Any approved character | Raven, answer 3 |
| Who uses | A Plotmaster or staff uses their own creatures, and those another Plotmaster or staff member shares with them, without approval. Anyone else uses only a creature an admin has approved, which is then published for everyone | Raven, answers 1, 3 and 5; sharing never widens a GM kind, only approval does |
| Who approves | Admins. No new permission | Raven, answer 4 |
| A limit per author | None | Raven, answer 9 |
| Trait names | The setting's: the ancestry and heritage traits in `pf2e_ancestry.yml` and `pf2e_heritages.yml` are accepted beside the bestiary's | Raven, answer 10 |
| A house bestiary file | Yes: an approved creature is also written to `game/bestiary/house.yml`, kept in git | Raven, answer 11 |
| Can an invalid creature be saved | No. A revision is written only with zero errors | Everything in the database is safe to fight with |
| Where benchmarks live | `game/config/pf2e_creature_benchmarks.yml`, transcribed from Archives of Nethys | Small table, read whole like `pf2e_rewards.yml` |
| Where validation runs | One pure server validator; the web calls it | Command line and web cannot disagree |

## 1. Data model

### Models

New file `aresmush/plugins/pf2e/models/creature.rb`, in the style of `models/encounters.rb` and `models/grant.rb` (`Ohm::Model`, `include ObjectModel`, which gives `created_at` and `updated_at`).

```ruby
class Pf2eCreature < Ohm::Model
  include ObjectModel

  attribute :name
  attribute :name_slug                      # Domains.slug(name)
  index :name_slug

  reference :owner, "AresMUSH::Character"   # indexes owner_id
  attribute :owner_name                     # as it was, the way PF2Encounter keeps `organizer`

  attribute :audience                       # private | shared | plotmasters
  index :audience
  attribute :shared_with, :type => DataType::Array, :default => []   # character ids

  reference :head, "AresMUSH::Pf2eCreatureRevision"        # the latest
  reference :published, "AresMUSH::Pf2eCreatureRevision"   # the one staff approved, if any
  reference :submitted, "AresMUSH::Pf2eCreatureRevision"   # awaiting review, if any
  attribute :submitted_for                  # what the author asked for
  attribute :job_id
  attribute :retired_at, :type => DataType::Time

  # Copied from the head for lists and filters, so a list never loads a block.
  attribute :level, :type => DataType::Integer
  index :level
  attribute :traits, :type => DataType::Array, :default => []
  attribute :size
  attribute :rarity

  attribute :notes                          # the author's notes, markdown; no part of the stat block
  attribute :tags, :type => DataType::Array, :default => []
  attribute :cloned_from                    # 'bestiary:Goblin Warrior' | 'saved:12@4' | 'benchmarks:7/brute' | 'described'

  collection :revisions, "AresMUSH::Pf2eCreatureRevision", :creature
  collection :events, "AresMUSH::Pf2eCreatureEvent", :creature
end

class Pf2eCreatureRevision < Ohm::Model
  include ObjectModel

  reference :creature, "AresMUSH::Pf2eCreature"
  attribute :number, :type => DataType::Integer             # 1, 2, 3 within its creature
  attribute :block, :type => DataType::Hash, :default => {} # bestiary-shaped; never rewritten
  attribute :by
  attribute :by_id
  attribute :summary                                        # 'ac 18 to 19; added Strike Claw'
end

class Pf2eCreatureEvent < Ohm::Model
  include ObjectModel

  reference :creature, "AresMUSH::Pf2eCreature"
  attribute :kind      # created revised renamed audience shared unshared submitted withdrawn
                       # approved rejected unpublished retired restored cloned adopted
  attribute :by
  attribute :by_id
  attribute :revision, :type => DataType::Integer
  attribute :detail, :type => DataType::Hash, :default => {}
end
```

`Pf2eNpc` gains one line: `reference :revision, "AresMUSH::Pf2eCreatureRevision"`. Ohm's `reference` adds the `revision_id` attribute and its index (`ohm-3.1.1/lib/ohm.rb:969`), which is what "does any encounter hold this?" needs. Existing rows read `nil` for it, which is the right answer; no migration is needed.

The block in a revision has the bestiary's shape exactly, with `source` set to `"Custom: <owner>"` and no `pack`. Everything that reads a stat block already reads this shape: `Npcs`, `Adjustments`, `StatBlock.lines`, the scan, `Acting`.

Status is derived, not stored: retired if `retired_at`, else submitted if `submitted_id`, else published if `published_id`, else draft. A published creature whose `head_id` differs from `published_id` shows as "published, with newer changes".

### Why revisions and not a copy in `described`

The alternative is to copy the block into `Pf2eNpc.described` when the creature is added, with a tag saying where it came from. It needs no change to `written_stat_block`. I recommend against it for two reasons.

- **History size.** Each history entry holds the encounter before and after, and each holds every npc's attributes. A hand-typed description is a few hundred bytes. A web-built creature with spellcasting and a dozen abilities is the size of a bestiary entry: Monster Core averages about 3 KB of YAML per creature. Five of those over 300 entries is several megabytes of Redis for one encounter, and an ended encounter keeps its history as a record.
- **Approval.** Approval needs something that cannot change underneath it. With revisions, staff approve revision 4 and an edit makes revision 5, which nobody but the owner and staff gets until it is approved in turn. With a single mutable block, an author could publish a fair creature and then edit it.

Revisions also are the audit trail of who changed what.

### How an encounter reads one

```ruby
def written_stat_block
  (self.revision_id ? Pf2eCreatureRevision[self.revision_id]&.block : nil) ||
    (self.creature ? Pf2e::Bestiary.entry(self.creature) : nil) || self.described || {}
end
```

`Combatants.add_npc` takes `revision:` beside `creature:` and `described:`, and labels the npc from the revision's block name.

- **Edited later.** The npc still points at the revision it was added with. `+e/creature #3` shows the GM which: `Bandit Captain (c:12 rev 4, by Raven)`.
- **Retired later.** Nothing changes for an encounter that holds one. A retired creature cannot be added and leaves the lists.
- **Purged.** Staff may purge a creature only when `Pf2eNpc.find(:revision_id => id)` is empty for each of its revisions. Deleting an encounter deletes its npcs (`PF2Encounter#delete_combatants`), which is what eventually frees a revision.
- **Undo.** `History.restore` rebuilds an npc from its attributes, and `revision_id` is one of them, as `encounter_id` already is. Nothing in `History` changes.

A possible later command, not in this plan's phases: `+e/refresh <#id>` moves an instance to the creature's latest revision, recorded in history like `+e/adjust`.

### Resolving a name

New module `Pf2e::Creatures` (`helpers/creatures.rb`) sits above the bestiary and the saved creatures. `Bestiary` stays as it is.

```ruby
SOURCES = {
  'bestiary' => { 'block' => ->(ref) { Bestiary.entry(ref['name']) },
                  'usable' => ->(char, ref) { Gm.open?(char, ref['name']) } },
  'saved'    => { 'block' => ->(ref) { Pf2eCreatureRevision[ref['revision']]&.block },
                  'usable' => ->(char, ref) { CreatureAccess.may(CreatureAccess.actor(char), :use, ref['row']).ok? } }
}
```

`Creatures.find(char, term)` answers `Ok` with a ref (`{ 'source', 'name', 'id', 'revision', 'row' }`) or `Err`, in this order:

1. `c:<id>` or `c:<name>` (also `custom:`): saved creatures only. An id names one creature. A name is matched against the enactor's own first, then others they may use.
2. An exact bestiary name by slug. This is today's behaviour, unchanged.
3. An exact name among the enactor's own saved creatures.
4. An exact name among other saved creatures they may use. More than one is `:ambiguous`, listing each as `c:<id> <name> (<owner>)`.
5. A substring across the bestiary and the saved creatures they may use: one match is it; several are `:ambiguous` with the first eight, as `Bestiary.find` does now.

Rules that keep this unsurprising:

- A saved creature's name may not equal a bestiary name (`Bestiary.named`). The validator refuses it. A clone of Goblin Warrior starts as `Goblin Warrior (<owner>)`.
- Names are unique per owner, not across owners. Two Plotmasters may each keep a `Bandit Captain`; each gets their own by name and the other's by `c:<id>`.
- At approval for `everyone`, the name must also be unique among published creatures.
- A later bestiary import can introduce a clash. Step 2 means the bestiary wins and the saved one stays reachable by `c:`. `Creatures.clashes` lists them, for a rake task to run after an import.
- A name may not hold `=`, `;` or `#`, start with a number and a space, or start with `elite ` or `weak `, because `+e/add` parses all of those.

Which revision a ref carries: the owner and staff get the head. Anyone else gets the published revision if there is one, and the head otherwise.

`+e/add` keeps trying `Described.read` first. A term like `c:bandit=Rook` has no `ac` in it, so `Described.read` answers nil and the resolver runs.

## 2. Access

### Who may do what

`Pf2e::CreatureAccess` (`helpers/creature_access.rb`) is pure: `may(actor, action, row)` answers `Ok` or `Err` with a code. The actor is a plain hash built by `CreatureAccess.actor(char)`: `{ 'id', 'kind' => Gm.kind(char), 'approved' => char.is_approved? }`. The row is `Creatures.row(creature)`. `ACTIONS` is a table, one row per action.

"Published" is an approved revision: approval publishes it for everyone (Raven, answers 1 and 2). "It reaches" a Plotmaster or staff member when they are named in its shares or it is shared with all Plotmasters.

| Action | Its owner | A Plotmaster or staff member it reaches | Anyone else | An admin |
|---|---|---|---|---|
| create | any approved character | | | yes |
| view (block and notes) | yes | yes | only if published | yes |
| use (`+e/add`) | if a Plotmaster or staff; anyone else only once published | yes, while they are a Plotmaster or staff | only if published | yes |
| clone | yes | yes | only if published | yes |
| edit, rename, notes | yes | no | no | yes |
| share | yes, and only with Plotmasters and staff | no | no | yes |
| submit, withdraw | yes | no | no | yes |
| approve, reject, unpublish | no | no | no | yes |
| retire, restore | yes, unless published | no | no | yes |
| purge, hand to a new owner | no | no | no | yes |

An owner who stops being a Plotmaster keeps their creatures and may edit them, but adds one to an encounter only once it is published (Raven, answer 8).

### The options, weighed

- **Private to its author.** The default for a new creature. Needed regardless.
- **Shared with named characters.** Kept, with one rule: a share only works for someone who is a Plotmaster when they use it, checked at use. Naming an event runner is refused (`:share_needs_plotmaster`). A share is a courtesy between people who could each have typed the creature themselves; it gives nobody a power they lacked.
- **Shared with all Plotmasters.** Kept, with no staff approval, for the same reason.
- **Staff-approved, usable by everyone.** This is the controlled way to widen what event runners run beyond Monster Core. It is the only path by which an event runner touches a custom creature, and it is always one specific revision.
- **Plotmaster only.** Not a separate flag: a Plotmaster's creature that is not published is theirs and their shares' alone.

Rejected: letting sharing reach event runners. That would let any Plotmaster decide what every player may run, which is the decision the game owner reserved to staff by listing bestiaries in `pf2e.event_runner_bestiaries`.

### How it meets `Pf2e::Gm`

- `Gm.open?(char, creature)` stays, for a bestiary name.
- `Gm.may_add?(char, ref)` is added and dispatches through `Creatures::SOURCES[ref['source']]['usable']`. `+e/add` and `+e/bestiary` call it instead of `Gm.open?`.
- A one-off `+e/add <name>=<description>` stays a Plotmaster's or staff's, unchanged.
- Lethality is untouched. `Gm.lethal?` asks who runs the encounter, never what is in it, so an event runner with a published creature still cannot kill, Drain or Doom.

### Permissions

- `kill_pc`: unchanged. Using an unpublished creature asks `Gm.plotmaster?`.
- No new permission. Admins approve, reject, unpublish, edit or retire anyone's creature, see every creature, and purge (Raven, answer 4). Unpublish and retire are also the staff override for a player whose last will asks for their creatures to go (answer 8).
- `trusted_gm`: not involved.

### Audit

- Every stat block change is a `Pf2eCreatureRevision` with who, when and a generated summary.
- Every other change is a `Pf2eCreatureEvent`: audience, shares, submission, approval with the revision number, rejection with its reason, retirement, a change of owner.
- Approvals and rejections are also written with `Global.logger.info`, and to the job if one is open (section 4, the queue).
- `creature/history <name>` and the view page show both lists to the owner and staff.

### When an owner goes

The game does not delete approved characters (Raven, answer 8), so this is for the rare deletion staff make. `Character#delete_pf2` (`plugins/pf2e/models/character_mods.rb`) gains a call: a deleted owner's published creatures stay, with `owner` cleared and `owner_name` kept, for staff to hand on; the rest are retired. A character who loses `kill_pc` keeps their creatures and may edit them, but `use` fails until they are a Plotmaster again or the creature is published.

## 3. Commands

A new root, `creature`, routed in `plugins/pf2e/pf2e.rb`'s `case cmd.root`. Handlers go in `plugins/pf2e/commands/creature/`, locale strings in `locales/locale_en.yml`, help in `help/en/pf2e_creatures.md`.

Each handler is a shell: parse, build the actor and the row, call a pure core, write through `CreatureStore`, emit with `CharState.emit_error!`.

| Command | Does | Core |
|---|---|---|
| `creature/list [mine\|shared\|published\|all][/<level>]` | saved creatures you may use, with id, level, owner, status | `Creatures.search` |
| `creature <creature>` | header and `StatBlock.lines` | `Creatures.find`, `CreatureAccess` |
| `creature/save <name>=<description>` | a new creature, or a new revision of yours, from a line | `Described.read`, `CreatureCheck.check` |
| `creature/save <name>=#<id>` | saves a creature from your running encounter | reads the npc's `written_stat_block` |
| `creature/clone <creature>=<new name>` | a copy of a bestiary or saved creature you may view | `Creatures.find`, `CreatureCheck.check` |
| `creature/set <name>=<part>` | one part: `ac 19 hp 40`, `strike claw +9 1d6+4 slashing (agile)`, `notes ...` | `CreatureDraft.set` over `Described.part_of` |
| `creature/unset <name>=<part> [<which>]` | removes `strike claw`, `ability fire breath`, `resist fire` | `CreatureDraft.unset` |
| `creature/rename <name>=<new name>` | | `CreatureCheck.name` |
| `creature/describe <name>` | prints the line that recreates it | `Described.write` |
| `creature/check <name>` | errors, warnings, and where each figure sits for its level (phase 4) | `CreatureCheck`, `CreatureBenchmarks` |
| `creature/share <name>=<character>[,...]\|plotmasters\|private` | sets the audience; only Plotmasters and staff are named | `CreatureAccess`, `CreatureSharing` |
| `creature/unshare <name>=<character>` | | same |
| `creature/history <name>` | revisions and events | |
| `creature/retire <name>`, `creature/restore <name>` | | `CreatureAccess` |
| `creature/submit <name>[=<note>]` | asks an admin to approve the head | `CreatureReview.submit` |
| `creature/withdraw <name>` | | `CreatureReview.withdraw` |
| `creature/queue` | staff: what awaits review | |
| `creature/approve <creature>` | admins: publishes the submitted revision for everyone | `CreatureReview.approve` |
| `creature/reject <creature>=<reason>` | staff | `CreatureReview.reject` |
| `creature/unpublish <creature>`, `creature/purge <creature>`, `creature/owner <creature>=<character>` | staff | |

Changes to existing commands, all in `encounter_creature.rb`:

- `+e/add [<count>] [elite|weak] <creature>[=<name>]`: `Creatures.find(enactor, term)`, then `Gm.may_add?`, then `add_npc` with `:creature` or `:revision`. Elite and Weak apply to a saved creature as to any block.
- `+e/creature <#id|creature>`: a combatant as now; otherwise `Creatures.find` and `CreatureAccess` `:view`.
- `+e/bestiary <words>[/<level>]`: bestiary matches as now, plus saved creatures the enactor may use, each marked `[yours]`, `[<owner>]` or `[published]`.

`creature/set` is what answers "a long line must be retyped each time": a creature is built a part at a time and kept. Setting a Strike or ability whose name already exists replaces it.

`Described.write(block)` is new and is the inverse of `read`. The grammar grows in phase 3 so the two stay inverse for everything the web editor can save:

- a Strike's effects: `strike jaws +12 2d8+6 piercing plus Grab`. Today `plus Grab` fails the `DAMAGE` match and the whole Strike is refused.
- an ability's traits: `ability Fire Breath [2] (arcane, fire): ...`
- `spells <name> dc 20 attack +12 <tradition> <type>: 0 detect magic, daze; 1 fear`. This needs a separator other than `;` inside the part, or a part per rank; decide when building.
- `hp-details <words>`

`rules` cannot be written on a line and are not meant to be. `creature/describe` says so when a block carries any.

Shell-side writes live in `Pf2e::CreatureStore`: `create!`, `revise!` (new revision, head moved, list fields recopied, event written), `event!`. No command or handler writes a model directly.

## 4. The web creature creator

### Routes

Added to `ares-webportal/app/custom-routes.js`:

| Route | Path | Mixin | Page |
|---|---|---|---|
| `pf2-creatures` | `/pf2/creatures` | `AuthenticatedRoute` | library |
| `pf2-creature` | `/pf2/creature/:id` | `AuthenticatedRoute` | a saved creature |
| `pf2-bestiary-creature` | `/pf2/bestiary/:name` | `AuthenticatedRoute` | a bestiary creature |
| `pf2-creature-create` | `/pf2/creatures/create` | `AuthenticatedRoute` | editor, new |
| `pf2-creature-edit` | `/pf2/creature/:id/edit` | `AuthenticatedRoute` | editor |
| `pf2-creature-queue` | `/pf2/creatures/queue` | `AuthenticatedRoute` | approval queue |

`RestrictedRoute` admits only `is_admin` or `is_coder` from the session, and the session does not know who is a Plotmaster or holds `manage_creatures`. So every page uses `AuthenticatedRoute`, the server decides, and each response carries a `can` object the templates read. A link in the navbar is a line in `game/config/website.yml`, for the owner to add.

### What the portal already gives

- `gameApi.requestOne` and `requestMany`, which flash a returned `error` and can stay on the page when passed `null`.
- `AuthenticatedRoute`, `AuthenticatedController` (`isAdmin`, `currentUser`), `ConfirmAction` and `Paginator` mixins.
- `<FlashMessages />`, the `.form-item` layout classes, Ember's `<Input>` and `<Textarea>`.
- `<PowerSelect>` and `<PowerSelectMultiple>` with search, as `plot-edit.hbs` uses for storytellers.
- ember-bootstrap and Bootstrap 5: tabs, modals, collapse, the responsive grid, tables, badges.
- `<MarkdownEditor>` for the notes; `<TooltipIcon>`; `<YamlEditor>` for a staff raw view.
- `ember-concurrency` for a restartable debounced task; `ember-truth-helpers`; the `pf2-join` helper.
- The stock `characters` request for a character picker.

It gives no client-side form validation library and no tests.

### Server: `plugins/pf2e/web/creature_handlers.rb`

One file, as `encounter_handlers.rb` is. A `CreatureWeb` module holds the serialisers; each handler calls `Website.check_login(request)` (never anonymous), builds the actor, asks `CreatureAccess`, and returns a hash or `{ error: }`. Each is added to `Pf2e.get_web_request_handler`.

A `ref` is `'saved:12'` or `'bestiary:Goblin Warrior'`. A `summary` is:

```
{ ref, source, id, name, level, size, rarity, traits: [],
  owner, audience, status, revision, published_revision, updated,
  can: { view, use, edit, clone } }
```

A `checked` block is what every request that shows a stat block returns:

```
{ block: {...},                         // normalised, bestiary-shaped
  lines: [ "..." ],                     // StatBlock.lines through EncounterWeb.plain
  findings: [ { path: "strikes.0.damage.0.0", level: "error"|"warning"|"note",
                code: "bad_formula", message: "..." } ],
  bands: { "ac": "high", "saves.will": "below low", "strikes.0.bonus": "moderate", ... },   // phase 4
  mechanised: [ { path: "actions.2", how: "damage_save"|"action"|"follow_up"|"rules"|"healing"|"spell"|"announced",
                  message: "Rolls each target's basic Reflex save against DC 20 and deals 4d6 fire." } ] }
```

| Request | Args | Answers | Phase |
|---|---|---|---|
| `pf2Creatures` | `{ scope: "mine"\|"shared"\|"published"\|"bestiary"\|"all", q, level_min, level_max, trait, status, page }` | `{ creatures: [summary], page, pages, total, can_create, limit: { used, max } }` | 2 |
| `pf2Creature` | `{ ref, revision?, adjustment? }` | `checked` plus `{ summary, notes, tags, cloned_from, shared_with: [names], add_command: "+e/add c:12", revisions: [ { number, by, at, summary, published } ], events: [ { kind, by, at, revision, detail } ] }`; `revisions` and `events` only for the owner and staff | 2 |
| `pf2CreatureOptions` | `{}` | `{ sizes, rarities, damage_types, damage_categories, speeds, senses, immunities, iwr_types, creature_traits, strike_traits, attack_effects: [ { name, follow_up } ], skills, costs, traditions, casting_types, road_maps, levels: [min, max], limits }` | 3 |
| `pf2CreatureSpells` | `{ q, tradition?, rank? }` | `{ spells: [ { name, rank, traits, resolved: true } ] }`, at most 30 | 3 |
| `pf2CreatureStart` | `{ from: ref \| "blank" \| "benchmarks" \| "description", level?, road_map?, description? }` | `checked` plus `{ cloned_from }`; saves nothing | 3 (benchmarks in 4) |
| `pf2CreatureCheck` | `{ id?, name, block, adjustment? }` | `checked` | 3 |
| `pf2CreatureSave` | `{ id?, base_revision?, name, block, notes, tags, cloned_from? }` | `{ id, revision, findings }`, or `{ error, findings }` with errors, or `{ error, head }` when `base_revision` is no longer the head | 3 |
| `pf2CreatureShare` | `{ id, audience, shared_with: [names] }` | `{ summary }` | 3 |
| `pf2CreatureRetire` | `{ id, retire: true\|false }` | `{ summary }` | 3 |
| `pf2CreatureSubmit` | `{ id, note }`, or `{ id, withdraw: true }` | `{ summary, job_id }` | 5 |
| `pf2CreatureQueue` | `{}` | `{ submissions: [ { summary, revision, submitted_at, asked_for, note, job_id, errors, warnings, changes: [ { path, was, now } ] } ] }` | 5 |
| `pf2CreatureReview` | `{ id, revision, decision: "approve"\|"reject"\|"unpublish", note }` | `{ summary }` | 5 |

Notes on these:

- `pf2Creatures` with scope `bestiary` reads only `Bestiary.index`, which holds name, pack, level and traits, and filters by `Gm.open?` as `+e/bestiary` does. Fifty a page, paged on the server: there are 2,994.
- `pf2CreatureSpells` searches `pf2e_spell_mechanics`, not `pf2e_spells` (668 player spells), because it is what `Acting.cast` resolves against. The editor also accepts a name that is in neither.
- `pf2CreatureSave` rejects a stale `base_revision` so two tabs cannot silently overwrite each other.
- The Elite and Weak preview is `Adjustments.apply` on the server through the `adjustment` argument. The portal does not reimplement it.
- No request adds a creature to an encounter. The view page shows the `+e/add` line to copy. Adding from the web would have to go through `History.recording` and the room announcement, and the encounter page is read-only today; leave it for later.

### Components

Colocated under `app/components/`, `pf2-` prefixed, written as Glimmer components with tracked state.

| Component | Is |
|---|---|
| `pf2-stat-block` | a `checked` block as headed sections and definition lists, with band badges and finding marks; used by view, preview and queue |
| `pf2-band-badge` | `low`, `moderate`, `high`, `extreme`, `below low`, `above extreme` as a word in a badge |
| `pf2-findings` | the errors and warnings, each linking to its field |
| `pf2-creature-form` | the editor: holds the block, runs the debounced check, owns Save |
| `pf2-creature-start` | the four ways to begin |
| `pf2-creature-defences`, `-senses`, `-skills` | sections of the form |
| `pf2-strike-editor`, `pf2-damage-row` | one Strike; one damage instance |
| `pf2-ability-editor` | one ability, with its hint |
| `pf2-spellcasting-editor` | one spellcasting entry, with a spell picker per rank |
| `pf2-creature-sharing` | audience, shares, submit |

A small service, `pf2-creature-options`, fetches `pf2CreatureOptions` once and holds it.

### Page: library (`pf2-creatures`)

- **Scope tabs:** Mine, Shared with me, Published, Bestiary, and All for staff. Kept in the URL as a query param, with the filters, so a filtered list can be linked.
- **Filters:** name contains; level from and to; trait (a `PowerSelect` over the options); status (Mine and All only).
- **Table:** name, level, size, traits, owner, a status and audience badge, revision, updated. Row actions from `can`: View, Edit, Clone.
- **Buttons:** New creature when `can_create`.
- **Empty states:** an event runner sees Mine, Published and Bestiary, with a line saying that their own creatures are added to an encounter once an admin approves them.
- **The Bestiary tab** says that most of what it lists is there to build from: an event runner adds only Monster Core and Monster Core 2 creatures (`pf2e.event_runner_bestiaries`), and each row they may not add says so (Raven, 2026-10-14).
- **The site's own design.** The pages sit inside the portal's layout, with its header and navigation, styled from `game/styles` in `aresmush`; the mock-ups' banner is not built. Raven adds the link to the library in a menu in `website.yml` once the route exists.
- **Requests:** `pf2Creatures`, `pf2CreatureOptions`.

### Page: a creature (`pf2-creature`, `pf2-bestiary-creature`)

- The stat block.
- A side panel: owner, audience and who it is shared with, status, which revision is shown and which is published, where it was cloned from, the notes.
- Elite, Weak, Normal buttons that re-request with `adjustment`.
- The `+e/add` line, with a copy button.
- For the owner and staff: a revision picker that re-requests with `revision`, and the event list.
- Buttons from `can`: Edit, Clone, Share, Submit, Retire. Retire asks first (`ConfirmAction`).
- A bestiary creature's page has the stat block, the adjustment buttons, the add line and Clone.
- **Request:** `pf2Creature`.

### Page: editor (`pf2-creature-create`, `pf2-creature-edit`)

**Starting (create only).** `pf2-creature-start` offers:

- Blank, at a level.
- Clone: a search over every scope the user may view ("start from Goblin Warrior and change it").
- From benchmarks: a level and a road map ("level 7 brute"). Phase 4.
- Paste a description: a `+e/add` line, read by `Described.read`.

Each calls `pf2CreatureStart` and loads the block it answers. `?from=`, `?level=` and `?road_map=` on the URL skip the dialog, which is how Clone on another page arrives.

**Layout.** Form on the left, preview on the right from `lg` up, with the preview sticky. Sections are tabs on a wide screen and stacked collapsible panels on a narrow one.

**Sections and fields** (an asterisk is required):

1. **Identity.** Name*; level* (-1 to 25); size (select, default medium); rarity (select, default common); traits (multi-select from the options, and a typed one is allowed with a warning); notes (`MarkdownEditor`; saved beside the block); tags.
2. **Defences.** AC*, Fortitude*, Reflex*, Will*, Hit Points*; hit point details (text, with the hint that `regeneration 20 (deactivated by acid or fire)` and `fast healing 5` are applied as its turn starts); immunities (multi-select); weaknesses and resistances (rows of a type and a value; add and remove); hardness; a shield (name, hardness, Hit Points, the AC it adds), with the hint that the creature can then Raise a Shield and Shield Block.
3. **Perception, speeds, attributes, skills.** Perception*; senses (multi-select, plus typed ones such as `scent 30 feet`); five speeds; six attribute modifiers; skills (rows of a skill from `pf2e_skills` or a typed Lore, and a modifier). A hint says a skill left off uses the attribute modifier alone, which is `Npcs.skill`'s rule.
4. **Strikes.** A `pf2-strike-editor` each:
   - name*, melee or ranged (ranged shows a range increment, stored as `range`), attack bonus*.
   - Damage rows: formula*, type* (select), category (none, persistent, precision, splash). At least one row.
   - Traits: a multi-select. Traits that take a number (`reach`, `thrown`, `deadly`, `fatal`, `versatile`, `volley`, `reload`) are picked and then given their value.
   - Attack effects: a multi-select. Grab, Knockdown, Push and their Improved forms are marked "the engine offers the follow-up"; any other is marked "announced for the GM".
   - Move up, Move down, Duplicate, Remove. A hint says the first Strike is the one `+e/as <#id>=strike` uses when none is named (`Npcs.strike`).
5. **Abilities.** A `pf2-ability-editor` each:
   - name*; cost (one, two or three actions, reaction, free, passive), stored as `type` and `cost`; traits; text*.
   - Line breaks are typed as line breaks and stored as `%r`, which is how the bestiary stores them.
   - **The hint**, from `mechanised` in the last check, says one of:
     - "Runs as the action Grapple." The name is one of the catalogue's or a follow-up.
     - "Rolls each target's basic Reflex save against DC 20 and deals 4d6 fire." `CreatureAbilities.damage_save` matched.
     - "Carries rules from Goblin Warrior: Aura." It was cloned with `rules`.
     - "Announced. The GM runs it." With why where there is one: the text lists outcomes by degree, so the save is not basic.
   - An "Insert damage and save" control takes a formula, a type, a DC and a save, and writes `deals 4d6 fire damage (DC 20 basic Reflex save)`, the wording the engine reads.
   - `rules` are shown read-only with a Remove button. The editor never writes them.
6. **Spellcasting.** A `pf2-spellcasting-editor` each: name (defaulting from tradition and type), tradition, type (prepared, spontaneous, innate, focus), DC*, attack*; for each rank from cantrips to 10, a multi-select searching `pf2CreatureSpells`, optionally limited to the tradition. A spell the engine does not resolve is marked "announced". How often each spell may be cast follows the type: a prepared spell is added once per preparation, a spontaneous entry takes a number of slots per rank, an innate spell takes uses per day or the words at will or constant. A hint says the game counts these castings and refuses one past the limit, and that cantrips are at half the creature's level, rounded up (`Npcs.spell_limit`, `Actors`' `listed_spell_rank`).
7. **Sharing.** Audience (private, named Plotmasters, all Plotmasters); a character picker for the named ones; from phase 5, Submit for approval with who it should be open to and a note.

**Preview.** `pf2-stat-block` from the last check, with the adjustment buttons, and `pf2-findings` above it.

**Live validation.** A restartable task waits 400 ms after the last change and calls `pf2CreatureCheck`. The client itself checks only that required fields are filled and numbers are numbers, for an immediate mark. Everything else is the server's answer. Save is disabled while there is an error; warnings never block.

**Saving.** `pf2CreatureSave`, then to the view page with a success flash. A stale `base_revision` shows who saved revision N and offers to reload or to save as a clone. Unsaved work is kept in `localStorage` under the creature's id and offered back on return; leaving with unsaved changes asks first.

**Requests:** `pf2CreatureOptions`, `pf2CreatureStart`, `pf2CreatureCheck`, `pf2CreatureSpells`, `pf2CreatureSave`, `pf2CreatureShare`, `pf2CreatureRetire`, and the stock `characters`.

### Page: approval queue (`pf2-creature-queue`)

- Each submission: name, level, author, revision, when, what was asked for, the author's note, counts of warnings, a link to its job.
- Expanding one shows the stat block with bands, every finding, and what changed since the published revision (`changes`).
- Controls: a note, Approve, Reject. Reject requires the note. Both ask first.
- **Requests:** `pf2CreatureQueue`, `pf2CreatureReview`.

On submit the server also opens a job with `Jobs.create_job` in the category named by `pf2e.creature_approval_category` (default the game's request category, `REQ`), holding the stat block lines and findings; on a decision it comments and closes it with `Jobs.close_job`. Staff already work in jobs, and a job gives the conversation with the author and its notifications without building either. The queue page and `submitted_id` remain the record; a blank category opens no job.

### Accessibility and mobile

- Every input has a real `<label for>`. The stock `.form-item-label` is a `div`; do not rely on it.
- Each Strike, ability and spellcasting entry is a `<fieldset>` with a `<legend>` naming it.
- A band is a word, never colour alone. An invalid field gets `aria-invalid` and `aria-describedby` to its finding; the findings list is an `aria-live="polite"` region.
- Buttons say what they act on: "Remove Strike Claw". Reordering is by buttons, with no drag-only path.
- The session carries `screen_reader`. With it set, the preview is the plain `lines`.
- Under `md` the form is one column and the preview is a collapsed panel below it. Number fields use `inputmode="numeric"`. The library table becomes cards.
- An ability's text is rendered with normal `{{ }}` escaping, never triple braces.

## 5. Validation

One pure module, `Pf2e::CreatureCheck` (`helpers/creature_validator.rb`), used by `creature/save`, `creature/set`, `creature/clone`, `pf2CreatureCheck` and `pf2CreatureSave`.

- `CreatureCheck.findings(name, block, rules)` answers every finding: `{ 'path', 'level', 'code', 'key', 'args' }`. `rules` is a plain hash of vocabulary, limits, benchmarks and the names already taken, so a spec builds it from literals.
- `CreatureCheck.check(name, block, rules)` answers `Err.new(:creature_invalid, ...)` carrying the findings when any is an error, and otherwise `Ok` with the normalised block and each warning as a message.
- It is a table: one row per field with its path, whether it is required, how it is normalised and how it is checked. A key no row names is dropped with a warning, so nothing unknown reaches the engine unnoticed.
- The command line prints the first few findings; the web places each by its path.

A saved creature is held to more than `Described.read` asks. A one-off `+e/add <name>=<description>` stays as lenient as it is.

### Errors: the creature is not saved

| Field | Rule |
|---|---|
| name | present; at most 60 characters; not a bestiary name; unique among the owner's; none of `=`, `;`, `#`; not starting with a count, `elite ` or `weak ` |
| level | an integer from -1 to 25, the bestiary's range |
| ac, hp, perception, fortitude, reflex, will | present integers; hp at least 1 |
| size | one of the bestiary's six words |
| rarity | common, uncommon, rare, unique |
| speeds | keys among land, fly, swim, climb, burrow; values not negative |
| attributes | keys among str, dex, con, int, wis, cha; integers |
| skills | a skill of `pf2e_skills` or a name ending in `Lore`; an integer. A misspelt skill would silently leave the creature untrained |
| weaknesses, resistances | a positive integer each |
| a Strike | a name; an integer bonus; at least one damage instance |
| a damage formula | `NdM`, `NdM+K`, `NdM-K` or a number. `Pf2e.roll_formula` reads anything else as 0 without complaint |
| a damage type | one of the types the bestiary's Strikes use: bludgeoning, piercing, slashing, acid, cold, electricity, fire, sonic, force, mental, poison, spirit, vitality, void, bleed, untyped |
| a damage category | none, persistent, precision, splash |
| an ability | a name; a type among action, reaction, free, passive; a cost of 1 to 3 exactly when it is an action; text unless it has rules |
| `rules` | accepted only when identical to the rules on the same-named ability or Strike of the creature it was cloned from, or when saved by staff |
| spellcasting | a name; a tradition among arcane, divine, occult, primal; a type among prepared, spontaneous, innate, focus; integer DC and attack; ranks `0` to `10`; no empty spell name |
| size limits | at most 12 Strikes, 40 abilities, 6 spellcasting entries; text at most 2,000 characters; the whole block at most 32 KB |

### Warnings: saved, and shown

- A creature trait, Strike trait, sense, immunity, or weakness or resistance type the vocabulary does not have. A weakness to a type nothing deals never applies.
- An attack effect the engine does not follow up.
- An ability the engine will only announce.
- A spell not in `pf2e_spell_mechanics`.
- A speed that is not a multiple of 5.
- A figure outside its benchmark table for the level (phase 4).
- A level above the benchmark tables, which have nothing to compare it with.

### The vocabulary

The game has no list of creature traits, senses or immunities. Rather than hand-write one, generate it from the bestiary: a small script, `aresmush/scripts/bestiary_vocabulary.py`, reads `game/bestiary/*.yml` and writes `game/bestiary/vocabulary.yml`. `import_foundry_npcs.py --write` calls it at the end. `Bestiary.vocabulary` reads it once, like the index. It must not be computed at runtime: parsing 14 MB of YAML on the reactor thread would stall the game.

What it holds, from a census of the packs: 180 creature traits, 98 Strike trait forms (numbers replaced by a pattern), 15 senses, 67 immunities, 42 weakness and resistance types, 492 attack effect names, 16 damage types.

`pf2e.creature_extra_traits` in `pf2e_options.yml` adds the setting's own.

## 6. Benchmarks

GM Core's "Building Creatures" tables are not in the repo. They go in a new `aresmush/game/config/pf2e_creature_benchmarks.yml`, root key `pf2e_creature_benchmarks`, with the same kind of header `pf2e_rewards.yml` has: each table's name, GM Core page, and that it was checked against Archives of Nethys (https://2e.aonprd.com, GM Core, Building Creatures).

**No number in that file is to come from memory or from this plan.** Transcribe from Archives of Nethys.

The tables to transcribe, by the names I expect them under (confirm each when transcribing): Attribute Modifier Scales; Perception; Skills; Armor Class; Saving Throws; Hit Points; Resistances and Weaknesses; Strike Attack Bonus; Strike Damage; Spell DC and Spell Attack Bonus; Area Damage. They run from level -1 to 24. Their columns differ: some have extreme, high, moderate, low; Perception and saves add terrible; Hit Points has ranges; Strike and area damage give a formula and its average.

The base road maps (brute, skirmisher, sniper, soldier, spellcaster and the others GM Core lists) are transcribed as a band per figure. They are what "level 7 brute" reads.

Shape:

```yaml
pf2e_creature_benchmarks:
  levels: [-1, 24]
  tables:
    ac:            { columns: [extreme, high, moderate, low], rows: { -1: [...], 0: [...] } }
    hp:            { columns: [high, moderate, low], ranges: true, rows: { -1: [[hi, lo], ...] } }
    strike_damage: { columns: [extreme, high, moderate, low], rows: { -1: [ { formula: ..., average: ... }, ... ] } }
  road_maps:
    brute: { perception: low, ac: [moderate, low], fortitude: high, ... }
```

`Pf2e::CreatureBenchmarks` (`helpers/creature_benchmarks.rb`), pure, taking the tables as an argument:

- `band(table, level, value)`: the highest column the figure reaches, or `above <top column>` or `below <bottom column>`.
- `assess(block, tables)`: a band for AC, each save, Perception, each skill, hit points, each attribute modifier, each Strike's bonus, each Strike's damage (the sum of `Pf2e.average` over its non-persistent instances against the table's average), each spell DC and attack, each weakness and resistance against the minimum and maximum, and the damage of an ability `CreatureAbilities.damage_save` reads against area damage, taking the limited-use column where `Adjustments::LIMITED` matches its text.
- `starting(level, road_map, tables)`: a block at that level with each figure at the road map's band, the middle of the hit point range, and one Strike named `Strike` for the author to rename. Where a road map offers two bands it takes the first.

Inside the table a band is a note. Above the top column or below the bottom one is a warning. Neither blocks saving. Staff see all of it at approval.

## 7. Phases

Each phase is usable when it lands. Sizes are rough working days for one developer who knows the code. The db suite is slow; run single files with `bundle exec rspec --pattern '<file>'`.

### Phase 1: saved creatures, the command line, access and approval. About 8 days

Builds: the three models; `Pf2eNpc`'s `revision`; `Creatures`, `CreatureAccess`, `CreatureCheck` (errors only, vocabulary warnings waiting for phase 3), `CreatureDraft`, `CreatureStore`, `CreatureReview`, `Described.write`; `Gm.may_add?`; `add_npc`'s `revision:`; the `creature` commands, approval among them, but for `check`; the house bestiary file written on approval; the three `+e` commands through the resolver; `help/en/pf2e_creatures.md` and a paragraph in `pf2e_combat.md`; the owner-deleted hook.

Approval moves here from phase 5: a player's creature is no use to them until an admin approves it (Raven, answer 3). Phase 5 keeps the web queue and the job.

Usable as: anyone saves a creature and builds it up a part at a time; a Plotmaster shares it with another and adds it by name; a player submits theirs and adds it once an admin approves it.

Specs:

- Unit:
  - `creature_validator_specs.rb`: one example per row of the table, from literal blocks.
  - `creature_access_specs.rb`: the matrix of actor kinds by audiences by actions, walked from a table, so no cell is unstated.
  - `creature_catalogue_specs.rb`: the resolution order over literal lists, and the `c:` forms.
  - `creature_draft_specs.rb`: set, replace by name, unset.
  - `described_creature_specs.rb`, extended: `read(write(block)) == block`.
- `:dbtest`:
  - `saved_creature_specs.rb`: revisions are never rewritten, the head moves, list fields follow, retire, purge refused while an encounter holds one.
  - `creature_command_specs.rb`: each command through the dispatcher.
  - `encounter_creatures_specs.rb`, extended: add by saved name; an edit after adding leaves the npc's block as it was; retiring does too; elite applies; undo of an add and redo.
  - `gm_kinds_specs.rb`, extended: an event runner is refused a Plotmaster's creature.
  - `history_specs.rb`, extended: a snapshot of an npc with a revision holds its id and not its block.

### Phase 2: the library and the stat block, read-only. About 3 days

Builds: `pf2Creatures`, `pf2Creature`; `CreatureWeb`; the `pf2-creatures`, `pf2-creature` and `pf2-bestiary-creature` routes; `pf2-stat-block`.

Usable as: a GM browses the bestiary and their saved creatures on the web, reads a stat block as it would be elite or weak, and copies the line that adds it.

Specs: `creature_web_specs.rb` (`:dbtest`): each handler refuses without a login; each answers per actor as the access matrix says; no response to someone who may not view holds a block or notes; the bestiary scope shows an event runner only the open packs.

### Phase 3: the web editor. About 9 days

Builds: `pf2CreatureOptions`, `pf2CreatureSpells`, `pf2CreatureStart` (blank, clone, description), `pf2CreatureCheck`, `pf2CreatureSave`, `pf2CreatureShare`, `pf2CreatureRetire`; the vocabulary script, file and `Bestiary.vocabulary`; vocabulary warnings; `Pf2e::CreatureMechanised` (what the engine will do with each Strike effect, ability, spell and `hp_details`, by asking the same matchers the engine uses); the `Described` grammar for effects, ability traits, spells and hit point details; the editor routes and components.

Usable as: a Plotmaster builds, clones and edits a creature in the browser with a live preview, and it is the same creature `creature/describe` prints.

Specs:

- Unit: `creature_mechanised_specs.rb` (each answer, and that it agrees with `CreatureAbilities.damage_save` and `Acting::FOLLOW_UPS` on the same input); `described_creature_specs.rb` for the new grammar and its round trip; a vocabulary spec that every damage type the validator accepts is one the vocabulary file holds.
- `:dbtest`: `creature_web_specs.rb`, extended: save creates and revises; a stale `base_revision` is refused; a block with an error is not saved; sharing with a non-Plotmaster is refused; `rules` not from the clone source are refused.

The portal has no test suite. Check the editor by hand against a fixed list: build the dragon from `pathfinder-monster-core.yml` field by field and compare `pf2Creature`'s lines with `+e/creature`'s.

### Phase 4: benchmarks and guided creation. About 4 days, plus the transcription

Builds: `pf2e_creature_benchmarks.yml`; `CreatureBenchmarks`; bands in every `checked` answer and in `pf2-stat-block`; `creature/check`; the benchmarks start in `pf2CreatureStart` and the dialog; `creature/new <name>=<level> <road map>`.

Usable as: "level 7 brute" gives a sound starting block, and every figure says where it sits for the level, on the web and on the command line.

Specs (unit):

- `creature_benchmark_specs.rb`: `band` at, between, above and below the columns; `assess` on a literal block; `starting` for each road map yields a block with no errors.
- `creature_benchmark_table_specs.rb`: against the real config: every level present in every table; as many cells as columns; no column higher than the one before it; no level lower than the one before it; a handful of cells checked against values copied from Archives of Nethys at transcription, the way `class_table_specs.rb` checks class tables.

The transcription can be done by anyone and before phase 4 starts. It wants a second reader.

### Phase 5: approval and publishing. About 4 days

Builds: `CreatureReview` (submit, withdraw, approve, reject, unpublish as a table of transitions); the commands left out of phase 1; `pf2CreatureSubmit`, `pf2CreatureQueue`, `pf2CreatureReview`; the queue page and the submit control; the job; `changes` between two revisions; the published scope everywhere; the uniqueness of published names; §7g of `docs/pathfinder-2e-in-emblem-of-ea.md` and the help brought up to date.

Usable as: staff approve a creature for everyone, and an event runner finds it in `+e/bestiary` and adds it.

Specs:

- Unit: `creature_review_specs.rb`: every transition allowed and refused; an edit after approval leaves the published revision where it was.
- `:dbtest`: `gm_kinds_specs.rb`, extended: an event runner adds a creature published for everyone, gets the approved revision and not a later edit, is refused one published for Plotmasters, and their encounter still cannot kill; `creature_web_specs.rb` for the three requests; a job is opened and closed.

This phase depends on open question 1. If the answer is that event runners never use custom creatures, it shrinks to approval for Plotmasters as a mark of quality, or is dropped.

## 8. Questions, and Raven's answers (2026-10-14)

1. **May event runners ever use a custom creature?** Yes, but only approved and published ones.
2. **May players read a published creature's stat block?** Yes, published ones only.
3. **Who may author?** Anyone. Plotmasters and admins need no approval for their own creatures; anyone else's needs an admin's approval before it is used.
4. **Who approves?** Admins. Plotmasters are not asked to do administration.
5. **Is sharing between Plotmasters free of staff review?** Yes: a Plotmaster may run another Plotmaster's unapproved creature shared with them, and an admin's, and an admin a Plotmaster's.
6. **A ceiling on what event runners get?** No; approval is the only control.
7. **Should "above extreme" block anything?** No: it is flagged to the author and to admins in the queue, and admins judge.
8. **When an author stops being a Plotmaster?** Approved characters are not deleted. Someone who stops being a Plotmaster keeps their stat blocks and may edit them, but submits them for approval to add one to an encounter. Staff can unpublish, for a player whose last will asks for their creatures to go.
9. **A limit per author?** None for now.
10. **Setting names?** The setting's where possible: the ancestry and heritage traits in the game's YAML. Raven can give the Golarion equivalents; not every Golarion ancestry is in Ea.
11. **A house bestiary file in git?** Yes.

Also from Raven: the pages belong in the portal's own design, styled from `game/styles` in `aresmush`, with a menu link Raven adds in `website.yml`; and the Bestiary tab says which stat blocks are there only to build from, since event runners add only Monster Core 1 and 2 creatures.

For Harry, as engineering:

- Revisions pinned by the npc, or a copy in `described`? The plan recommends revisions for the reasons in section 1.
- Is `c:` acceptable as the prefix that forces a saved creature, given `#` is taken by combatant ids?
- `Pf2eNpc#written_stat_block` reads a bestiary creature live by name, so a re-import changes what a running or ended encounter's creature is after the next restart. Out of scope here, but the same pinning would fix it if wanted.
- Should `+e/owner` refuse to hand an encounter holding a creature the new GM could not have added? It does not check that today for bestiary creatures either.

### Critical Files for Implementation

- aresmush/plugins/pf2e/models/npcs.rb
- aresmush/plugins/pf2e/commands/encounter/encounter_creature.rb
- aresmush/plugins/pf2e/helpers/described.rb
- aresmush/plugins/pf2e/helpers/gm.rb
- aresmush/plugins/pf2e/web/encounter_handlers.rb

Also read before starting: `aresmush/plugins/pf2e/helpers/bestiary.rb`, `helpers/combatants.rb` (`add_npc`), `helpers/history.rb` (`snapshot`, `restore`), `helpers/creature_abilities.rb`, `helpers/acting.rb` (`FOLLOW_UPS`, `announce_ability`, `cast`), `helpers/adjustments.rb`, `plugins/pf2e/pf2e.rb` (command and web routing), `game/config/pf2e_options.yml`, and in the portal `/home/grave/RiderProjects/Tenebrae-v2/ares-webportal/app/custom-routes.js`, `app/routes/pf2-encounter.js`, `app/templates/pf2-encounter.hbs`, `app/templates/plot-edit.hbs` and `app/controllers/plot-edit.js` (the stock edit-form pattern), `app/services/game-api.js`.