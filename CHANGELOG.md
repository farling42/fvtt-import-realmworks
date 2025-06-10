# CHANGELOG

## 13.0.0

- Foundry 13 only release, verified with 13.345.
- Reinstate button at the bottom of the Compendium tab.
- Fix an deprecation issue with DND5E import.

## 12.1.1

- PF1: Search for an exact match of the class before fuzzy matching (since "summonerUnchained" is found before "summoner")

## 12.1.0

- PF2: Attempt to perform basic conversion of PF1 HeroLab portfolios into PF2 NPC actors.

## 12.0.0

- Change minimum supported version to Foundry V12.
- PF1: Update PF1 decoding to work better with PF1e v11.
- PF1: Better method of generating spellbooks.

## 2.12.6

- Change `system.uses.max` to a string for Items created on Actors, so that migration to DND5e v4.1.x proceeds correctly.

## 2.12.5

- SWADE: Ensure that all NPCs are correctly marked as NOT wildcard actors.

## 2.12.4

- Ensure that the import includes fields which contain only annotation data (e.g. tag fields without a selected tag).
- PF1: Allow partial matching of class names.

## 2.12.3

- Since Foundry doesn't allow creating Scene Notes directly to journals stored in Compendiums, add support in Foundry 12+ to create a local journal entry that has an `@Embed` of the compendium journal entry. (This isn't available in Foundry 11.)

# 2.12.2

- Fix scene background image not being set.

## 2.12.1

- Get drop-down menus working on Foundry V12 for choosing Item/Journal compendiums.

## 2.12.0

- PF1: When the statblock-library module is enabled, the name of the creature in the statblock in the Actor's Notes tab will be a link to the matching compendium entry.
- Treat "00" as the high (or single) value in table ranges as "100" (assuming it is a percentage roll).
- Improve RollTable creation, reducing number of tables wrongly being created when they aren't really rollable tables.

## 2.11.0

- Provide the option to import Items and Journal Entries directly into Compendiums (choose open compendiums in the module settings).

## 2.10.1

- PF1: Update importer to work with pf1 version 10.4
- DND5E: Fix importing of spell range and level for DND5E 3.3.x (where DataModel was rejecting a number in a string)

## 2.10.0

- Get the core Importer to work in Foundry V12 as well as V11 (journals, scenes, playlists, etc.).
- Support for creation of Actors and Items in specific game systems might not be working at this point.

## 2.9.4

- Rename the provided DirectoryPicker to RWDirectoryPicker so that it doesn't conflict with a similar class name in other modules (such as ddb-importer).
- Ensure that the embedded RWDirectoryPicker class only works for THIS module's settings in Foundry's Configure Settings window.

## 2.9.2

- This fixes a bug in processing HL portfolios for PF1 version 9.x where the ability scores were not being corrected for the race of the imported creature.

## 2.9.1

- PF1: Improve decoding of resistances
- PF1: Use ";" as separator in the custom field for traits.
- Add link to github for users to report bugs.

## 2.9.0

- Fix import of PF1 portfolio files in Foundry 11

## 2.8.1

- Mark compatible with Foundry 11 (299)

## 2.8.0

- PF1: Look for Items in WORLD compendiums before looking in the SYSTEM and then MODULE compendiums.
- Ignore case of file extension when checking for valid file extensions.

## 2.7

- Allow storage of FVTT export files in Realm Works in Foreign Object Snippets. These files will automatically be imported to Foundry after all other import has finished. The filename must remain unchanged (i.e. using the format "fvtt-\<collectionmame>-\<docname>.json") (During import from Realm Works, the name of the object in the FVTT export file must match the name of the thing in Foundry, since the "docname" part of the filename might not match the slugified name of the Foundry object.)
- Change folder detection to use new way of determining folder parentage in Foundry V10.
- Use Buffer.from(base64).toString('utf8') instead of atob and local utf-8 conversion routine.

## 2.6.1

