# Realm-Works-Import
A module to create a compendium pack from a user's RWoutput from the Realm Works® campaign management tool created by LWD, available from https://www.wolflair.com/realmworks/

You can install the module by updating your module list with the following additional URL: https://github.com/farling42/fvtt-import-realmworks/releases/latest/download/module.json

## Instructions
Simply add this module to your Foundry VTT and enable it within the game into which you want to import your RWoutput information.

In the Compendium panel of the game you will find a new button at the bottom called "Realm Works Import".

Press the button to open a simple dialogue window.

Select an .rwoutput file using the file selector.

Enter the name of the folder into which all extracted entries will be placed.

Maybe modify which options you want to work with.

Press the IMPORT button at the bottom of the window and wait for the contents to be imported.

New folders will be created in the Scenes, Actors and Journal sections containing the imported data.


Each *Smart_Image* is converted into a scene, with map pins and connected to the originating topic for scene notes.

Each *Topic* will be converted into a separate Journal Entry, placed in a sub-folder based on the Category of the topic.

Each *image or embedded file* will be extracted and located in the subdirectory \[data]world/<world-name/realmworksimport

Each *HL portfolio* will be extracted and Actors created for each character in the portfolio (currently only for PF1 game system).

Any parent topic in the RWoutput file will have a list of children at the end of the page which contains links to the child topics.

## Patreon
If you like what it does, then contributions will be gratefully received at [Patreon](https://www.patreon.com/amusingtime)

## Changelog
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