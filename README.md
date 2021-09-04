# Realm-Works-Import
A module to import information from a user's RWoutput from the Realm Works® campaign management tool created by LWD, available from https://www.wolflair.com/realmworks/

You can install the module by updating your module list with the following additional URL: https://github.com/farling42/fvtt-import-realmworks/releases/latest/download/module.json

## Instructions
Simply add this module to your Foundry VTT and enable it within the game into which you want to import your RWoutput information.

In the Compendium panel of the game you will find a new button near the top called "Realm Works Import".

Press the button to open a simple dialogue window.

Select an .rwoutput file (or Hero Lab portfolio file) using the file selector.

Enter the name of the folder into which all extracted entries will be placed.

Maybe modify which options you want to work with.

Press the IMPORT button at the bottom of the window and wait for the contents to be imported.

New folders will be created in the Scenes, Actors, Journal and Playlist sections containing the imported data.

Each *Smart_Image* is converted into a scene, with map pins and scene notes connected to the relevant journal entries.

Each *Topic* will be converted into a separate Journal Entry, placed in a sub-folder based on the Category of the topic.

Each *image or embedded file* will be extracted and located in the subdirectory \[data]world/<world-name/realmworksimport  (this default location can be changed in the module settings).

Each *Audio* snippet will be extracted and placed into a Playlist named after the topic.

Each *HL portfolio* will be extracted and Actors created for each character in the portfolio (currently only for PF1, D&D 5E and SWADE game systems). All actors for a single topic are placed into a sub-folder named after the folder.

Any parent topic in the RWoutput file will have a list of descendents at the end of the page which contains links to the descendent topics (the maximum depth of the descendents can be configured in the module settings).

## Libraries
This module uses the following libraries from other sources:
- UZIP for decoding HL portfolio files (MIT/GPLv3 license, from https://stuk.github.io/jszip/)
- JIMP for converting TIF and BMP images to PNG (MIT license, from https://github.com/oliver-moran/jimp)
- DirectoryPicker to allow assset files to be stored in S3 rather than just the local 'user data' area (MIT license, from https://github.com/MrPrimate/ddb-importer)

## Support
If you like what it does, then all contributions will be gratefully received at [Kofi](https://ko-fi.com/farling) or [Paypal](https://paypal.me/farling)
or if you're feeling really generous you could set up a regular contribution at [Patreon](https://www.patreon.com/amusingtime) 