- Remove "compatibility.maximum" flag from module.json so that it will work in Foundry 11

## 2.6

- Improve generation of links to scenes.
- Move TinyMCE editor configuration into a separate source file.
- Ensure the module setting "Use 'secret' in Unrevealed Topics" works properly when NOT selected.

## 2.5

- Change created link format to the V10 preferred format @UUID[type.id]
- Add RWtrueName and RWaliasName classes to style.css (only trueName has a defined style of underline).
- All Systems: Manually created Items[] are created with the HAZARD icon.
- DND5E/PF1: Replace hard-coded lookup tables with tables constructed from the system's data tables.
- PF1: Add creation of Potions, Scrolls and Wands (including wand charges and used potions)
- PF1: Fix inconsistent detection of whether to create a 'character' or an 'npc'.
- PF1: Fix creation of custom skills.
- PF1: Fix marking custom attacks as 'reach' when appropriate.
- PF1: Mithral in the name of manually-created armour item will now modify ACP, DEX and weight.
- PF1: Try to guess the correct amount of temporary HP.
- PF1: Include archetype in the class name.
- PF1: Include the sourcetext (e.g. class) for each manually created Feature.
- PF1: Fix attack bonuses for natural attacks.

## 2.4

Foundry V10 seems to load every esmodule rather than only when referenced from the main import module. This meant that a file from the PF1 game system was trying to be accessed in every world. The module has been changed to no longer do this.

DND5E Actor decoding now sets CR and XP correctly for NPCs.

PF1 Actor decoding:

- Collects compendiums only once regardless of the number of actors being generated.
- Searches for "Item (Extra)" also as "Item, Extra"

## 2.3

Get secret sections to work as per Foundry V10 - providing the reveal/hide button.

There might be issues with some of the formatting since I haven't got the RW styles into the new ProseMirror editor block styles menu yet.

## 2.2

Confirmed as working with PF1 version 0.82.0 for Foundry V10; which emrges the changes from 1.26 into the V10 branch.

## 2.1

PF1 now works in Foundry V10.

## 2.0

Initial version for Foundry version 10 that works for Call of Cthulhu (coc7) game system.

## 1.26

Improvements to PF1 Actor decoding:

- Get alignment mapped correctly
- Ensure actors are set to PC if the portfolio has a role of "pc"
- Add nonlethal damage to generated actors
- Handle negative modifier to HP correctly
- Don't assume favoured class bonus is to HP
- Convert "-" for attribute into 0
- Use basespeed for base movement speed (ignores conditions set in HL)
- Decode defensive and "other" special abilities, using pf-universal-monster-rules compendium
- Rework how spellbooks are created
- Decode damage reduction, resistances and immunities
- Decode additional languages

## 1.25

Improvements to PF1 Actor decoding:

- Update decoding of Senses to use new PF1 Actor format.
- When looking for Items to add to a PF1 actor, prefer to take Items from the "Pathfinder 1e Content" and "Pathfinder 1e Archetypes and Abilities" modules.

## 1.24

If it isn't possible to place the Import button at the top of the Compendium panel, then try to put it at the bottom.

## 1.23

Fix error reported when decoding actors.
Fix an error in decoding Skills for CoC7.
Improvements in PF1 actor generation:

- natural armor bonus of items is removed from the base naturalAC of the actor read from the portfolio file

## 1.22.1

Ensure that the Realm Works Importer button is displayed at the bottom of the Compendium tab if it is not possible to display it at the top of the compendium tab
(this will get the button visible in games based on the 3.5 SRD game system).

## 1.22

Improvements in PF1 actor generation for stuff in the "Pathfinder 1e content" module:

