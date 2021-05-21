# Realm-Works-Import
A module to create a compendium pack from a user's RWoutput from the Realm Works® campaign management tool created by LWD, available from https://www.wolflair.com/realmworks/

You can install the module by updating your module list with the following additional URL: https://github.com/farling42/fvtt-import-realmworks/releases/latest/download/module.json

## Instructions
Simply add this module to your Foundry VTT and enable it within the game into which you want to import your RWoutput information.

In the Compendium panel of the game you will find a new button at the bottom.

Press the button to open a simple dialogue window.

Select an .rwoutput file using the file selector.

Enter the name of the compendium into which the journal entries will be placed (default: "Realm Works").

Maybe modify which options you want to work with.

Press the IMPORT button at the bottom of the window and wait for the contents to be imported.

A new compendium pack with the supplied name will be created, and it will contain one journal entry for each topic that was present in the RWoutput file.

Any parent topic in the RWoutput file will have a list of children at the end of the page which contains links to the child topics.

There is a file limit size of 512 MB for importing (due to a limitation on the maximum allowed size of a string in Javascript).

## Patreon
If you like what it does, then contributions will be gratefully received at [Patreon](https://www.patreon.com/amusingtime)

## Changelog
0.1.4 Improve layout of window (remove paste box). Add output of topic aliases, connections. Simplify code with ?. Correct title for extracted portfolio. Prefix for GM directions.
Initial creation of Actors for PF1 and DND5E (all information stored in biography/notes section of sheet).

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