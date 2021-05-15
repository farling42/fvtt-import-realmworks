# Realm-Works-Import
A module to create a compendium pack from a user's RWoutput from the Realm Works campaign management tool created by LWD.

You can install the module by updating your module list with the following additional URL: https://github.com/farling42/fvtt-import-realmworks/releases/latest/download/module.json

## Instructions
Simply add this module to your Foundry VTT and enable it within the game into which you want to import your RWoutput information.

In the Compendium panel of the game you will find a new button at the bottom.

Press the button to open a simple dialogue window.

Open up the RWoutput file in your favourite text editor and copy and paste the text contents into the box in the Foundry window.

Wait, possibly a long time, for the paste into the window to complete.

Press the IMPORT button at the bottom of the window and wait for the contents to be imported.

A new compendium pack with the supplied name will be created, and it will contain one journal entry for each topic that was present in the RWoutput file.

Any parent topic in the RWoutput file will have a list of children at the end of the page which contains links to the child topics.

## Patreon
If you like what it does, then contributions can be made at [Patreon](https://www.patreon.com/amusingtime)

## Changelog
0.0.11 Get aliases to link properly between topics (and add Patreon information to README)

0.0.10 Update README.md with installation link and Changelog information

0.0.9 Links will now be correctly created if there is a mismatch in case between the link and the target.

0.0.8 Add writeContents to contain first pass at converting links: only exact case and string will link correctly.

0.0.7 Update the UI to reflect the actual fields which are relevant to the task.

0.0.6 Add MIT LICENSE file and fill in README.md file

0.0.5 First version to support the automatic module.zip creation properly on github