- PF-Traits and PF-Racial-Traits are now processed for Traits.
- PF-Feats are now also checked for Feats.
- PF-Magic Items are now processed properly again for magic items.
- "Spells Memorized" will be added if there are no "Spells Known" in the Portfolio file.
- Try to support trait names in the "Pathfinder 1e content" where the trait name has the book source appended to it.
- Remove racial attribute bonuses from base attribute values (if race is found in a compendium).
- KNOWN BUG: weapons and armour with special qualities are not detected (they are listed in the "Miscellaneous" section of the Inventory).
- KNOWN BUG: Natural Armor AC is always copied into the "Natural Armor AC" of the Combat tab, even if it comes from a magic item.

## 1.21

Ensure description is set properly when creating Items.

Add image to Items if available in the realm works input file.

Table ranges which end with just zeros (like 56-00) will have the upper limit calculated as it is is preceded with a 1, (e.g. 56-100).

## 1.20

Add an option to convert all images to WEBP format (from gif, png, jpg, jpeg, bmp, tif, tiff)

## 1.19

Separate out the non-core functionality into 3 stand-alone modules:

- gmtext-in-notes
- disguise-unreachable-links
- revealed-notes-manager

## 1.18

Update Note Config window to provide multi-line text entry areas for Note Label and GM Notes.

Update Note Config window to allow revealed state of scene Notes to be changed.

Add two new icon types (Boxed Circle and Crossed Eye) to the list of available icons for scene Notes (since these are used to identify imported map pins).

Add module options to set the icon tint colours to be used when displaying notes to players to indicate if they are linked to an accessible journal entry.

## 1.17.1

Remove a debug line that was being put into the console as a warning.

## 1.17

Change the presentation of annotations for relationships since they can be multi-line (whereas annotations on other snippets are single line only). The annotation of
a relationship now appears in emphasis (italics) immediately below the relationship details (still part of the same bullet).

Add a soft (optional) dependency on libWrapper, just in case any other modules want to interact with notes and/or journal links.

Only enable the relevant notes/links/gmtext sub-modules depending on whether logged in as GM or player.

Revealed map pins will always have the scene Notes be displayed to players even if the linked journal entry is not visible to the player.
If the linked journal entry is NOT visible to the user then the Note will be displayed to the non-GM player as if it was a not-connected note.
The tint colour of the icon will be set correctly based on whether or not the player can see the linked journal entry.

For users hosting on Forge, additional metadata has been added to the module information.

Use correct constants for token disposition.

## 1.16

Updates for scene Notes:

- The title of a map pin is now displayed within ">> title <<" instead of the previous "\*\*title\*\*".
- The text is broken across multiple lines (default max line length set to 60 in module settings) - this does not affect the note title/linked journal name.
- Multiple occurrences of "&#xd;" in the map pin descriptions are replaced by just a newline.
- The "GMDIR:" indicator has been put on it's own line with down arrows to indicate which text is the GM directions.
- The font size is now configurable in the module settings.
- The display of GM notes has been changed so that less of the core foundry code has been copied into this module.

## 1.15.1

Update compatibleCoreVersion to "9" to remove warning when installing on V9 Prototype 2.

Simplify the check to detect when running on V9.

Further improvements to the README.

Hiding of unreachable links now shows the link if the linked item has **LIMITED** permission, rather than requiring OBSERVER permission.

Move "Revealed Notes" and "Hide Unreachable Links" into separate files, since they could become separate modules in the future.

## 1.15

The first Picture (not smart image) in a topic is added as the image of the created journal entry.

Make one change so that it will work in Foundry VTT V9 prototype 2 (whilst still working in 0.8.9).

## 1.14.1

Add additional warning when a GM Directions is not explicitly marked as secret, the warning "These 'GM Directions' have had 'secret' removed, and so might be visible to players" will appear in the GM view.

The warning can be removed by first changing the paragraph back to normal by deselecting "GM Directions (not secret)", and then selecting the style "GM Directions (secret)".

When importing, GM Directions are always marked secret, even if an enclosing block is also marked secret. (This is necessary in order to get the warning to work properly.)

## 1.14

Separate out the Player visible styles and the GM-only styles in the Text Editor.

Fix issue where you needed to add "GM Directions" and secret separately, and they were not getting merged into a single section.
Updated README.md with better information about the new styles.

