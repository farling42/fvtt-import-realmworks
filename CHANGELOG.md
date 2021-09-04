0.6.1 PF1 Actor decoding now adds special attacks and other non-weapon attacks to the Combat tab; and set Natural AC properly.

0.6.0 PF1 Actor decoding now populates the Combat tab with entries for all weapons in your inventory; including masterwork + magical weapons with just an enhancement bonus.

0.5.5 Don't include aliases when creating link to Parent topic, governed content, or in the name of scenes.
When creating folders, set them to manual sorting by default (to keep the order from the realm)

0.5.4 Speed up scene generation by creating all Notes on the map in a single call to scene.createEmbeddedDocuments.

0.5.2 Ensure that ALL portfolios + statblocks in a topic are converted into Actors (instead of just the first one).
Prevent error when filename is missing for a portfolio or statblock.
Improve error logging to the console, particularly during actor creation.
Do NOT create actors in a topic when the actors are actually stored in a child topic (they are created for the child topic only).
The name of Actors created from Statblocks will now use the name from the snippet, and appended with the annotation if present (preceded by ":").
Fix an issue with processing a .por directly would fail if a character in the file had minions.

0.5.1 Fix a bug where snippets in a topic section with sub-sections, the snippets would appear after the subsections, and look like they were part of the last subsection.

0.5.0 Add decoding of Savage Worlds (not Adventure Edition) from HL portfolio files for use in the SWADE game system.

0.4.1 Fix a bug where it was required to have DND5E installed in order for the module to load for ANY game systems.

0.4.0 Add decoding of D&D 5E characters from HeroLab portfolio files.
Remove support for 0.7.x versions of Foundry.

0.3.22 Use DirectoryPicker from dnd-importer to allow asset files to be stored in S3 storage instead of only in the 'data' area.

0.3.21 Provide a configuration setting to specify the maximum depth of content to display in the Governed Content section of journal entries.

0.3.20 The "Governed Content" will now contain the full hierarchy of descendents rather than only the direct children.
Provide link from Scene Notes journal entry back to the Scene.

0.3.19 Add module configuration setting to set the preferred Actor type when generating Actors from statblocks.
When decoding PF1 Actors, check for presence of "challengerating" element to choose 'npc' Actor type instead of 'character'.
Better fix for HP calculation of PF1 Actors for Actors with multiple types of hit dice.
Create link at start of each Journal Entry to the parent topic. The label for this link is a configurable parameter.

0.3.18 Put HTML in correct place for worlds using the Cypher system (cyphersystem).
When importing a Hero Lab .por file, store just the HTML if the tool doesn't support full Actor creation.

0.3.17 Faster handling of import of data of lots of Actors for different game systems.
Improve PF1 actor creation, especially regarding HP calculation.

0.3.16 Attempt to create Actors regardless of the game system, putting the stat block in the Notes, Biography, or similar named section of the character sheet:
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

0.3.15 Update README.md with extra information about Actors being placed into sub-folders.

0.3.14 Actors are now put into a sub-folder named after the containing topic (but if there is only one actor in the topic with the same name as the topic, then no sub-folder is created).
The UZIP module is reverted back to its original code (removing export).

0.3.13 Convert .bmp .tif and .tiff images to .png before uploading.
Ensure journal folders are created in the correct parent.

0.3.12 Get it working on Foundry 0.7.x

0.3.11 Update ChangeLog and compatibleCoreVersion to 0.8.8

0.3.10 Fix the default location for uploaded asset files (worlds, not world)

0.3.9 Fix link detection, some spans for links contain class="RWSnippet" rather than just being a plain span.

0.3.8 Core: Remove use of compendiums. Add saving of entered settings. Reduce amount of unnecessary code.
Always expect a top-level folder name to be present.
Hopefully speed up processing time.
Add one entry in "module settings" window of Foundry to support configuring the upload folder for assets (pictures, videos, sounds, etc.).

