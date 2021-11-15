# Realm-Works-Import
A module to import information from a user's RWoutput from the Realm Works® campaign management tool created by LWD, available from https://www.wolflair.com/realmworks/

You can install the module by updating your module list with the following additional URL: https://github.com/farling42/fvtt-import-realmworks/releases/latest/download/module.json

IMPORTANT : 1.0.0 changes to use RWEXPORT files instead of rwoutput files.

## Instructions
Simply add this module to your Foundry VTT and enable it within the game into which you want to import your RWexport information.

In the Compendium panel of the game you will find a new button near the top called "Realm Works Import".

Press the button to open a simple dialogue window.

Select an .rwexport file (or Hero Lab portfolio file) using the file selector.

Enter the name of the folder into which all extracted entries will be placed.

Maybe modify which options you want to work with.

Press the IMPORT button at the bottom of the window and wait for the contents to be imported.

## Then This Will Happen

New folders will be created in the Scenes, Actors, Journal, Roll Tables and Playlist sections containing the imported data.

Each *Smart_Image* is converted into a scene, with map pins and scene notes connected to the relevant journal entries.

Each *Topic* will be converted into a separate Journal Entry, placed in a sub-folder based on the Category of the topic.

Each *image or embedded file* will be extracted and located in the subdirectory \[data]world/<world-name/realmworksimport  (this default location can be changed in the module settings).

Each *Audio* snippet will be extracted and placed into a Playlist named after the topic.

Each *HL portfolio* will be extracted and Actors created for each character in the portfolio (currently only for PF1, D&D 5E, SWADE, Call of Cthulhu game systems). All actors for a single topic are placed into a sub-folder named after the folder.

Each *Table* within RW topics will be examined to see if it can be used to create a Roll-Table within Foundry. The first row of the table is assumed to be the title (if the top-left cell of the table contains a dice formula, e.g. 1d20, then it will be used as the formula for the roll table.  The first column of the table is assumed to be the number or numbers to choose the results (either a single number, or two numbers separate by "-" for a range or "," for two discrete entries). The second column will be used as the results for the roll-table (or the third column if all entries in the second column are blank).

Any parent topic in the RWoutput file will have a list of governed content at the end of the page which contains links to the descendent topics (the maximum depth of the descendents can be configured in the module settings); and child topics will have a "governing content" added at the top of the journal entry.

## Additional Presentation

The *Text Editor* has some additional options under the "RW Players" and "RW GM Only".

The "RW Players" allows the Realm Works Style presentation to be set on paragraphs  which allow paragraphs to be displayed in the Veracity and/or Style (Callout, Handout, Flavor, Read-Aloud).

The "RW GM Only" provides Veracity (Partial Truth/Lie) and GM directions whose visual presentation is only shown to GMs.

There are also three new blocks for "GM Directions":
- "GM Directions & Contents" - if wanted for better grouping of GM directions and the text to which it applies, then this must be applied to the relevant paragraphs before choosing the GM Directions.
- "GM Directions (secret)" - this should be applied to the paragraphs which are to be GM directions (it will automatically make those paragraphs "secret" in Foundry"). This can be used outside of the above, for stand-alone GM directions.
- "GM Directions" - this should not be used, but is present in case you switch off the "secret" separately in the editor.

![Text Editor](https://github.com/farling42/fvtt-import-realmworks/blob/master/screen-capture.png)

## Libraries
This module uses the following libraries from other sources:
- UZIP for decoding HL portfolio files (MIT/GPLv3 license, from https://stuk.github.io/jszip/)
- JIMP for converting TIF and BMP images to PNG (MIT license, from https://github.com/oliver-moran/jimp)
- DirectoryPicker to allow assset files to be stored in S3 rather than just the local 'user data' area (MIT license, from https://github.com/MrPrimate/ddb-importer)

## Support
The Realm Works campaign/world management tool is available from https://www.wolflair.com/realmworks/

Join in discussions about it's future features on the [LWD Forums](https://forums.wolflair.com/showthread.php?t=65924)

If you like what it does, then all contributions will be gratefully received at [Kofi](https://ko-fi.com/farling) or [Paypal](https://paypal.me/farling)
or if you're feeling really generous you could set up a regular contribution at [Patreon](https://www.patreon.com/amusingtime) 