## 1.13

Show the RW styles in the (TinyMCE) text editor.

## 1.12

Remove occurrences of secret sections having double the darkness applied to its background.

Fix an issue where section headings were set/not set with 'secret' which did not match that state of its contents.

Put *GM Directions & Contents* above *GM Directions* in the text editor menu, and remove *Block:* from those entry names.

Further reduce the amount of HTML generated for each journal entry (faster world loading!)

Ensure new text block names are less likely to conflict with other modules (internal to the code).

Add a new configuration **Use 'secret' in Unrevealed Topics**, which when ticked will do the normal topic generation, but if unticked then topics which are NOT revealed in RW will NOT have any secret sections in their corresponding Journal Entries. This is so that the journal entry doesn't end up with large portions of it using the secret (darker) background.

Add information about new editor blocks in README.md

Improve format of CHANGELOG.md

## 1.11.1

Add additional CSS to allow the GM-only formatting to be seen in **Monk's Enhanced Journal**.

## 1.11

Go back to minimal HTML. Remove most of the CSS styling (Revealed text displays as standard Foundry VTT, Not revealed snippets get marked as "secret")

Add Veracity (*Lie*, *Partial-Truth*) and Style (*Callout*, *Handout*, *Flavor*, *Read-Aloud*) block styles to the text editor.