0.3.7 README.md and FUNDING.yml updated with Ko-Fi link.
Move XML-to-Object function to main module, and pass decoded Object to the game-system specific Actor generator.
PF1: Improve generation of Class Features based on the level of the class; add generation of traits.


0.3.6 Audio snippets are placed into Playlists. One playlist per topic with each Audio snippet as a separate sound within the playlist.

0.3.5 Hopefully faster processing of RW files. PF1 HL decoding has better feat detection, 
correct number of monster levels, and Skill Focus feat modifies the relevant skill.

0.3.4 HL portfolio can be read directly, to import your PF1 characters as Actors. HL portfolios have their minions processed properly.

0.3.3 For PF1 actors, include weapons/armor/ammo/shield items, and improve logic for matching names of other items.
Some attempts at speeding up the code a little.
Decode embedded HL portfolios correctly in the case where a character has minions.

0.3.2 Get Actors and Scenes working on 0.8.6 to the same level as on 0.7.10 (item quantities not working)

0.3.1 Fixed wrong compatibleCoreVersion in module.json

0.3.0 Prevent it generating errors in 0.8.6 (but disable some functionality in order to achieve this)

0.2.6 Further improvements to presentation of snippet styles and GM-Directions

0.2.5 RW terminology used in standard section headings:
"Child Topics" changed to "Governed Content";
"Connections" changed to "Relationships";
"Links To/From Other Topics" changed to "Content Links: In/Out".
Format of relationships changed slightly, and includes any entered annotations.
README.md file updated with current information.
GM-Directions in topics converted to "secret" sections in journal entries.
Snippet styles change the background colour as per RW.

0.2.4 Create an Actor for EACH character in a HL portfolio file, not just the first one.
For PF1 characters, create sub-skills (e.g. Artistry, Perform, Profession).
Include prefix and suffix (if any) from the RW topic in title of journal entries.
Create thumbnails for each scene.
Map pins now include GM-Notes if present, and always includes the pin name.

0.2.3 Support files bigger than 512 MB (but Firefox might not like them)

0.2.2 Extract images from embedded Hero Lab Portfolio files for use as the image for the Actor.

0.2.1 Only allow loading from a file (no cut/paste any more). Add generation of topic aliases and connection.
Scenes are now created with map pins which are connected to the appropriate journal entries. Because map pins can't link to compendium entries, all journal entries are created in the world.
Create Actors for PF1 and DND5E based on HeroLab portfolio entries; only some fields are decoded.
Journal Entries are grouped under sub-headings of the Category of each of topic.

0.1.3 Initial support for annotations on various fields. Improve layout of tag snippets. Attempt to remove 'null' field titles.

0.1.2 Fix a problem with UZIP.js not working on Firefox. Add a better error message if the file fails to get loaded (e.g. > 512 MB)

0.1.1 Add option to read contents directly from a file, and add better error checking.

0.0.16 Add linkage information at the bottom of each JournalEntry, indicating inbound and/or outbound links, as selected in the import window.

0.0.15 Add registered trademark symbol when mentioning Realm Works. Extract stat blocks from embedded Hero Lab Portfolio files.

0.0.14 Significant speed-up by using the JournalEntry.create promise correctly.

0.0.13 Code tidyup for faster processing; fix linking topic to itself.

0.0.12 Convert .html assets into inline text. This means that StatBlock snippets will show their information inline.

0.0.11 Get aliases to link properly between topics (and add Patreon information to README)

0.0.10 Update README.md with installation link and Changelog information

0.0.9 Links will now be correctly created if there is a mismatch in case between the link and the target.

0.0.8 Add writeContents to contain first pass at converting links: only exact case and string will link correctly.

0.0.7 Update the UI to reflect the actual fields which are relevant to the task.

0.0.6 Add MIT LICENSE file and fill in README.md file

0.0.5 First version to support the automatic module.zip creation properly on github