Add *GM Directions* and *GM Directions & Contents* block styles for manual addition of GM directions (see #README.md)

Add a picture to the README.md file to show the formatted text.

## 1.10

Don't include GM Directions in Notes that are displayed to players.

Account for snippet annotations that might have links in them.

Veracity (Truth) of snippets is displayed to GMs (dashed border for Partial Truth, solid border for Lie)

## 1.9

Only revealed map pins will be visible to players in scenes. For GMs, not-revealed pins will be displayed with a "blind" icon.

Don't display links in journals if the linked item is not observable by the player (just display the non-link text).

Only display the "Realm Works Import" button for GMs.

## 1.8.1

Fix bug that stopped Actors being created from HL Portfolios

## 1.8

No longer requires "GM Notes" module for handling revealed topics.

Revealed snippets are identified to the GM in displayed documents by a green bar on the left side.

Revealed smart images can have their corresponding scene automatically made navigable (and their vision/fog disabled).

For GMs, Relationships, Content Links and Governed Content will show REVEALED parts separately from the full list.

Lots of CSS have been added to more closely match the Snippet Style in RW.

Created Scenes, Actors and Tables are only made OBSERVABLE to players if the topic AND the snippet are both revealed.

Snippets with both GM notes and non-GM notes will be grouped together in a box for GMs (in a similar presentation to RW).

**KNOWN BUGS:**

- Revealed state of map pins is ignored - only pins connected to non-revealed topics will be hidden on each scene.
- All links are displayed in revealed snippets of revealed topics - even if the linked document is not revealed.

## 1.7

Content Links in revealed topics should now only show links to REVEALED snippets/map_pins.

Provide initial parsing of relevant topics to Items rather than Journal - only for PF1 at the moment.

## 1.6

Provide module configuration options to specify scene padding and scene grid size.

## 1.5

Use the "GM Notes" module to properly support handling Revealed information.

The normal journal entry is the player visible version of a revealed topic, and the GM Notes is the FULL topic.

If a topic is NOT revealed to players, then the journal entry will contain the FULL topic.

## 1.4

Custom section names should now be decoded properly.

bold and italic text now encoded as strong and em text (to match how Foundry VTT does it).

Add option to include numbering on section headers, emulating the numbering in Realm Works.

Connections and Content Links now use same topic name format as in Realm Works "topicname ( suffix - prefix )", rather than the format used in topic titles and governed content "prefix - topicname (suffix)".

Add option to handle REVEALED state of things. If a topic is revealed, then its contents will be only the snippets that are revealed, and actors/tables/playlists will only be created from that topic if
the containing snippets are revealed, and the topic will have its permissions set for players to be OBSERVERS. For topics which are not revealed, the full contents will be created (and the observer will NOT be set).

## 1.3.1

Some relationships were not being decoded properly.

## 1.3

Two new processing options:

- "Only import NEW topics" - any already-imported topics will remain untouched.
- "Overwrite previously imported things" - replace the contents of Journal Entries, Scenes, Playlists and Rolltables with the new information, but keeping the same IDs (so all manual links within Foundry will remain valid).

Unfortunately, Actors will be recreated by deleting the old Actor and creating a new one (since there's no simple way to do a full actor edit).

Any changes made locally within Foundry VTT will be lost.

Note that this option will NOT delete anything that was previously created but no longer exists in the import file. (maybe a future evolution).

d% should be recognised as a valid dice formula when creating RollTables (it will be replaced with d100).

## 1.2

Improve the Connections section of created journal entries:

- a better format for the text
- entries are sorted alphabetically based on the expanded title of the link.

## 1.1.1

RollTable names should be based on topic titles, not title+aliases

Remove old code that supports RWoutput files.

Fix naming of map pins (explicit name, other name of linked topic, otherwise 'Unnamed')

## 1.1.0

Improve warning message when link is to a topic not found in the rwexport file.

Governed Content and Content Links sections are sorted into correct alphabetical order (handling numbers correctly).

## 1.0.1

Fix an issue where links were misaligned inside/after tables within a snippet.

## 1.0.0

**IMPORTANT**: Changed to read RWEXPORT files instead of rwoutput files

This will ensure that links are always created correctly.

Display "Category: name" at the top of each journal entry.

Date fields will look different due to the way that they are represented in rwexport files.

In the list of aliases of a topic/Journal Entry, "True Name"'s will be identified.

## 0.9.1

Ensure that topic linking works to topics with an ampersand in the name.

## 0.9.0

Attempt to convert HTML tables into RollTables.

The first row of the table is assumed to be titles, and will not be added to the RollTable.

The first column of the table must contain the rolled number(s), either as a single number, two numbers separated by a dash, or two numbers separated by a comma.

The second column of the table is used to populate the RollTable (although if the second column contains all blank entries then the third column will be used instead).

If the title of the first column is a valid dice roll syntax then it will be used as the formula for the table, otherwise the formula will be calculated by examining the lowest and highest numbers in the table and creating a single dice roll with a fixed addition.

A link to the RollTable is added to the end of the converted section within the corresponding Journal Entry.

Links and formatting within the result details will be retained.

Dice formulae within the result details will be marked with "[[x]]" to in-line roll them when that result is reported in the chat window.

BUG FIX for Actors not being created from Statblock snippets.

## 0.8.1

Fix a problem with governing/governed content not including topic with & in their title.

Internal fix to use get/set with entity_for_topic since it is a map.

## 0.8.0

Convert GIF images to PNG images, since GIF aren't supported for scene backgrounds.

Governed Content and Governing Content will now use the FULL name of the topics (prefix + name + suffix).

Create thumbnail for scene AFTER adding all the notes, so that the notes are correctly written to scenes.db.

## 0.7.0

Decode Actors for Call of Cthulhu (7th Edition) (foundry system "CoC7")

## 0.6.1

PF1 Actor decoding now adds special attacks and other non-weapon attacks to the Combat tab; and set Natural AC properly.

## 0.6.0

PF1 Actor decoding now populates the Combat tab with entries for all weapons in your inventory; including masterwork + magical weapons with just an enhancement bonus.

## 0.5.5

Don't include aliases when creating link to Parent topic, governed content, or in the name of scenes.

When creating folders, set them to manual sorting by default (to keep the order from the realm)

## 0.5.4

Speed up scene generation by creating all Notes on the map in a single call to scene.createEmbeddedDocuments.

## 0.5.2

Ensure that ALL portfolios + statblocks in a topic are converted into Actors (instead of just the first one).

Prevent error when filename is missing for a portfolio or statblock.

Improve error logging to the console, particularly during actor creation.

Do NOT create actors in a topic when the actors are actually stored in a child topic (they are created for the child topic only).

The name of Actors created from Statblocks will now use the name from the snippet, and appended with the annotation if present (preceded by ":").

Fix an issue with processing a .por directly would fail if a character in the file had minions.

## 0.5.1

Fix a bug where snippets in a topic section with sub-sections, the snippets would appear after the subsections, and look like they were part of the last subsection.

## 0.5.0

Add decoding of Savage Worlds (not Adventure Edition) from HL portfolio files for use in the SWADE game system.

## 0.4.1

Fix a bug where it was required to have DND5E installed in order for the module to load for ANY game systems.

## 0.4.0

Add decoding of D&D 5E characters from HeroLab portfolio files.

Remove support for 0.7.x versions of Foundry.

## 0.3.22

Use DirectoryPicker from dnd-importer to allow asset files to be stored in S3 storage instead of only in the 'data' area.

## 0.3.21

Provide a configuration setting to specify the maximum depth of content to display in the Governed Content section of journal entries.

## 0.3.20

The "Governed Content" will now contain the full hierarchy of descendents rather than only the direct children.

Provide link from Scene Notes journal entry back to the Scene.

## 0.3.19

Add module configuration setting to set the preferred Actor type when generating Actors from statblocks.

When decoding PF1 Actors, check for presence of "challengerating" element to choose 'npc' Actor type instead of 'character'.

Better fix for HP calculation of PF1 Actors for Actors with multiple types of hit dice.

Create link at start of each Journal Entry to the parent topic. The label for this link is a configurable parameter.

## 0.3.18

Put HTML in correct place for worlds using the Cypher system (cyphersystem).

When importing a Hero Lab .por file, store just the HTML if the tool doesn't support full Actor creation.

## 0.3.17

Faster handling of import of data of lots of Actors for different game systems.

Improve PF1 actor creation, especially regarding HP calculation.

## 0.3.16

Attempt to create Actors regardless of the game system, putting the stat block in the Notes, Biography, or similar named section of the character sheet:

- pf1 - Formatted statblock put into Notes, and also attempts to populate other fields.
- pf2e - Formatted statblock put into Private Notes.
- dnd5e - Formatted statblock put into Biography.
- swade - Formatted statblock put into About/Biography.
- CoC7  - raw HTML of statblock put into biography/Personal Description.
- grpga - raw HTML of statblock put into Main/Notes.
- alienrpg - Formatted statblock put into Description.
- wfrp4e - HTML put into Details/GMNotes.
- pbta - generates an error when creating Actors (system-specific issue), so no Actors will be created.
- anything else - attempt to put into details/biography and biography/personalDescription.

## 0.3.15

Update README.md with extra information about Actors being placed into sub-folders.

## 0.3.14

Actors are now put into a sub-folder named after the containing topic (but if there is only one actor in the topic with the same name as the topic, then no sub-folder is created).

The UZIP module is reverted back to its original code (removing export).

## 0.3.13

Convert .bmp .tif and .tiff images to .png before uploading.

Ensure journal folders are created in the correct parent.

## 0.3.12

Get it working on Foundry 0.7.x

## 0.3.11

Update ChangeLog and compatibleCoreVersion to 0.8.8

## 0.3.10

Fix the default location for uploaded asset files (worlds, not world)

## 0.3.9

Fix link detection, some spans for links contain class="RWSnippet" rather than just being a plain span.

## 0.3.8

Core: Remove use of compendiums. Add saving of entered settings. Reduce amount of unnecessary code.

Always expect a top-level folder name to be present.

Hopefully speed up processing time.

Add one entry in "module settings" window of Foundry to support configuring the upload folder for assets (pictures, videos, sounds, etc.).

## 0.3.7

README.md and FUNDING.yml updated with Ko-Fi link.

Move XML-to-Object function to main module, and pass decoded Object to the game-system specific Actor generator.

PF1: Improve generation of Class Features based on the level of the class; add generation of traits.

## 0.3.6

Audio snippets are placed into Playlists. One playlist per topic with each Audio snippet as a separate sound within the playlist.

## 0.3.5

Hopefully faster processing of RW files.

PF1 HL decoding has better feat detection, correct number of monster levels, and Skill Focus feat modifies the relevant skill.

## 0.3.4

HL portfolio can be read directly, to import your PF1 characters as Actors. HL portfolios have their minions processed properly.

## 0.3.3

For PF1 actors, include weapons/armor/ammo/shield items, and improve logic for matching names of other items.

Some attempts at speeding up the code a little.

Decode embedded HL portfolios correctly in the case where a character has minions.

## 0.3.2

Get Actors and Scenes working on 0.8.6 to the same level as on 0.7.10 (item quantities not working)

## 0.3.1

Fixed wrong compatibleCoreVersion in module.json

## 0.3.0

Prevent it generating errors in 0.8.6 (but disable some functionality in order to achieve this)

## 0.2.6

Further improvements to presentation of snippet styles and GM-Directions

## 0.2.5

RW terminology used in standard section headings:

- "Child Topics" changed to "Governed Content";
- "Connections" changed to "Relationships";
- "Links To/From Other Topics" changed to "Content Links: In/Out".

Format of relationships changed slightly, and includes any entered annotations.

README.md file updated with current information.

GM-Directions in topics converted to "secret" sections in journal entries.

Snippet styles change the background colour as per RW.

## 0.2.4

Create an Actor for EACH character in a HL portfolio file, not just the first one.

For PF1 characters, create sub-skills (e.g. Artistry, Perform, Profession).

Include prefix and suffix (if any) from the RW topic in title of journal entries.

Create thumbnails for each scene.

Map pins now include GM-Notes if present, and always includes the pin name.

## 0.2.3

Support files bigger than 512 MB (but Firefox might not like them)

## 0.2.2

Extract images from embedded Hero Lab Portfolio files for use as the image for the Actor.

## 0.2.1

Only allow loading from a file (no cut/paste any more). Add generation of topic aliases and connection.

Scenes are now created with map pins which are connected to the appropriate journal entries. Because map pins can't link to compendium entries, all journal entries are created in the world.

Create Actors for PF1 and DND5E based on HeroLab portfolio entries; only some fields are decoded.

Journal Entries are grouped under sub-headings of the Category of each of topic.

## 0.1.3

Initial support for annotations on various fields. Improve layout of tag snippets. Attempt to remove 'null' field titles.

## 0.1.2

Fix a problem with UZIP.js not working on Firefox. Add a better error message if the file fails to get loaded (e.g. > 512 MB)

## 0.1.1

Add option to read contents directly from a file, and add better error checking.

## 0.0.16

Add linkage information at the bottom of each JournalEntry, indicating inbound and/or outbound links, as selected in the import window.

## 0.0.15

Add registered trademark symbol when mentioning Realm Works. Extract stat blocks from embedded Hero Lab Portfolio files.

## 0.0.14

Significant speed-up by using the JournalEntry.create promise correctly.

## 0.0.13

Code tidyup for faster processing; fix linking topic to itself.

## 0.0.12

Convert .html assets into inline text. This means that StatBlock snippets will show their information inline.

## 0.0.11

Get aliases to link properly between topics (and add Patreon information to README)

## 0.0.10

Update README.md with installation link and Changelog information

## 0.0.9

Links will now be correctly created if there is a mismatch in case between the link and the target.

## 0.0.8

Add writeContents to contain first pass at converting links: only exact case and string will link correctly.

## 0.0.7

Update the UI to reflect the actual fields which are relevant to the task.

## 0.0.6

Add MIT LICENSE file and fill in README.md file

## 0.0.5

First version to support the automatic module.zip creation properly on github
