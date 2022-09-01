// Realm Works RWexport file:
// (only relevant attributes are listed, especially ignoring the uuid attributes)
//
// output(1)  (attrs: format_version, game_system_id, export_date)
// +-- definition(1)
//     +-- details(1) (attrs: name, abbrev)
// +-- contents(1)
//     +-- topic(x)
//         +-- alias(x) (attrs: alias_id, name)
//         +-- section(x) (attrs: name)
//             +-- snippet (attrs: type)
//                 +-- contents (encoded HTML) [for type=="Multi_Line"]
//                 +-- game_date (attrs: canonical, gregorian, display) [for type=="Date_Game"]
//                 +-- date_range (attrs: canonical_start...) [for type=="Date_Range"]
//                 +-- link 
//         +-- tag_assign(x) (attrs: tag_name, domain_name)
//         +-- linkage(x) (attrs: target_id, target_name, direction[Inbound|Outbound|Both])

// Nested "section" elements increase the Hx number by one for the section heading.

import "./UZIP.js";
import "./jimp.js";
import { DirectoryPicker } from "./DirectoryPicker.js";

const GS_MODULE_NAME = "realm-works-import";

const GS_CREATE_INBOUND_LINKS = "createInboundLinks";
const GS_CREATE_OUTBOUND_LINKS = "createOutboundLinks";
const GS_FOLDER_NAME = "folderName";
const GS_DELETE_OLD_FOLDERS = "deleteOldFolders";
const GS_OVERWRITE_EXISTING = "overwriteExisting";
const GS_IMPORT_ONLY_NEW = "importOnlyNew";
const GS_ALL_IMAGES_WEBP = "allImagesWebp";
const GS_ASSETS_LOCATION = "assetsLocation";
const GS_ACTOR_TYPE = "actorType";
const GS_GOVERNING_CONTENT_LABEL = "governingContentLabel";
const GS_GOVERNED_MAX_DEPTH = "governingMaxDepth";
const GS_SECTION_NUMBERING = "sectionNumbering";
const GS_SCENE_PADDING = "scenePadding";
const GS_SCENE_GRID = "sceneGrid";
const GS_CREATE_ITEMS = "createItems";
const GS_SCENE_REVEALED_NAVIGATION = "sceneRevealedNavigation";
const GS_SCENE_TOKEN_VISION = "sceneTokenVision";
const GS_UNREVEALED_TOPICS_SECRET = "unrevealedTopicsSecret";
const GS_NOTE_LINE_LENGTH = "noteLineLength";
const GS_NOTE_TEXT_SIZE = "noteTextSize";

const GS_FLAGS_UUID = "uuid";

const PIN_ICON_REVEALED = 'icons/svg/circle.svg';
const PIN_ICON_NOT_REVEALED = 'icons/svg/blind.svg';

const RW_editor_player_options = {
	title: "RW Players",
	items : [
		{
			title: "Style: Callout",
			block: 'section',
			classes: 'RWCallout',
			wrapper: true
		},
		{
			title: "Style: Handout",
			block: 'section',
			classes: 'RWHandout',
			wrapper: true
		},
		{
			title: "Style: Flavor",
			block: 'section',
			classes: 'RWFlavor',
			wrapper: true
		},
		{
			title: "Style: Read Aloud",
			block: 'section',
			classes: 'RWRead_Aloud',
			wrapper: true
		},
	]
};
const RW_editor_gm_options = {
	title: "RW GM Only",
	items : [
		{
			title: "Veracity: Partial Truth",
			block: 'section',
			classes: 'RWveracity-Partial',
			wrapper: true
		},
		{
			title: "Veracity: Lie",
			block: 'section',
			classes: 'RWveracity-Lie',
			wrapper: true
		},
		{
			title: "GM Directions & Contents",
			block: 'section',
			classes: 'RWgmDirAndContents',
			wrapper: true,
			//exact:   true   /* Prevent removal of other nested sections */
		},	
		{
			title: "GM Directions (secret)",
			block: 'section',
			classes: 'RWgmDirections secret',
			wrapper: true
		},
		{
			title: "GM Directions (not secret)",
			block: 'section',
			classes: 'RWgmDirections',
			wrapper: true
		},
	]
};
const SUPPORTED_VIDEO_FORMATS = [ "webm", "mp4", "m4v" ];

//
// Register game settings
//
Hooks.once('init', () => {

	// 0.8.9 has game.system.entityTypes; 0.9 has game.system.documentTypes
	let dtypes = game.system.documentTypes || game.system.entityTypes;
	
	let actors = {};
	for (const label of dtypes.Actor) {
		actors[label] = label
	}
	let items = {}
	for (const label of dtypes.Item) {
		items[label] = label
	}
	
	// See API documentation "ClientSettings"
	game.settings.register(GS_MODULE_NAME, GS_ASSETS_LOCATION, {
		name: "Location of Extracted Assets",
		hint: "Folder within [User Data] area where assets (e.g. sounds, PDFs, videos) embedded in the RWexport file will be placed.",
		scope: "world",
		type:  DirectoryPicker.Directory,
		default: `[data] worlds/${game.world.id}/realmworksimport`,
		//filePicker: true,		// 0.8.x onwards, but doesn't let us read FilePicker#source so we can't put it in S3 if chosen
		config: true,
	});
	// Get the list of Actor choices Actor.types[] system/template.json
    game.settings.register(GS_MODULE_NAME, GS_ACTOR_TYPE, {
		name: "Default Actor Type",
		hint: "When a statblock is encountered in the RW/HL file, an Actor of this type will be created",
		scope: "world",
		type:  String,
		choices: actors,
		default: dtypes.Actor[0],
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_GOVERNING_CONTENT_LABEL, {
		name: "Governing Content Label",
		hint: "The label to appear to identify the link to a parent Journal Entry",
		scope: "world",
		type:  String,
		default: 'Governing Content: ',
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_GOVERNED_MAX_DEPTH, {
		name: "Max Depth for Governing Content",
		hint: "The maximum depth of ancestors to be displayed in a journal entry's governed content hierarchy (0 = do not include governed content",
		scope: "world",
		type:  Number,
		default: 99,
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_SECTION_NUMBERING, {
		name: "Number each section within Topics",
		hint: "Select this option if you want sections within imported journal entries to be numbered just like in Realm Works; if not selected then no number prefix will be added to section names",
		scope: "world",
		type:  Boolean,
		default: true,
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_CREATE_ITEMS, {
		name: "Create Items",
		hint: "Any topics built from specific categories will be converted into Items rather than Journal Entries",
		scope: "world",
		type:  Boolean,
		default: false,
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_UNREVEALED_TOPICS_SECRET, {
		name: "Use 'secret' in Unrevealed Topics",
		hint: "Select if topics which are NOT revealed should still have their not-revealed snippets displayed as 'secret'",
		scope: "world",
		type:  Boolean,
		default: true,
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_SCENE_REVEALED_NAVIGATION, {
		name: "Enable navigation on revealed scenes",
		hint: "Select this if revealed Scenes should have NAVIGATION automatically ticked (Configure Scene: Accessibility: Navigation)",
		scope: "world",
		type:  Boolean,
		default: false,
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_SCENE_TOKEN_VISION, {
		name: "Created scenes require Vision",
		hint: "This flag will be copied to the 'Token Vision' and 'Fog Exploration' for each created scene",
		scope: "world",
		type:  Boolean,
		default: false,
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_SCENE_PADDING, {
		name: "Default Scene Padding",
		hint: "The default value for the 'Padding Percentage' of created scenes",
		scope: "world",
		type:  Number,
		default: 0.25,
		range: {
			min: 0.0,
			max: 0.5,
			step: 0.05
		},
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_SCENE_GRID, {
		name: "Default Scene Grid size",
		hint: "The default grid size (pixels) for scenes",
		scope: "world",
		type:  Number,
		default: 100,
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_NOTE_LINE_LENGTH, {
		name: "Max line length for Notes",
		hint: "Any line defined for a smart image pin which is longer than this will be split across multiple lines (breaking on spaces)",
		scope: "world",
		type:  Number,
		default: 60,
		config: true,
	});
    game.settings.register(GS_MODULE_NAME, GS_NOTE_TEXT_SIZE, {
		name: "Font Size for scene Notes",
		hint: "The font size to use for scene Notes",
		scope: "world",
		type:  Number,
		default: 24,
		config: true,
	});
/*	
	JavaScript doesn't allow us to access the PATH of a File object,
	so we can't save the full path to the RWexport file for next use.
	game.settings.register(GS_MODULE_NAME, "sourceFile", {
		name: "The RWexport file to be processed",
		hint: "The RWexport file generated by Realm Works to be imported",
		scope: "world",
		type:  File,
		default: '',
		config: false,
	});*/
    game.settings.register(GS_MODULE_NAME, GS_CREATE_INBOUND_LINKS, {
		name: "Create Inbound Links",
		hint: "Creates a section at the bottom of each journal entry indicating inbound links from other journal entries",
		scope: "world",
		type:  Boolean,
		default: true,
		config: false,
	});
    game.settings.register(GS_MODULE_NAME, GS_CREATE_OUTBOUND_LINKS, {
		name: "Create Outbound Links",
		hint: "Creates a section at the bottom of each journal entry indicating outbound links to other journal entries",
		scope: "world",
		type:  Boolean,
		default: true,
		config: false,
	});
    game.settings.register(GS_MODULE_NAME, GS_FOLDER_NAME, {
		name: "Folder Name",
		hint: "The name of the folder which will be created in each part of the world data areas to contain the things imported from the RWexport file",
		scope: "world",
		type:  String,
		default: "Realm Works",
		config: false,
	});
    game.settings.register(GS_MODULE_NAME, GS_DELETE_OLD_FOLDERS, {
		name: "Delete Existing Folders",
		hint: "Delete any existing folders with the Folder Name. Useful when re-importing data",
		scope: "world",
		type:  Boolean,
		default: true,
		config: false,
	});
    game.settings.register(GS_MODULE_NAME, GS_OVERWRITE_EXISTING, {
		name: "Overwrite existing entries",
		hint: "When not deleting old folders, overwrite previously imported topics/articles with the latest version",
		scope: "world",
		type:  Boolean,
		default: false,
		config: false,
	});
    game.settings.register(GS_MODULE_NAME, GS_IMPORT_ONLY_NEW, {
		name: "Import only NEW entries",
		hint: "When not deleting old folders, only import topics/articles not already in the world",
		scope: "world",
		type:  Boolean,
		default: false,
		config: false,
	});
    game.settings.register(GS_MODULE_NAME, GS_ALL_IMAGES_WEBP, {
		name: "Convert all images to WEBP format",
		hint: "Since WEBP images are smaller, this option will convert ALL images to WEBP format",
		scope: "world",
		type:  Boolean,
		default: false,
		config: false,
	});
	
	// Add additional Note icons/svg/blind
	CONFIG.JournalEntry.noteIcons["Boxed Circle"] = PIN_ICON_REVEALED;
	CONFIG.JournalEntry.noteIcons["Crossed Eye"]  = PIN_ICON_NOT_REVEALED;
	
	// New sections for the editor
	CONFIG.TinyMCE.style_formats.push(RW_editor_player_options);
	CONFIG.TinyMCE.style_formats.push(RW_editor_gm_options);
	CONFIG.TinyMCE.content_css.push('/modules/realm-works-import/styles/style.css');
	
	// From World Smiths Toolkit
	//CONFIG.TinyMCE.plugins += " searchreplace visualchars visualblocks textpattern preview template";
    //CONFIG.TinyMCE.toolbar += " | searchreplace template";
    //CONFIG.TinyMCE.visualchars_default_state = true;
    //CONFIG.TinyMCE.visualblocks_default_state = true;
})


// Provide hook to put the button at the bottom of the COMPENDIUM panel in Foundry VTT
// Set up the user interface

Hooks.on("renderSidebarTab", async (app, html) => {
    if (game.user.isGM && app.options.id === "compendium") {
      let button = $("<button class='import-cd'><i class='fas fa-file-import'></i> Realm Works Import</button>")
      button.click(function () {
        new RealmWorksImporter().render(true);
      });
      
	  // 3.5 SRD doesn't have a directory-header
	  let anchor = html.find(".directory-header");
	  if (!anchor || anchor.length == 0) anchor = html.find(".directory-footer");
      anchor.append(button);
    }
})

//
// Utility functions which aren't required inside the class
//
function hstrong(string) {
	return `<strong>${string}</strong>`;
}
function hemphasis(string) {
	return `<em>${string}</em>`;
}
function hlabel(string) {
	return `<strong>${string}</strong>: `;
}
function hqualifier(string) {
	return ` <em>(${string})</em>`;
}
function hpara(body) {
	return `<p>${body}</p>`;
}
function header(lvl, name) {
	// <h1> is reserved for the title of each page (HTML guidance)
	// Foundry VTT doesn't include H1 in the navigation pane of a journal entry.
	return `<h${lvl+1}>${name}</h${lvl}>`;
}
// stripHtml: Strip all HTML from the string.
function stripHtml(original) {
	return original.replace(/<[^>]+>/g, '');
}
function escapeHTML(s) {
	const lookup = {
		'&': "&amp;",
		'"': "&quot;",
		'\'': "&apos;",
		'<': "&lt;",
		'>': "&gt;"
	};
	return s.replace( /[&"'<>]/g, c => lookup[c] );
}

function startSection(section_context, classes) {
	// Ignore setting "secret" if the context says to do so
	// (which would be when the topic is NOT revealed and the user doesn't want it all marked as SECRET
	if (section_context.ignore_secret && classes.includes('secret'))
		classes = classes.replace(/[ ]*secret/, '');	// secret will always be last
	if (section_context.classes === classes) return "";
	let result = "";
	if (section_context.classes?.length > 0) result += '</section>';
	section_context.classes = classes;
	if (classes.length > 0) result += `<section class="${classes}">`;
	// Note, no section needed if no classes
	return result;
}
function endSection(section_context) {
	if (section_context.classes?.length > 0) {
		section_context.classes = "";
		return '</section>';
	}
	return "";
}
function simplesection(section_context, revealed, body) {
	return startSection(section_context, revealed ? "" : "secret") + body;
}
function labelledField(label, content, annotation=null) {
	let body = hlabel(label);
	if (content) body += content;
	if (annotation) body += hemphasis('; ' + stripHtml(annotation));	// single line in RW file
	return hpara(body);
}	
function stripPara(original) {
	if (original.startsWith('<p>') && original.endsWith('</p>')) {
		return original.slice(3,-4);
	}
	return original;
}
// Remove the default class information from the RW formatting to reduce the size of the final HTML.
function simplifyPara(original) { // UNUSED - is it worth keeping?
	// Too much effort to remove <span> and </span> tags, so just simplify.
	// Replace <span class="RWSnippet">...</span> with just the ...
	// Replace <span>...</span> with just the ...
	// Replace <p class="RWBullet"> sequence with <ul><li>text</li></ul>
	// Replace <p class="RWEnumated"> sequence with <ol><li>text</li><ol>
	return original.
		replaceAll(/<span class="RWSnippet">/g,'<span>').
		replaceAll(/<span>([^<]*)<\/span>/g,'$1').
		replaceAll(/<span>([^<]*)<\/span>/g,'$1').		// sometimes we have nested simple spans
		replaceAll(/<span class="RWSnippet" style="font-weight:bold">([^<]*)<\/span>/g,'<strong>$1</strong>').
		replaceAll(/<span class="RWSnippet" style="font-style:italic">([^<]*)<\/span>/g,'<em>$1</em>').
		replaceAll(/<span class="RWSnippet" /g,'<span ').
		replaceAll(/<span><sub>([^<]*)<\/sub><\/span>/g,'<sub>$1</sub>').
		replaceAll(/<span><sup>([^<]*)<\/sup><\/span>/g,'<sup>$1</sup>').
		replaceAll(/<p class="RWDefault">/g,'<p>').
		replaceAll(/<p class="RWDefault" /g,'<p ').
		replaceAll(/<p class="RWSnippet">/g,'<p>').
		replaceAll(/<p class="RWSnippet" /g,'<p ').
		replaceAll(/<p class="RWBullet">(.*?)<\/p>/g, '<ul><li>$1</li></ul>').
		replaceAll(/<p class="RWEnumerated">(.*?)<\/p>/g, '<ol><li>$1</li></ol>').
		replaceAll(/<\/ul><ul>/g,'').		// Two consecutive RWBullet, so merge into a single ul list
		replaceAll(/<\/ol><ol>/g,'');		// Two consecutive RWEnumberated, so merge into a single ol list
}
	
function hasRevealed(section) {
	for (const node of section.children) {
		switch (node.nodeName) {
		case 'snippet':
			if (node.hasAttribute('is_revealed')) return true;
			break;
		case 'section':
			if (hasRevealed(node)) return true;
			break;
		}
	}
	return false;
}
// getChild: Returns the named direct child of node.  node can be undefined, failure to find will return undefined.
function getChild(node,name) {
	if (node) {
		// children   = only element children
		// childNodes = all child nodes
		for (const child of node.children) {
			if (child.nodeName === name) return child;
		}
	}
	return undefined;
}
//
// Convert Utf8Array to UTF-8 string
//
function Utf8ArrayToStr(array) {
	let out, i, len, c;
	let char2, char3;

	out = "";
	len = array.length;
	i = 0;
	while(i < len) {
		c = array[i++];
		switch(c >> 4)
		{ 
		case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
			// 0xxxxxxx
			out += String.fromCharCode(c);
			break;
		case 12: case 13:
			// 110x xxxx   10xx xxxx
			char2 = array[i++];
			out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
			break;
		case 14:
			// 1110 xxxx  10xx xxxx  10xx xxxx
			char2 = array[i++];
			char3 = array[i++];
			out += String.fromCharCode(((c & 0x0F) << 12) |
						((char2 & 0x3F) << 6) |
						((char3 & 0x3F) << 0));
			break;
		}
	}
	return out;
}

function getOwnership(revealed) {
	return { "default": revealed ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER : CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
}

function firstImage(pages) {
	if (Array.isArray(pages)) {
		for (let page of pages) {
			if (page.type === 'image') return page.src;
		}
	}
	return undefined;
}


const convertToWebp = src => new Promise((resolve, reject) =>
	{
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			canvas.getContext('2d').drawImage(image, 0, 0);
			canvas.toBlob( blob => resolve(blob), 'image/webp');
		};
		image.onerror = reject;
		image.src = src;
	});


class RealmWorksImporter extends Application
{
	// document_for_topic is a map: key = topic_id, value = JournalEntry
	static ConnectionName = {
		Arbitrary:           hstrong("Arbitrary connection to"),
		Generic:             hstrong("Simple connection to"),
		Union:               hstrong("Family Relationship to") + hqualifier("Union with"),
		Parent_To_Offspring: hstrong("Family Relationship to") + hqualifier("Immediate Ancestor of"),
		Offspring_To_Parent: hstrong("Family Relationship to") + hqualifier("Offspring of"),
		Master_To_Minion:    hstrong("Comprises or Encompasses"),
		Minion_To_Master:    hstrong("Belongs To or Within"),
		Public_Attitude_Towards:  hstrong("Public Attitude Towards"),
		Private_Attitude_Towards: hstrong("Private Attitude Towards"),
	}

	// Foundry VTT default options for the dialogue window,
	// note that we supply the HTML file that will show the window.
	static get defaultOptions()
	{
		const options = super.defaultOptions;
		options.id = "realm-works-importer";
		options.template = "modules/realm-works-import/templates/import_ui.html";
		options.classes.push("realm-works-importer");
		options.resizable = false;
		options.height = "auto";
		options.width = 400;
		options.minimizable = true;
		options.title = "Realm Works Importer";
		return options;
	}
	
	parseStructure(string) {
		let result = {};
		const tree = this.parser.parseFromString(string, "text/xml");
		result.tags = new Map();
		result.domains = new Map();
		result.partitions = new Map();
		result.categories = new Map();
		result.facets = new Map();
		// domain_global:tag_global
		// domain:tag
		// category_global
		// category
		function fillmap(map, elementName, attributeName) {
			for (const child of tree.getElementsByTagName(elementName)) {
				map.set(child.getAttribute(attributeName), child.getAttribute('name'));
			}
		}
		fillmap(result.domains,    'domain_global',    'domain_id');
		fillmap(result.domains,    'domain',           'domain_id');
		fillmap(result.tags,       'tag_global',       'tag_id');
		fillmap(result.tags,       'tag',              'tag_id');
		fillmap(result.categories, 'category_global',  'category_id');
		fillmap(result.categories, 'category',         'category_id');
		fillmap(result.partitions, 'partition_global', 'partition_id');
		fillmap(result.partitions, 'partition',        'partition_id');
		fillmap(result.facets,     'facet_global',     'facet_id');
		fillmap(result.facets,     'facet',            'facet_id');

		// Determine which categories should be mapped to Items (only if enabled)
		result.category_item_type = new Map();
		if (this.create_items) {
			for (const [category_id,category_name] of result.categories.entries()) {
				// TEMP: use startsWith instead of looking for exact match,
				// simply because Duplicating an existing category uses the same name with " Copy" appended to it.
				for (const [cat_name,item_type] of this.category_item_types.entries())
					if (category_name.startsWith(cat_name))
						result.category_item_type.set(category_id, item_type);
					
				//if (this.category_item_types.has(category_name)) {
				//	result.category_item_type.set(category_id, this.category_item_types.get(category_name));
				//}
			}
		}
		
		// Mapping from tag back to the name of the containing domain.
		result.domain_of_tag = new Map();
		for (const child of tree.getElementsByTagName('tag_global')) {
			result.domain_of_tag.set(child.getAttribute('tag_id'), child.parentNode.getAttribute('name'));
		}
		for (const child of tree.getElementsByTagName('tag')) {
			result.domain_of_tag.set(child.getAttribute('tag_id'), child.parentNode.getAttribute('name'));
		}
		console.debug(`parseStructure found ${result.domains.size} domains, ${result.tags.size} tags, ${result.categories.size} categories, ${result.partitions.size} partitions, ${result.facets.size} facets`);
		return result;
	}
	
	// Create full journal entry name for a topic (including the prefix and/or suffix)
	journaltitle(topic) {
		// {prefix} - {public_name} ({suffix})
		let result = topic.getAttribute("public_name");
		let prefix = topic.getAttribute('prefix');
		let suffix = topic.getAttribute('suffix');
		if (prefix) result = prefix + ' - ' + result;
		if (suffix) result += ' (' + suffix + ')';
		return result;
	}
	
	journallinktitle(topic) {
		// {public_name} ({suffix} - {prefix})
		let result = topic.getAttribute("public_name");
		let prefix = topic.getAttribute('prefix');
		let suffix = topic.getAttribute('suffix');
		if (prefix || suffix) {
			result += ' (';
			if (suffix) result += suffix;
			if (suffix && prefix) result += ' - ';
			if (prefix) result += prefix;
			result += ')';
		}
		return result;
	}
	
	// Foundry VTT listener for actions in the window.
	activateListeners(html) {
		super.activateListeners(html);
		
		// Set stored values for each field
		html.find('[name=folder-name]')?.val(                 game.settings.get(GS_MODULE_NAME, GS_FOLDER_NAME));
		html.find('[name=inboundLinks]')?.prop('checked',     game.settings.get(GS_MODULE_NAME, GS_CREATE_INBOUND_LINKS));
		html.find('[name=outboundLinks]')?.prop('checked',    game.settings.get(GS_MODULE_NAME, GS_CREATE_OUTBOUND_LINKS));
		html.find('[name=deleteOldFolders]')?.prop('checked', game.settings.get(GS_MODULE_NAME, GS_DELETE_OLD_FOLDERS));
		html.find('[name=overwriteExisting]')?.prop('checked', game.settings.get(GS_MODULE_NAME, GS_OVERWRITE_EXISTING));
		html.find('[name=importOnlyNew]')?.prop('checked',     game.settings.get(GS_MODULE_NAME, GS_IMPORT_ONLY_NEW));
		html.find('[name=allImagesWebp]')?.prop('checked',     game.settings.get(GS_MODULE_NAME, GS_ALL_IMAGES_WEBP));
		//html.find('[name=folder-name]')?.val(game.settings.get(GS_MODULE_NAME, 
		
		// See if we can work with the 'revealed-notes-manager' module
		this.setNoteRevealed = globalThis.setNoteRevealed;

		html.find(".import-file").click(async ev => {
			// Retrieve settings from the window
			this.folderName = html.find('[name=folder-name]').val();
			this.ui_message = html.find('[name=message-area]');
			this.addInboundLinks = html.find('[name=inboundLinks]').is(':checked');
			this.addOutboundLinks = html.find('[name=outboundLinks]').is(':checked');
			this.deleteOldFolders = html.find('[name=deleteOldFolders]').is(':checked');
			this.overwriteExisting = html.find('[name=overwriteExisting]').is(':checked');
			this.importOnlyNew = html.find('[name=importOnlyNew]').is(':checked');
			this.allImagesWebp = html.find('[name=allImagesWebp]').is(':checked');

			// Ensure folder name is present.
			if (this.folderName.length === 0) {
				this.ui_message.val('Folder name is missing!');
				return;
			}
			
			// Retrieve settings from the module settings
			this.actor_type = game.settings.get(GS_MODULE_NAME, GS_ACTOR_TYPE);
			this.governing_content_label   = game.settings.get(GS_MODULE_NAME, GS_GOVERNING_CONTENT_LABEL);
			this.governed_max_depth        = game.settings.get(GS_MODULE_NAME, GS_GOVERNED_MAX_DEPTH);
			this.section_numbering         = game.settings.get(GS_MODULE_NAME, GS_SECTION_NUMBERING);
			this.scene_padding             = game.settings.get(GS_MODULE_NAME, GS_SCENE_PADDING);
			this.scene_grid                = game.settings.get(GS_MODULE_NAME, GS_SCENE_GRID);
			this.scene_token_vision        = game.settings.get(GS_MODULE_NAME, GS_SCENE_TOKEN_VISION);
			this.scene_revealed_navigation = game.settings.get(GS_MODULE_NAME, GS_SCENE_REVEALED_NAVIGATION);
			this.create_items              = game.settings.get(GS_MODULE_NAME, GS_CREATE_ITEMS);
			this.unrevealed_topics_secret  = game.settings.get(GS_MODULE_NAME, GS_UNREVEALED_TOPICS_SECRET);
			this.note_line_length          = game.settings.get(GS_MODULE_NAME, GS_NOTE_LINE_LENGTH);
			this.note_text_size            = game.settings.get(GS_MODULE_NAME, GS_NOTE_TEXT_SIZE);
			if (this.scene_grid < 50) {
				console.warn(`CONFIGURED SCENE GRID SIZE IS TOO SMALL (${this.scene_grid}), USING 50`);
				this.scene_grid = 50;
			}
			this.por_html = "html";

			// Set the correct functions to use based on the game system

			// This will be moved into conditional area later
			this.item_data_func = function(structure,topic,itemtype,content,category) { return { description: { value: content }} };
			this.get_item_type  = function(structure,topic,initialType) { return initialType; };
			this.category_item_types = new Map();
			
			switch (game.system.id) {
			case 'pf1':
				this.actor_data_func = function(html) { return { details: { notes: { value: html }}} };
				let {default:RWPF1Actor} = await import("./actor-pf1.js");
				this.init_actors = RWPF1Actor.initModule;
				this.create_actor_data  = RWPF1Actor.createActorData;
				this.post_create_actors = RWPF1Actor.postCreateActors;
				this.get_item_type  = RWPF1Actor.getItemType;
				this.item_data_func = RWPF1Actor.createItemData;
				this.category_item_types = RWPF1Actor.CategoryItemTypes;
				break;

			case 'dnd5e':
				this.actor_data_func = function(html) { return { details: { biography: { value: html }}} };
				let {default:RWDND5EActor} = await import("./actor-dnd5e.js");
				this.init_actors = RWDND5EActor.initModule;
				this.create_actor_data = RWDND5EActor.createActorData;
				break;
				
			case 'swade':
				this.actor_data_func = function(html) { return { details: { biography: { value: html }}} };
				let {default:RWSWADEActor} = await import("./actor-swade.js");
				this.init_actors = RWSWADEActor.initModule;
				this.create_actor_data = RWSWADEActor.createActorData;
				break;
				
			case 'pf2e':
				this.actor_data_func = function(html) { return { details: { biography: { value: html }}} };
				break;
				
			case 'wfrp4e':
				this.actor_data_func = function(html) { return { details: { biography: { value: html }}} };
				break;
				
			case 'grpga':
				this.actor_data_func = function(html) { return { biography: html }};
				break;
				
			case 'worldbuilding':
				this.actor_data_func = function(html) { return { biography: html } };
				break;
			
			case 'pbta':
				// Creates error "One of original or other are not Objects!"
				this.actor_data_func = function(html) { return { details: { biography: html }} };
				break;

			case 'alienrpg':
				// This system doesn't have a biography/notes section on the Actor sheet
				this.actor_data_func = function(html) { return { notes: html } };
				break;

			case 'CoC7':
				// HL por for CoC 6th & 7th editions contains only minimal information in XML, so no chance of decoding it!
				// CoC7 for PC shows raw HTML code, not formatted.
				// but for NPC the Notes section is formatted HTML.
				if (this.actor_type === 'character') {
					// character only displays raw text/HTML
					this.por_html = "text";
					let {default:RWCoC7Actor} = await import("./actor-coc7.js");
					this.init_actors     = RWCoC7Actor.initModule;
					this.actor_data_func = RWCoC7Actor.parseStatblock;
					this.post_create_actors = RWCoC7Actor.tidyupActors;
				} else {
					// npc and creature display formatted HTML (go figure!)
					//this.actor_data_func = function(html) { return { biography: { personalDescription: { value: html }}} };
					this.por_html = "text";
					let {default:RWCoC7Actor} = await import("./actor-coc7.js");
					this.init_actors     = RWCoC7Actor.initModule;
					this.actor_data_func = RWCoC7Actor.parseStatblock;
					this.post_create_actors = RWCoC7Actor.tidyupActors;
				}
				break;

			case 'cyphersystem':
				if (this.actor_type === 'PC')
					this.actor_data_func = function(html) { return { basic: { notes: html }} };
				else
					this.actor_data_func = function(html) { return { description: html } };
				break;
			
			default:
				this.actor_data_func = function(html) { return { biography: { personalDescription: { value: html }}} };
				break;
			} // switch (game.system.id)
			
			// Save the window settings for next time
			game.settings.set(GS_MODULE_NAME, GS_CREATE_INBOUND_LINKS,  this.addInboundLinks);
			game.settings.set(GS_MODULE_NAME, GS_CREATE_OUTBOUND_LINKS, this.addOutboundLinks);
			game.settings.set(GS_MODULE_NAME, GS_FOLDER_NAME,           this.folderName);
			game.settings.set(GS_MODULE_NAME, GS_DELETE_OLD_FOLDERS,    this.deleteOldFolders);
			game.settings.set(GS_MODULE_NAME, GS_OVERWRITE_EXISTING,    this.overwriteExisting);
			game.settings.set(GS_MODULE_NAME, GS_IMPORT_ONLY_NEW,       this.importOnlyNew);
			game.settings.set(GS_MODULE_NAME, GS_ALL_IMAGES_WEBP,       this.allImagesWebp);
			
			// Where image files should be stored...
			this.asset_directory = game.settings.get(GS_MODULE_NAME, GS_ASSETS_LOCATION);		// no trailing "/"
			const options = DirectoryPicker.parse(this.asset_directory);
			// Create the prefix when referencing the location of uploaded files
			if (options.activeSource === 's3')
				this.asset_url = game.data.files.s3.endpoint.protocol + '//' + options.bucket + '.' +
					game.data.files.s3.endpoint.hostname + '/' + options.current + '/';
			else
				this.asset_url = options.current + '/';
			
			// Try to load the file
			let fileinput = html.find('[name=inputFile]')?.[0];
			if (!fileinput?.files || fileinput.files.length === 0)
			{
				this.ui_message.val(`Please select a file.`);
				return;
			}
			let file = fileinput.files[0];
			
			this.ui_message.val(`Reading ${file.name}`);
			console.info(`Reading contents of ${file.name} (size ${file.size})`);
			
			if (file.name.endsWith('.por')) {
				console.info(`Parsing HeroLab Portfolio file`);
				await this.parseHL(file);
				console.info('******  Finished  ******');
				this.ui_message.val('--- Finished ---');
				fileinput = undefined;
				file = undefined;
				return;
			}

			if (!this.parser) this.parser = new DOMParser();
			
			// Indicate we have no structure yet
			this.structure = undefined;
			
			// Javascript string has a maximum size of 512 MB, so can't pass the entire file to parseFromString,
			// so read chunks of the file and look for topics within the chunks.
			const chunkSize = 5000000;	// ~5 MB
			let buffer = "";
			let topic_nodes = [];
			let start = 0;
			let first=true;
			while (start < file.size) {
				// Read another chunk onto the end of the buffer.
				const blob = await file.slice(start, start+chunkSize);
				if (blob.size === 0) break;
				start  += blob.size;
				buffer += await blob.text();	// convert assuming UTF-8
				console.debug(`Read ${blob.size} bytes from file (buffer size now ${buffer.length})`);
				
				if (!this.structure) {
					const struct_end = buffer.indexOf('</structure>');
					if (struct_end < 0) continue;
					// We have the complete structure, so collect all its data now
					const struct_start = buffer.indexOf('<structure>');
					if (struct_start < 0 || struct_start > struct_end) {
						console.error('Invalid RWexport file: found </structure> without a preceding <structure>');
						return;
					}
					this.structure = this.parseStructure(buffer.slice(struct_start, struct_end+12));
					// Discard everything before the structure
					buffer = buffer.slice(struct_end+12);
					// Now continue onwards to see if we already have the first topic.
				}
				
				// Strip leading space before the first <topic> to help keep the size of buffer relatively small
				if (first) {
					let pos = buffer.indexOf('<topic ');
					if (pos < 0) continue;		// We haven't found the first topic yet
					buffer = buffer.slice(pos);
					first = false;
				}

				// Read all complete topics which are in the buffer
				while (true) {
					// Firstly, find first end-of-topic marker
					const topic_end = buffer.indexOf('</topic>');
					if (topic_end < 0) break;
					// Find the start-of-topic marker for that end-marker
					const topic_start = buffer.lastIndexOf('<topic ', topic_end);
					if (topic_start < 0) break;
					const block = buffer.slice(topic_start, topic_end+8);
					try {
						// parseFromString returns a #Document node as the top node.
						const topicnode = getChild(this.parser.parseFromString(block, "text/xml"), 'topic');
						if (topicnode) {
							topic_nodes.push(topicnode);
							// Replace extracted topic with a marker to correctly identify child topics.
							// Ensure topics with " in the title don't cause problems
							buffer = buffer.slice(0,topic_start) + 
								'<topicchild topic_id="' +
								topicnode.getAttribute('topic_id') +
								'" public_name="' +
								escapeHTML(topicnode.getAttribute('public_name')) + 
								'" />' + 
								buffer.slice(topic_end+8);
						} else {
							console.warn(`Failed to parse XML of topic in ${block}`);
							// Remove offending topic without marker
							buffer = buffer.slice(0,topic_start) + buffer.slice(topic_end+8);
						}
					} catch(e) {
						console.warn(`Parsing failed due to ${e}`);
						console.warn(`text: ${block}`);
						// Remove offending topic without marker
						buffer = buffer.slice(0,topic_start) + buffer.slice(topic_end+8);
					}
				}
			}
			// Do the actual work!
			console.info(`Found ${topic_nodes.length} topics`);
			await this.parseXML(topic_nodes);
			
			console.info('******  Finished  ******');
			this.ui_message.val('--- Finished ---');
			
			// Release all memory
			fileinput = undefined;
			file = undefined;
			buffer = undefined;
			topic_nodes = undefined;
			delete this.structure;
			delete this.title_of_topic;
			delete this.connectionname_of_topic;
			delete this.revealed_topics;
			
			// Automatically close the window after the import is finished
			//this.close();
		});
	}

	async getFolder(folderName, type, parentid=null) {
		const found = game.folders.find(e => e.type === type && e.name === folderName && e.parent === parentid);
		if (found) return found;
		return Folder.create({name: folderName, type: type, parent: parentid, sorting: "m"});
	}
	
	// Generic routine to create any type of inter-topic link (remote_link can be undefined)
	formatLink(topic_id, orig_link_text) {
		let link_text, prefix="",suffix="";
		if (orig_link_text) {
			// Move any formatting in orig_link_text to OUTSIDE the JournalEntry directive
			// (since {abc} won't be used as the link name if it contains HTML elements)
			link_text = orig_link_text;
			while (link_text.startsWith("<") && link_text.endsWith(">")) {
				const pos1 = link_text.indexOf(">");
				const pos2 = link_text.lastIndexOf("<");
				if (pos1 == -1 || pos2 == -1 || pos1 > pos2) break;
				prefix += link_text.slice(0,pos1+1);
				suffix = link_text.slice(pos2) + suffix;
				link_text = link_text.slice(pos1+1,pos2);
			}
		} else {
			// Default to using the title of the topic (if present in the file)
			link_text = this.title_of_topic.get(topic_id)
			if (!link_text) {
				console.warn(`FORMATLINK: topic_id '${topic_id}' not found in file (It is probably the Realm's HOME PAGE, or the file is a partial export)`);
				// This is most likely because the link is to the REALM HOME PAGE which is NOT provided in the RWEXPORT file.
				link_text = topic_id;
			}
		}
		
		let link_type = this.topic_item_type.has(topic_id) ? 'Item' : 'JournalEntry';
		
		const id = this.document_for_topic.get(topic_id)?._id;
		if (id)
			return `${prefix}@${link_type}[${id}]{${link_text}}${suffix}`;
		else
			return `${prefix}@${link_type}[${link_text}]${suffix}`;
	}
	
	// Some image files are changed to .png (from .bmp .gif .tif .tiff)
	validfilename(filename) {
		if (this.allImagesWebp &&
			(filename.endsWith('.gif') || filename.endsWith('.png') || filename.endsWith('.jpg') ||  filename.endsWith('.jpeg') ||
			 filename.endsWith('.bmp') || filename.endsWith('.tif') || filename.endsWith('.tiff')))
		{
			let pos = filename.lastIndexOf('.');
			if (pos > 0)
				return filename.slice(0,pos) + '.webp';
		}
		if (filename.endsWith('.bmp') || filename.endsWith('.tif') || filename.endsWith('.gif'))
			return filename.slice(0,-4) + '.png';
		if (filename.endsWith('.tiff'))
			return filename.slice(0,-5) + '.png';
		return filename;
	}
	
	imageFilename(filename) {
		return this.asset_url + this.validfilename(filename);
	}

	// Upload the specified binary data to a file in this.asset_directory
	async uploadBinaryFile(filename, srcdata) {
		let data = srcdata;
		// The "allImagesWebp" conversion doesn't support BMP, TIF or GIF formats.
		if (filename.endsWith('.bmp') || filename.endsWith('.tif') || filename.endsWith('.gif') || filename.endsWith('.tiff'))
		{
			// Buffer.from(array)
			data = await Jimp.read(Buffer.from(srcdata)).then(image => image.getBufferAsync('image/png'));
		}

		if (this.allImagesWebp &&
			(filename.endsWith('.gif') || filename.endsWith('.png') || filename.endsWith('.jpg') ||  filename.endsWith('.jpeg') ||
			 filename.endsWith('.bmp') || filename.endsWith('.tif') || filename.endsWith('.tiff')))
		{
			const blob = new Blob([data]);
			data = await convertToWebp(URL.createObjectURL(blob)).catch(err => { console.warn(`Failed to convert ${filename} to webp: ${err}`); return undefined; });
		}

		if (data)
		{
			let file = new File([data], this.validfilename(filename));

			await DirectoryPicker.uploadToPath(this.asset_directory, file)
				.then(console.debug(`Uploaded file '${filename}'`))
				.catch(e => console.warn(`Failed to upload '${filename}': ${e}`));
		}
	}

	// Convert a string in base64 format into binary and upload to this.asset_directory,
	async uploadFile(filename, base64) {
		return await this.uploadBinaryFile(filename, Uint8Array.from(atob(base64), c => c.charCodeAt(0)) );
	}

	// Insert line breaks so that no line is longer than "max"
	breakLines(string) {
		const max = this.note_line_length;
		if (string.length < max) return string;
		let pos = 0;
		let result = "";
		while (pos < string.length) {
			// Firstly check for an existing line break.
			let limit = pos+max;
			let brk = (limit < string.length) ? string.lastIndexOf('\n', limit) : string.length;
			if (brk < pos) {	// no line break, so check for white space
				brk = string.lastIndexOf(' ', limit);
				if (brk < pos) {	// No space found in the line, so look for first space beyond ideal point.
					brk = string.indexOf(' ', limit);
					if (brk === -1) brk = string.length;
				}
			}
			// Add to result
			if (result.length > 0) result += '\n';
			result += string.slice(pos, brk);	// exclude the white space
			pos = brk+1; // skip that white space character
		}
		return result;
	}
	
	// Convert a Smart_Image into a scene
	async createScene(topic, smart_image, is_revealed) {
		//<snippet facet_name="Map" type="Smart_Image" search_text="">
		//  <smart_image name="Map">
		//    <asset filename="n5uvmpam.eb4.png">
		//      <contents>
		//	  <map_pin pin_name="Deneb Sector" topic_id="Topic_392" x="330" y="239">	-- topic_id is optional
		//		<description>Nieklsdia (Zhodani)</description> -- could be empty

		// These need to be created as Scenes (and linked from the original topic?)
		//const scenename = smart_image.parentElement?.getAttribute('facet_name');
		const scene_topic_id = topic.getAttribute("topic_id");
		const uuid     = topic.getAttribute("original_uuid");
		const asset    = getChild(smart_image, 'asset'); // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
		const contents = getChild(asset, 'contents'); // <contents>
		const filename = asset?.getAttribute('filename');
		if (!asset)    throw('<smart_image> is missing <asset>');
		if (!contents) throw('<smart_image> is missing <contents>');
		if (!filename) throw('<smart_image><asset> is missing filename attribute');
		
		// Name comes from topic name + facet_name
		const scenename = this.title_of_topic.get(scene_topic_id) + ':' + smart_image.getAttribute('name');
		console.debug(`Creating scene '${scenename}' from topic_id ${scene_topic_id}`);
	
		// The file was uploaded when the TOPIC was processed, so can simply read it here.
		const imagename = this.imageFilename(filename);
		const tex = await loadTexture(imagename);	// when previously uploaded, bmp/tif/tiff files were converted to png.
		let scenedata = {
			name   : scenename,
			img    : imagename,
			folder : this.scene_folder.id,
			active : false,
			// Ensure navigation is true or false, and not null or undefined
			navigation: (is_revealed && this.scene_revealed_navigation) ? true : false,
			width  : tex.baseTexture.width,
			height : tex.baseTexture.height,
			padding: this.scene_padding,
			grid   : this.scene_grid,
			journal: this.document_for_topic.get(scene_topic_id)?._id,
			tokenVision:    this.scene_token_vision,
			fogExploration: this.scene_token_vision,
			ownership: getOwnership(is_revealed),
			flags: { [GS_MODULE_NAME] : { [GS_FLAGS_UUID] : uuid }},
		};
		
		// Maybe we should UPDATE rather than CREATE?
		let scene;
		let delete_old_notes = false;
		if (this.overwriteExisting) {
			let existing = game.scenes.find(s => s.getFlag(GS_MODULE_NAME,GS_FLAGS_UUID) === uuid && s.name === scenedata.name);
			if (existing) {
				await existing.update(scenedata)
					.then(s => { scene = existing; console.debug(`Updated existing scene '${existing.name}'`) })
					.catch(e => console.warn(`Failed to update existing scene ${scenename} due to ${e}`));
				delete_old_notes = true;
			}
		}
		if (!scene) {
			//console.debug(`Creating scene in folder ${scenedata.folder}`);
			scene = await Scene.create(scenedata).catch(e => console.warn(`Failed to create new scene ${scenename} due to ${e}`));
		}
		//if (scene) console.debug(`Successfully created scene for ${scenename} in folder ${scene.folder}`);
		if (!scene) throw(`Failed to create scene for '${scenedata.name}'`);
		
		// Add some notes
		let notes = [];
		let pinnum = 0;
		// X,Y padding for pin positions are offset by the scene padding, which is scaled to the nearest larger number of grid squares.
		let x_pad = this.scene_grid * Math.ceil((scenedata.width  * scenedata.padding) / this.scene_grid);
		let y_pad = this.scene_grid * Math.ceil((scenedata.height * scenedata.padding) / this.scene_grid);
		//console.debug(`SCENE '${scenedata.name}': width=${scenedata.width}, height=${scenedata.height}, padding=${scenedata.padding}, x_pad=${x_pad}, y_pad=${y_pad}`);
		for (const pin of smart_image.getElementsByTagName('map_pin')) {
			// Pin revealed state is handled by our hijacking of Note#refresh
			let pin_topic_id    = pin.getAttribute('topic_id');
			let pin_is_revealed = pin.hasAttribute('is_revealed');
			//let pin_is_revealed = pin.hasAttribute('is_revealed') && (!pin_topic_id || this.revealed_topics.has(pin_topic_id));
			
			const pinname = pin.getAttribute('pin_name') ?? (pin_topic_id ? this.title_of_topic.get(pin_topic_id) : 'Unnamed');
			let entryid = this.document_for_topic.get(pin_topic_id)?._id;
			let desc    = getChild(pin, 'description')?.textContent?.replaceAll('&#xd;\n','\n');
			let gmdir   = getChild(pin, 'gm_directions')?.textContent?.replaceAll('&#xd;\n','\n');
			
			if (desc)  desc  = this.breakLines(desc);
			if (gmdir) gmdir = this.breakLines(gmdir);
			
			let notedata = {
				name: pinname,
				entryId: entryid,
				x: x_pad + +pin.getAttribute('x'),
				y: y_pad + +pin.getAttribute('y'),
				icon:     pin_is_revealed ? PIN_ICON_REVEALED : PIN_ICON_NOT_REVEALED,
				iconSize: 32,		// minimum size 32
				text: desc ? `>> ${pinname} <<\n` + desc : pinname,
				fontSize: this.note_text_size,
				//textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
				//textColor: "#00FFFF",
				scene: scene.id,
				//ownership: getOwnership(pin.getAttribute('is_revealed')),
			};
			if (globalThis.setNoteRevealed) globalThis.setNoteRevealed(notedata, pin_is_revealed);
			if (gmdir && globalThis.setNoteGMtext) globalThis.setNoteGMtext(notedata, (desc ? notedata.text : `>> ${pinname} <<`) + '\n\u2193\u2193 --- GMDIR --- \u2193\u2193\n' + gmdir)
			notes.push(notedata);
			//if (note) console.debug(`Created map pin ${notedata.name}`);
		}
		// If updating, then delete any previous notes
		if (delete_old_notes) {
			console.debug(`Deleting old notes from '${scenename}'`);
			let oldnotes = scene.getEmbeddedCollection('Note').map(n => n.id);
			if (oldnotes.length > 0)
				await scene.deleteEmbeddedDocuments('Note', oldnotes).catch(e => console.warn(`Failed to delete old notes from '${scenename}' due to ${e}`));
		}
		if (notes.length > 0) {
			await scene.createEmbeddedDocuments('Note', notes).catch(e => console.warn(`Failed to create notes on scene '${scenename}' due to ${e}`));
		}
		
		// Create thumbnail - do this AFTER creating notes so that we get a scene.update
		// call to write all the notes to scenes.db
		// createThumbnail and update are async, but we don't need the results elsewhere
		scene.createThumbnail().then(data => scene.update({thumb: data.thumb}));
		
		this.ui_message.val(`Created scene '${scenename}' with ${notes.length} notes`);
		console.debug(`Created scene '${scenename}' with ${notes.length} notes`);
		return scene.id;
	}
		
	// base64 is the base64 string containing the .por file
	// format is one of the character formats in the .por file: 'html', 'text', 'xml' (need to do Utf8ArrayToStr to get to string)
	// Returns an array of [ name , data ] for each character/minion in the portfolio.
	
	readPortfolio(data) {
		const buf = (data instanceof Uint8Array) ? data : Uint8Array.from(atob(data), c => c.charCodeAt(0));
		const files = UZIP.parse(buf);
		// Now have an object with "key : property" pairs  (key = filename [String]; property = file data [Uint8Array])

		// Process the index.xml in the root of the portfolio file.
		if (!this.parser) this.parser = new DOMParser();
		const xmlDoc = this.parser.parseFromString(Utf8ArrayToStr(files['index.xml']),"text/xml");
		// <document><characters>
		//   <character name="Fantastic">
		//    <statblocks><statblock format="html" folder="statblocks_html" filename="1_Fantastic.htm"/>
		//    <images><image>
		//    <minions><character name="Flappy"> <summary><statblocks><statblock format="html" folder="statblocks_html" filename="1_Fantastic.htm"/>
		
		// For each character in the POR, extract the statblock with the corresponding format, and any minions with the corresponding statblock
		let result = new Map();
		for (const character of xmlDoc.getElementsByTagName('character')) {
			let actordata = { name: character.getAttribute('name') };
			if (!actordata.name) {
				console.warn(`No 'name' tag in character portfolio: fields = ${character.getAttributeNames()}`);
				continue;
			}
			for (const statblock of getChild(character,'statblocks').children) {
				if (statblock.nodeName === 'statblock') {
					const format = statblock.getAttribute('format');
					const folder = statblock.getAttribute('folder');
					const filename = statblock.getAttribute('filename');
					actordata[format] = files[folder + '/' + filename];
				}
			}
			const img  = getChild(getChild(character,'images'),'image');
			if (img) {
				const folder   = img.getAttribute('folder');
				const filename = img.getAttribute('filename');
				actordata.imgfilename = filename;
				actordata.imgdata = files[folder + '/' + filename];
			}
			result.set(actordata.name, actordata);
		}
		//console.info(`...found ${result.length} sheets`);
		return result;
	}

	// 
	// Convert the XML read from a portfolio file into an Object hierarchy
	//
	static xmlToObject(xmlDoc, arrayTags) {

		function parseNode(xmlNode, result) {
			if (xmlNode.nodeName === "#text") {
				let v = xmlNode.nodeValue;
				if (v.trim())
					result['#text'] = v;
				return;
			}
			let jsonNode = {},
			existing = result[xmlNode.nodeName];
			if (existing) {
				if (!Array.isArray(existing))
					result[xmlNode.nodeName] = [existing, jsonNode];
				else
					result[xmlNode.nodeName].push(jsonNode);
			} else {
				if (arrayTags && arrayTags.indexOf(xmlNode.nodeName) !== -1)
					result[xmlNode.nodeName] = [jsonNode];
				else
					result[xmlNode.nodeName] = jsonNode;
			}
			if (xmlNode.attributes) {
				for (const attribute of xmlNode.attributes) {
					jsonNode[attribute.nodeName] = attribute.nodeValue;
				}
			}
			for (let node of xmlNode.childNodes) {
				parseNode(node, jsonNode);
			}
		}
		let result = {};
		for (const node of xmlDoc.childNodes) {
			parseNode(node, result);
		}
		return result;
	}

	replaceLinks(original, links, direction="0") {
		// <link target_id="Topic_10" original_uuid="E76194B6-44F4-FC06-3418-68935B3A6BA9" signature="1028506">
		//     <span_info><span_list><span directions="0" start="3519" length="58"/>
		let link_map = [];
		for (const link of links) {
			for (const span of link.getElementsByTagName('span')) {
				const start = +span.getAttribute('start');
				if (span.getAttribute('directions') === direction) {		// 0 = contents, 1 = gm_directions
					link_map.push({
						target_id:  link.getAttribute('target_id'),
						start:      start,
						finish:     start + +span.getAttribute('length')
					});
				}
			}
		}				
		// Get in reverse order
		link_map.sort((p1,p2) => p2.start - p1.start);
		let result = original.replaceAll("&#xd;","\n");		// to deal with extra characters in tables
		for (const link of link_map) {
			let linktext = result.slice(link.start, link.finish);
			result = result.slice(0,link.start) + this.formatLink(link.target_id, linktext) + result.slice(link.finish);
		}
		return result;
	}
		
	async createTable(topic, section_name, string, is_revealed) {
		if (!string.includes("<table")) return "";
		let result = "";
		let nodes = this.parser.parseFromString(string, "text/html");
		// See if we should delete any existing entry
		let uuid = topic.getAttribute("original_uuid");
			
		for (const tablenode of nodes.getElementsByTagName("table")) {		// ignore the concept of nested tables for the moment
			// tablenode = HtmlTableElement
			// A table must have at least THREE rows to be meaningful (title + 2 data rows)
			if (!tablenode.rows || tablenode.rows.length < 3) {
				continue;
			}
			//console.debug(`table has ${tablenode.rows.length} rows`);
			let min, max,formula;  // min,max numbers for dice results
			function setLimit(value) {
				if (!min || value<min) min = value;
				if (!max || value>max) max = value;
			}
			function parseInt00(value) {
				// Handle "00" or "000" as the final value in a range, which needs to "100" or "1000"
				if (value.match(/0[0]+/))
					return parseInt('1' + value);
				else
					return parseInt(value);
			}

			// If the second column of the table is totally blank, use the third column if available
			let datacolumn = 1;
			if (tablenode.rows[1].cells.length > 2) {
				// See if column 1 is blank.
				let usethree = true;
				for (const rownode of tablenode.rows) {
					if (rownode.rowIndex > 0 &&
						rownode.cells.length > 2 && 
						rownode.cells[datacolumn].textContent.trim().length > 0) {
						usethree = false;
						break;
					}
				}
				if (usethree) datacolumn = 2;
				//console.log(`ROLL-TABLE: Using column ${datacolumn} for data`);
			}
				
			let rolltable = [];
			const formula_regexp = /^[d+%\d ]+$/i;  // 'd20' or '1d20' or 'd12 + d8' or 'd%'
			const details1_regexp = new RegExp("^<p[^>]*><span[^>]*>([^<]*)</span></p>$");
			const details2_regexp = new RegExp("^<p[^>]*>([^<]*)</p>$");
			const dice_regexp = /(\d+d\d+\+\d+|\d+d\d+|\d+d%\+\d+|\d+d%)/;
			let valid=true;
			for (const rownode of tablenode.rows) {
				// rownode = HTMLTableRowElement
				if (!rownode.cells || rownode.cells.length < 2) {
					console.log(this.title_of_topic.get(topic.getAttribute("topic_id")) + 'table: Row has no (or not enough) columns!');
					valid = false;
					break;
				}
				let cell1 = rownode.cells[0].textContent;
				//console.log(`First column = ${cell1}`);
				if (rownode.rowIndex == 0)
				{
					// check for dice information
					//console.debug(`ROLL-TABLE: Title of first column = '${cell1}'`);
					if (formula_regexp.test(cell1)) {
						formula = cell1.replaceAll("d%","d100");
						console.debug(`ROLL-TABLE: USING FORMULA: ${formula}`);
					}
					// e.g. 1d20  or d12 + d8
				} else {
					// check for a number, or a range of numbers
					const numbers = cell1.match(/\d+/g);
					if (!numbers || numbers.length == 0 || numbers.length > 2) {
						valid = false;
						break;
					}
					let details = rownode.cells[datacolumn].innerHTML.replace(details1_regexp,'$1').replace(details2_regexp,'$1').replace(dice_regexp,'[[$1]]');
					
					let pos;
					if (numbers.length == 1) {
						// single number
						const num = +numbers[0];
						setLimit(num);
						rolltable.push({range: [num, num], type: CONST.TABLE_RESULT_TYPES.TEXT, text: details});
					} else if ((pos = cell1.indexOf('-')) > 0) {
						const low = parseInt(cell1.slice(0,pos));
						const high= parseInt00(cell1.slice(pos+1));
						setLimit(low);
						setLimit(high);
						rolltable.push({range: [low, high], type: CONST.TABLE_RESULT_TYPES.TEXT, text: details});
						// valid
					} else if ((pos = cell1.indexOf(',')) > 0) {
						const low = parseInt(cell1.slice(0,pos));
						const high= parseInt00(cell1.slice(pos+1));
						setLimit(low);
						setLimit(high);
						if (low+1 == high)
							// consecutive numbers, so one entry
							rolltable.push({range: [low, high], type: CONST.TABLE_RESULT_TYPES.TEXT, text: details});
						else {
							// not consecutive numbers, so create two entries
							rolltable.push({range: [low,  low],  type: CONST.TABLE_RESULT_TYPES.TEXT, text: details});
							rolltable.push({range: [high, high], type: CONST.TABLE_RESULT_TYPES.TEXT, text: details});
						}
						// valid
					} else {
						// not valid
						valid = false;
						break;
					}
				}
			}
			if (!valid) continue;
			// create row table
				
			// BaseTableResult =
			// type  : 0   (0 = text, 1=)
			// text  : string
			// img   : string
			// weight: 1
			// range : [ low, high ]
			// drawn : boolean
			let name = this.title_of_topic.get(topic.getAttribute("topic_id"));
			console.debug(`Creating a RollTable with ${rolltable.length} rows for '${name}'`);
			name += " : " + (tablenode.caption ? tablenode.caption.captiontext : section_name);
			let tabledata = {
				name:        name,
				//img:         string,
				//description: "Imported from Realm Works",  // This appears on every roll in the chat!
				results:     rolltable,	// Collection.<BaseTableResult>
				formula:     formula ? formula : (min == 1) ? `1d${max}` : `1d${max-min+1}+${min-1}`,
				replacement: true,
				displayRoll: true,
				folder:      this.rolltable_folder?.id,
				//sort: number,
				ownership: getOwnership(is_revealed),
				flags: { [GS_MODULE_NAME] : { [GS_FLAGS_UUID] : uuid }},
			};
				
			let table;
			if (this.overwriteExisting) {
				let existing = game.tables.find(t => t.getFlag(GS_MODULE_NAME,GS_FLAGS_UUID) === uuid && t.name === tabledata.name);
				if (existing) {
					// Delete all the old results (even using await e.delete() doesn't get them removed immediately)
					for (let e of existing.results) await e.delete();
					table = await existing.update(tabledata)
						.catch(e => console.warn(`Failed to update roll table '${existing.name}' due to ${e}`));
				}
			}
			if (!table) {
				table = await RollTable.create(tabledata).catch(e => console.warn(`Failed to create roll table '${tabledata.name}' due to ${e}`));
			}
			// Add the new table to the HTML to be returned
			result += hpara(`@RollTable[${table.id}]{${table.name}}`);
		}
		
		return result;
	}
	
	//
	// Write one RW section
	//
	async writeSection(topic, section, numbering, section_context) {

		// Write a "contents" element:
		let pages=[];
		const section_name = section.getAttribute('name') ?? this.structure.partitions.get(section.getAttribute('partition_id'));
		
		let functhis = this;

		// Put section header in, based on whether any children are revealed
		// must be done in order, due to section_context getting modified as we go along.
		let result = simplesection(section_context, hasRevealed(section), header(numbering.length, (this.section_numbering ? (numbering.join('.') + '. ') : "") + section_name));
		
		// Process all the snippets and sections in order
		// Process all child (not descendent) nodes in this section
		for (const child of section.children) {
			if (child.nodeName === 'snippet') {
				const is_revealed = child.hasAttribute('is_revealed');

				// Collect all the information from the snippet
				const sntype     = child.getAttribute('type');
				const style      = child.getAttribute('style');
				const contents   = getChild(child, 'contents');
				const gmdir      = getChild(child, 'gm_directions');
				const links      = child.getElementsByTagName('link');
				const label      = child.getAttribute('label') ?? this.structure.facets.get(child.getAttribute('facet_id'));
				const veracity   = child.getAttribute('veracity');
				let   annotation = getChild(child, 'annotation');
				if (annotation) annotation = this.replaceLinks(annotation.textContent, links);
				
				let need_close_section = false;				
				function sectionHeader(normalheader) {
					if (normalheader) {
						let classes=[];
						if (gmdir)        classes.push("RWgmDirAndContents");
						if (veracity)     classes.push(`RWveracity-${veracity}`);
						if (style)        classes.push(`RW${style}`);
						if (!is_revealed) classes.push("secret");
						result += startSection(section_context, classes.join(' '));
						need_close_section = gmdir;
					} else if (gmdir) result += endSection(section_context);
					
					if (gmdir) {
						// This is always a separate section - since it needs a box to be drawn around it.
						let gmbody = simplifyPara(functhis.replaceLinks(gmdir.textContent, links, /*direction*/ "1"));
						/* Our CSS requires both RWgmDirections and secret to be specified for the same section */
						result += `<section class="RWgmDirections secret">${gmbody}</section>`;
					}
				}
				
				switch (sntype) {
				case "Multi_Line":
					sectionHeader(contents);
					if (contents) {
						let text = this.replaceLinks(contents.textContent, links);
						result += simplifyPara(text);
						// Create a RollTable for each relevant HTML table, and append journal links to the HTML output.
						result += await this.createTable(topic, section_name, text, topic.getAttribute('is_revealed') && is_revealed);
					}
					break;
				case "Labeled_Text":
					sectionHeader(contents);
					if (contents) {
						// contents child (it will already be in encoded-HTML)
						result += labelledField(label, stripPara(simplifyPara(this.replaceLinks(contents.textContent, links))), annotation);
					}
					break;
				case "Numeric":
					sectionHeader(contents);
					if (contents) {
						// contents will hold just a number
						result += labelledField(label, this.replaceLinks(contents.textContent, links), annotation);
					}
					break;
				case "Tag_Standard":
					// <tag_assign tag_name="Manufacturing" domain_name="Commerce Activity" type="Indirect" />
					let tags = [];
					for (const snip of child.children) {
						if (snip.nodeName === 'tag_assign') {
							let tag = this.structure.tags.get(snip.getAttribute('tag_id'));
							if (tag) tags.push(tag);
						}
					}
					let dotags = tags.length > 0;
					sectionHeader(dotags);
					if (dotags) {
						result += labelledField(label, tags.join(', '), annotation);
					}
					break;
					
				case "Tag_Multi_Domain":
					let tagmulti = [];
					for (const snip of child.children) {
						if (snip.nodeName === "tag_assign") {
							if (snip.hasAttribute('tag_name')) {
								// RWoutput has domain_name & tag_name on the tag_assign element
								tagmulti.push(snip.getAttribute('domain_name') + ': ' + snip.getAttribute('tag_name'));
							} else if (snip.hasAttribute('tag_id')) {
								// RWexport has tag_id on the tag_assign element
								// The domain has to be determined from the structure
								let tagid = snip.getAttribute('tag_id');
								tagmulti.push(this.structure.domain_of_tag.get(tagid) + ': ' + this.structure.tags.get(tagid));
							}
						}
					}
					let domultitag = tagmulti.length > 0;
					sectionHeader(domultitag);
					if (domultitag) {
						result += labelledField(label, tagmulti.join('; '), annotation);
					}
					break;
					
				case "Date_Game":
					let dategame = getChild(child, 'game_date');
					sectionHeader(dategame);
					if (dategame) {
						result += labelledField(label, dategame.getAttribute("gregorian"), annotation);
					}
					break;
				case "Date_Range":
					let daterange = getChild(child, 'date_range');
					sectionHeader(daterange);
					if (daterange) {
						result += labelledField(label, `${daterange.getAttribute("gregorian_start")} to ${daterange.getAttribute("gregorian_end")}`, annotation);
					}
					break;
				case "Portfolio":
					// <ext_object ...>
					// <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					// <contents>
					let portasset = getChild(getChild(child, 'ext_object'), 'asset');
					const portfolio = getChild(portasset, 'contents');    // <contents>
					sectionHeader(portfolio);
					if (portfolio) {
						// for test purposes, extract all .por files!
						// await this.uploadFile(portasset.getAttribute('filename'), portfolio.textContent);
						let first=true;
						for (const [charname, character] of this.readPortfolio(portfolio.textContent)) {
							if (first) { result += '<hr>'; first=false }
							result += header(numbering.length+1, character.name);
							let str = Utf8ArrayToStr(character[this.por_html]);
							if (this.por_html==="text")
								// text needs to be put inside a pre-formatted block
								result += "<pre>" + str + "</pre>";
							else
								result += str;
						}
					}
					break;
				case "Picture":
				case "PDF":
				case "Audio":
				case "Video":
				case "Statblock":
				case "Foreign":
				case "Rich_Text":
					// <ext_object name="Portrait" type="Picture">
					// <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					// <contents>
					const bin_ext_object = getChild(child,          'ext_object');  
					const bin_asset      = getChild(bin_ext_object, 'asset');       
					const bin_contents   = getChild(bin_asset,      'contents');    
					sectionHeader(bin_contents);
					if (bin_contents) {
						result += header(numbering.length+1, bin_ext_object.getAttribute('name'));
						const bin_filename = bin_asset.getAttribute('filename');
						const fileext = bin_filename.split('.').pop();	// extra suffix from asset filename
						if (fileext === 'html' || fileext === 'htm' || fileext === "rtf") {
							// Put the HTML/RTF inline
							result += atob(bin_contents.textContent);
						} else if (sntype === "Picture") {
							// Add <img> tag for the picture
							await this.uploadFile(bin_filename, bin_contents.textContent);
							result += hpara(`<img src='${this.imageFilename(bin_filename)}'></img>`);
							pages.push({
								type: "image",
								name: bin_ext_object.getAttribute('name'),
								src: this.imageFilename(bin_filename),
								image: { caption: annotation ? stripHtml(annotation) : undefined }
							});
						} else {
							// Add <a> reference to the external object
							await this.uploadFile(bin_filename, bin_contents.textContent);
							result += hpara(`<a href='${this.imageFilename(bin_filename)}'></a>`);

							if (sntype === 'PDF' || (sntype === 'Video' && CONST.VIDEO_FILE_EXTENSIONS[fileext])) {
								// No place to put annotation.
								// For video, supported formats are .webm, .mp4, and .m4v
								pages.push({
									type: sntype.toLowerCase(),
									name: bin_ext_object.getAttribute('name'),
									src: this.imageFilename(bin_filename)
								})
							}
						}
					}
					break;
				case "Smart_Image":
					//<snippet facet_name="Map" type="Smart_Image" search_text="">
					//  <smart_image name="Map">
					//    <asset filename="n5uvmpam.eb4.png">
					//      <contents>
					//	  <map_pin pin_name="Deneb Sector" topic_id="Topic_392" x="330" y="239">	-- topic_id is optional
					//		<description>Nieklsdia (Zhodani)</description> -- could be empty
					
					// These need to be created as Scenes (and linked from the original topic?)
					const smart_image  = getChild(child,       'smart_image');
					const map_asset    = getChild(smart_image, 'asset'); 	    // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const map_contents = getChild(map_asset,   'contents');  	// <contents>
					const map_filename = map_asset?.getAttribute('filename');
					const map_format   = map_filename?.split('.').pop();	// extra suffix from asset filename
					sectionHeader(map_format && map_contents);
					if (map_format && map_contents) {
						result += header(numbering.length+1, smart_image.getAttribute('name'));
						await this.uploadFile(map_filename, map_contents.textContent);
						result += hpara(`<img src='${this.imageFilename(map_filename)}'></img>`);

						// Create the scene now
						await this.createScene(topic, smart_image, topic.getAttribute('is_revealed') && is_revealed)
							.then(sceneid => result += hpara(`@Scene[${sceneid}]{${smart_image.getAttribute('name')}}`))
							.catch(e => console.warn(`Failed to create scene for ${topic.getAttribute("topic_id")} due to ${e}`));
					}
					break;
				case "tag_assign":
					// Nothing to done for these
					break;
				default:
					console.warn(`Unsupported snippet type: ${sntype}`);
				} // switch sntype

				if (need_close_section) {
					// RWgmDirAndContents always has to be closed immediately
					result += endSection(section_context);
				}
			}
		} // for children
		
		// We can now add any sub-sections.		
		let subsection_count = 0;
		for (const child of section.children) {
			if (child.nodeName === 'section') {
				// Subsections increase the HEADING number,
				// but need to be buffered and put into the output AFTER the rest of the contents for this section.
				let subsection = await this.writeSection(topic, child, numbering.concat(++subsection_count), section_context);
				pages.push(...subsection.pages);
				result += subsection.html;
			}
		}

		return { html: result, pages: pages };
	}

	addDescendents(depth, top_id, only_revealed) {
		// It will create EITHER a list of all the revealed children,
		// OR all the not-revealed children.
		
		if (depth < 1 || !this.child_map.has(top_id)) return "";
		let result = "";
		for (const child_id of this.child_map.get(top_id)) {
			if (only_revealed && !this.revealed_topics.has(child_id)) continue;
			result += '<li>' + this.formatLink(child_id, null) + this.addDescendents(depth-1, child_id, only_revealed) + '</li>';
		}
		return (result.length > 0) ? `<ul>${result}</ul>` : "";
	}

	//
	// Return true if the snippet/map_pin which contains the given link is revealed
	linkIsRevealed(node) {
		while (node && node.nodeName !== 'snippet' && node.nodeName !== 'map_pin') node = node.parentNode;
		return node && node.getAttribute("is_revealed");
	}
	
	//
	// Write one RW topic
	// @return {html,img}
	//
	async formatTopicBody(topic) {
		let pages=[];
		const topic_id = topic.getAttribute('topic_id');
		console.debug(`formatTopicBody('${this.title_of_topic.get(topic_id)}')`);

		// Start the HTML with the category of the topic
		let html = labelledField("Category", this.category_of_topic.get(topic_id));

		let section_context = {
			ignore_secret : !this.unrevealed_topics_secret && !topic.getAttribute('is_revealed')
		};
		
		// Put PARENT information into the topic (if required)
		const parent_id = this.parent_map.get(topic_id);
		if (parent_id) {
			html += simplesection(section_context, this.revealed_topics.has(parent_id), labelledField(this.governing_content_label, this.formatLink(parent_id, null)));
		}

		// Generate the HTML for the sections within the topic
		let revealed_connections = [];
		let connections = [];
		let sectionnum = 0;
		for (const node of topic.children) {
			switch (node.nodeName) {
			case 'alias':
				// These come first
				let alias;
				if (node.getAttribute('is_true_name') === 'true')
					alias = `<p style="text-decoration: underline">${hemphasis(hlabel("True Name") + node.getAttribute('name'))}</p>`;
				else
					alias = `<p>${hemphasis(hlabel("Alias") + node.getAttribute('name'))}</p>`;
				html += simplesection(section_context, node.hasAttribute('is_revealed'), alias);
				break;
			case 'section':
				// Always process sections, to properly process revealed status
				let sections = await this.writeSection(topic, node, [++sectionnum], section_context);
				html += sections.html;
				pages.push(...sections.pages);
				break;
			case 'topicchild':
			case 'topic':
				// N.B. topicchild elements are added when parsing a LARGE file
				// The Governed Content will be done after processing all the children
				break;
			case 'linkage':
				// linkage is only in RWoutput
				break;
			case 'connection':	// relationships
				// RWoutput: <connection target_id="Topic_2" target_name="Child Feat 1" nature="Master_To_Minion" qualifier="Owner / Subsidiary"/>
				// RWexport: <connection target_id="Topic_2" nature="Minion_To_Master" qualifier_tag_id="Tag_211" qualifier="Parent / Child" original_uuid="F2E39CB6-7490-553E-40F0-68935B3A6BA9" signature="517108"/>
				let target_id = node.getAttribute('target_id');
				let cname = this.connectionname_of_topic.get(target_id);
				if (cname) {
					let nature    = node.getAttribute('nature');
					let qualifier = node.getAttribute('qualifier');
					let attitude  = node.getAttribute('attitude')
					let rating    = node.getAttribute('rating');
					let annotation = getChild(node, 'annotation');

					let text = RealmWorksImporter.ConnectionName[nature];
					
					// Either a qualifier or an attitude or a rating will be displayed
					if (qualifier) {
						// Reduce master/minion qualifier to the relevant half of the qualifier.
						if (nature == "Master_To_Minion") {
							let quals = qualifier.split(' / ');
							if (quals.length > 1) qualifier = quals[0];
						} else if (nature == "Minion_To_Master") {
							let quals = qualifier.split(' / ');
							if (quals.length > 1) qualifier = quals[1];
						}
						text += hqualifier(qualifier);
					} else if (attitude)
						text += hqualifier(attitude);
					else if (rating)  // rating is a number, attitude is the string for the rating
						text += hqualifier(rating);
					
					text += ': ' + this.formatLink(target_id, cname);
					
					// No links possible in the annotation of a relationship, but can be multi-line.
					// Multi-line annotation merely has &#xd; and a newline not HTML markup for line breaks.
					// This is specific to connections; not annotations on other snippet types.
					if (annotation) text += '<br\>' + hemphasis(annotation.textContent.replaceAll('&#xd;\n','<br\>'));
					
					connections.push({cname, text});
					if (!section_context.ignore_secret && node.hasAttribute('is_revealed') && this.revealed_topics.has(target_id))
						revealed_connections.push({cname, text});
				}
				break;
			}
		}
		
		// Add the (revealed) CONNECTIONS (prefix/suffix are APPENDED)
		if (connections.length > 0) {
			html += simplesection(section_context, revealed_connections.length, header(1,'Relationships'));
			
			if (revealed_connections.length > 0) {
				let content = "";
				for (const connection of revealed_connections.sort((p1,p2) => p1.cname.localeCompare(p2.cname, undefined, {numeric: true}))) {
					content += '<li>' + connection.text + '</li>';
				}
				html += simplesection(section_context, true, `<ul>${content}</ul>`);
			}
			
			if (connections.length > revealed_connections.length) {
				let content = "";
				for (const connection of connections.sort((p1,p2) => p1.cname.localeCompare(p2.cname, undefined, {numeric: true}))) {
					content += '<li>' + connection.text + '</li>';
				}
				html += simplesection(section_context, false, `<ul>${content}</ul>`);
			}
		}
		
		// New we do the CONTENT LINKS (prefix/suffix are APPENDED)
		// Add the optional INBOUND and/or OUTBOUND links
		let functhis = this;
		function contentlinks(dir, links, revealed_links) {
			let all_links = links.sort( (p1,p2) => {
				return p1.name ? (p2.name ? p1.name.localeCompare(p2.name, undefined, {numeric: true}) : -1) : p2.name ? 1 : 0;
			}).map(ref => { return functhis.formatLink(ref.topic_id, ref.name); }).join(' ');
			
			let rev_links = revealed_links.sort( (p1,p2) => {
				return p1.name ? (p2.name ? p1.name.localeCompare(p2.name, undefined, {numeric: true}) : -1) : p2.name ? 1 : 0;
			}).map(ref => { return functhis.formatLink(ref.topic_id, ref.name); }).join(' ');
			
			let result = simplesection(section_context, revealed_links.length, header(1,`Content Links: ${dir}`));
			
			if (revealed_links.length > 0)
				result += simplesection(section_context, true, `<p>${rev_links}</p>`);
			
			if (links.length > revealed_links.length)
				result += simplesection(section_context, false, `<p>${all_links}</p>`);

			return result;
		}
			
		if (this.addInboundLinks) {
			const targets = this.links_in.get(topic_id);
			if (targets) {
				let unique_ids = new Set();
				let revealed_unique_ids = new Set();
				for (const target_id of targets) {
					if (target_id.startsWith('Plot_')) continue;
					unique_ids.add(target_id);
					if (!section_context.ignore_secret && this.revealed_topics.has(target_id))
						revealed_unique_ids.add(target_id);
				}
				if (unique_ids.size > 0) html += contentlinks('In',
					[...unique_ids].map(target_id => { return {topic_id: target_id, name: this.connectionname_of_topic.get(target_id)}} ),
					[...revealed_unique_ids].map(target_id => { return {topic_id: target_id, name: this.connectionname_of_topic.get(target_id)}} ));
			}
		}
		if (this.addOutboundLinks) {
			const links = topic.getElementsByTagName('link');
			if (links && links.length > 0)
			{
				let unique_ids = new Set();
				let revealed_unique_ids = new Set();
				for (const link of links) {
					let target_id = link.getAttribute("target_id");
					if (target_id.startsWith('Plot_')) continue;
					unique_ids.add(target_id);
					if (!section_context.ignore_secret && this.revealed_topics.has(target_id) && this.linkIsRevealed(link))
						revealed_unique_ids.add(target_id);
				}
				if (unique_ids.size > 0) html += contentlinks('Out',
					[...unique_ids].map(target_id => { return {topic_id: target_id, name: this.connectionname_of_topic.get(target_id)}} ),
					[...revealed_unique_ids].map(target_id => { return {topic_id: target_id, name: this.connectionname_of_topic.get(target_id)}} ) );
			}
		}

		// Now we do the GOVERNED CONTENT,
		// but we are formatting the topics as per the RW navigation pane, NOT the "Governed Content" summary panel
		if (this.governed_max_depth > 0 && this.child_map.has(topic_id)) {
			// These need to be in a sorted order
			let revealed_gov_content = this.addDescendents(this.governed_max_depth, topic_id, true);
			let hidden_gov_content   = this.addDescendents(this.governed_max_depth, topic_id, false);

			let result = simplesection(section_context, revealed_gov_content.length, header(1, 'Governed Content'));
			if (revealed_gov_content.length > 0)
				result += simplesection(section_context, true, revealed_gov_content);
			if (hidden_gov_content.length > revealed_gov_content.length)
				result += simplesection(section_context, false, hidden_gov_content);
			
			html += result;
		}
		
		html += endSection(section_context);
		return { html, pages };
	}

	//
	// Write one RW topic
	//
	async createTopic(topic) {
		const topic_id  = topic.getAttribute('topic_id');
		console.debug(`createTopic('${this.title_of_topic.get(topic_id)}')`);

		let topic_document = this.document_for_topic.get(topic_id);
		let body = await this.formatTopicBody(topic);
		let topicdata = {
			_id:      topic_document._id,
			//name:     this.title_of_topic.get(topic_id),  -- already set correctly during initial creation
			topic_id: topic_id,
			uuid:     topic.getAttribute("original_uuid"),
			pages:    body.pages,
			ownership: getOwnership(this.revealed_topics.has(topic_id))
		};
		if (body.html) {
			// First page is the main topic's content
			topicdata.pages.unshift({
				name: topic_document.name,
				type: "text",
				text: {
					format  : 1,
					content : body.html
				},
			});
		}
		// Ensure pages remain in the correct order
		let sort=0;
		const SIZE_MOD=100000;
		for (let i = 0; i<body.pages.length; i++) {
			body.pages[i].sort = sort;
			sort += SIZE_MOD;
		}
	
		// Finally send the update to Foundry
		await topic_document.update(topicdata)
			.catch(e => console.warn(`JournalEntry.update() failed for '${topic_node.getAttribute("public_name")}':\n${e}`));
	}

	//
	// Create an Item
	//
	async createItem(topic) {
		const topic_id  = topic.getAttribute('topic_id');
		console.debug(`createItem('${this.title_of_topic.get(topic_id)}')`);

		let topic_name = topic.getAttribute('public_name');
		let category = this.category_of_topic.get(topic_id);
		
		let topic_document = this.document_for_topic.get(topic_id);
		if (!topic_document) {
			console.error(`document_for_topic does not have ${topic_id} for '${this.title_of_topic.get(topic_id)}'`);
			throw(`document_for_topic does not have ${topic_id}`);
		}
		
		let content  = await this.formatTopicBody(topic);
		let itemdata = {
			_id:  topic_document._id,
			system: await this.item_data_func(this.structure, topic, topic_document.type, content.html, category),
			img: firstImage(content.pages),
			ownership: getOwnership(this.revealed_topics.has(topic_id)),
		}

		// Return the promise from the update, so we don't need an await here
		return topic_document.update(itemdata);
	}
	
	// Examine each topic within topics to see if it should be converted into an actor:
	// i.e. it contains a Portfolio or Statblock snippet type directly, not in a child topic.
	getActorSnippets(node, onlyone=false) {
		let snippets=[];
		for (const child of node.children) {
			if (child.nodeName === 'snippet' && 
				(child.getAttribute('type') === 'Portfolio' || 
				 child.getAttribute('type') === 'Statblock')) {
				snippets.push(child);
				if (onlyone) break;
			} else if (child.children.length > 0 && child.nodeName !== 'topic' && child.nodeName !== 'topicchild') {
				// Don't check nested topics
				let result = this.getActorSnippets(child);
				if (result.length > 0) {
					snippets.push(...result);
					if (onlyone) break;
				}
			}
		}
		return snippets;
	}
	
	getActorTopics(topics) {
		// This should return an HTMLCollection
		let result = [];
		for (const topic of topics) {
			if (this.getActorSnippets(topic,/*onlyone*/true).length > 0) {
				result.push(topic);
			}
		}
		return result;
	}

	//
	// Convert a TOPIC into one or more Actors
	// @return an array containing 0 or more ActorData
	//
	async formatActors(topic) {
		console.debug(`Formatting actor for topic '${this.title_of_topic.get(topic.getAttribute("topic_id"))}'`);
		let result = [];
		const topicname = topic.getAttribute('public_name');
		const uuid = topic.getAttribute("original_uuid");
		const topic_is_revealed = topic.getAttribute('is_revealed');
		
		// Since we can't "update" actors in a safe way, always delete if required.
		if (this.overwriteExisting) {
			for (let actor of game.actors.filter(a => a.getFlag(GS_MODULE_NAME,GS_FLAGS_UUID) === uuid))
			{
				await actor.delete();
			}
		}

		for (const snippet of this.getActorSnippets(topic)) {
			if (!snippet) {
				console.warn(`formatActors for '${topicname}':\n <snippet type=Portfolio|Statblock> is missing - Skipping`);
				continue;
			}

			const sntype = snippet.getAttribute('type');
			const is_revealed = topic_is_revealed && snippet.hasAttribute('is_revealed');
			const ext_object = getChild(snippet, 'ext_object'); // <ext_object name="Portrait" type="Picture">
			if (!ext_object) {
				console.warn(`formatActors for '${topicname}':\n no <ext_object> for ${sntype} - Skipping`);
				continue;
			}
			const asset = getChild(ext_object, 'asset'); // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
			if (!asset) {
				console.warn(`formatActors for '${topicname}':\n no <asset> for ${sntype} with ${ext_object.getAttribute('type')} of ${ext_object.getAttribute('name')} - Skipping`);
				continue;
			}
			const contents = getChild(asset, 'contents'); // <contents>
			if (!contents) {
				console.warn(`formatActors for '${topicname}':\n no <contents> for ${sntype} with ${ext_object.getAttribute('type')} of ${ext_object.getAttribute('name')} - Skipping`);
				continue;
			}
			const filename = asset.getAttribute('filename');

			let statblock;
			let portfolio;
			if (sntype === 'Portfolio') {
				if (!filename.endsWith('.por')) {
					console.warn(`formatActors for '${topicname}':\n Portfolio file '${filename}' does not end with .por - Skipping`);
					continue;
				}
				//console.debug(`Reading portfolio ${filename}`);
				//portfolio = this.readPortfolio(contents.textContent);
				// Upload images (if any)
				portfolio = this.readPortfolio(contents.textContent);
				for (const [charname, character]of portfolio) {
					if (character.imgfilename) {
						await this.uploadBinaryFile(character.imgfilename, character.imgdata);
					}
				}
			} else { // (sntype === 'Statblock')
				if (!filename.endsWith('.html') && !filename.endsWith('.htm') && !filename.endsWith('.rtf') && !filename.endsWith('.txt')) {
					console.warn(`formatActors for '${topicname}':\n Statblock file '${filename}' does not end with .htm or .html or .rtf or .txt - Skipping`);
					continue;
				}
				//console.debug(`formatActors for '${topicname}': reading statblock from ${filename}`);
				statblock = atob(contents.textContent);
			}
			
			// Call the ACTOR creator for the specific GAME SYSTEM that is installed
			//console.debug(`ACTOR ${topic.getAttribute('public_name')} = HTML '${html}'`);
			if (!this.parser)
				this.parser = new DOMParser();

			if (portfolio) {
				if (this.create_actor_data) {
					for (const [charname, character] of portfolio) {
						// The lack of XML will be because this is a MINION of another character.
						if (character.xml) {
							const json = RealmWorksImporter.xmlToObject(this.parser.parseFromString(Utf8ArrayToStr(character.xml), "text/xml"));
							await this.create_actor_data(json.document.public.character)
							.then(async (actorlist) => {
								for (let actor of actorlist) {
									// actor really is the full Actor, not just ActorData
									// Cater for MINIONS
									let port = portfolio.get(actor.name);
									actor.token = {
										disposition: actor.relationship === 'ally'  ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : 
													 actor.relationship === 'enemy' ? CONST.TOKEN_DISPOSITIONS.HOSTILE  : CONST.TOKEN_DISPOSITIONS.NEUTRAL
									};
									let extradata = await this.actor_data_func(Utf8ArrayToStr(port[this.por_html]));
									actor.system = foundry.utils.mergeObject(actor.system, extradata);
									if (extradata.items) actor.items.push(...extradata.items);
									if (port?.imgfilename)
										actor.img = this.imageFilename(port.imgfilename);
									actor.ownership = getOwnership(is_revealed);
									actor.flags = { [GS_MODULE_NAME] : { [GS_FLAGS_UUID] : uuid } };
									result.push(actor);
								}
							})
							.catch(e => console.warn(`createActorData for '${character.name}' in '${topicname}':\nFailed in ${filename} due to ${e}`));
						}
					}
				} else {
					// All other game systems use this.actor_data_func to create the correct basic data block
					for (const [charname, character] of portfolio) {
						let actor = {
							name: character.name,
							type: this.actor_type,
							system: await this.actor_data_func(Utf8ArrayToStr(character[this.por_html])),
							flags: { [GS_MODULE_NAME] : { [GS_FLAGS_UUID] : uuid } },
							ownership: getOwnership(is_revealed),
						};
						if (actor.system.items) actor.items = actor.system.items;
						if (character.imgfilename)
							actor.img = this.imageFilename(character.imgfilename)
						result.push(actor);
					}
				}
			} else {
				// No portfolio file available for decoding, so simply store the STATBLOCK in the relevant location on the Actor
				let name = ext_object.getAttribute('name');
				const annotation = getChild(snippet, 'annotation');
				if (annotation) name += ':' + stripHtml(annotation.textContent);
				let actor = {
					name: name,
					type: this.actor_type,
					system: await this.actor_data_func(statblock),
					flags: { [GS_MODULE_NAME]: { [GS_FLAGS_UUID] : uuid }},
					ownership: getOwnership(is_revealed),
				};
				if (actor.system.items) actor.items = actor.system.items;
				result.push(actor);
			}
		}
		// If there is only more than one actor in the topic,
		// or the name of the actor does NOT match the name of the topic,
		// then put the actors in a sub-folder named after the topic.
		if (result.length === 0) return result;
		let topic_name = topic.getAttribute('public_name');
		let folderid = (result.length === 1 && result[0].name === topic_name) ? this.actor_folder.id : (await this.getFolder(topic_name, 'Actor', this.actor_folder.id)).id;

		// Set the folder for each actor.
		for (let i=0; i<result.length; i++)
			result[i].folder = folderid;
		//console.debug(`Actor data for ${actor.name} in folder ${actor.folder}`);
		
		return result;
	}
	
	//
	// Create a PLAYLIST for each topic, containing all AUDIO snippets from that topic.
	// (playlists do not have visibility permissions)
	//
	
	async createPlaylists(topics) {
		// Find all Audio snippets
		function getSoundSnippets(node) {
			let snippets = [];
			for (const child of node.children) {
				if (child.nodeName === 'snippet' && child.getAttribute('type') === 'Audio') {
					snippets.push(child);
				} else if (child.nodeName !== 'topic' && child.nodeName !== 'topicchild' && child.children.length > 0) {
					// Don't check nested topics
					snippets.push(...getSoundSnippets(child));
				}
			}
			return snippets;
		}

		// Write out sounds that we find, as a playlist named after the topic.
		for (const topic of topics) {
			// If only creating from NEW topics, the ignore existing topics
			if (this.importOnlyNew && this.existing_docs.has(topic.getAttribute("original_uuid"))) continue;

			const snippets = getSoundSnippets(topic);
			if (snippets.length === 0) continue;

			let uuid = topic.getAttribute("original_uuid");

			let playlist = {
				name: topic.getAttribute('public_name'),
				description: "",
				//	"mode": 0,
				//	"playing": false,
				//	"sort": 0,
				//	"seed": 840,
				sounds: [],
				folder: this.playlist_folder?.id,
				flags: { [GS_MODULE_NAME] : { [GS_FLAGS_UUID] : uuid } },
			};
			
			// Sound file has already been uploaded
			for (const snippet of snippets) {
				const ext_object = getChild(snippet,    'ext_object'); 
				const asset      = getChild(ext_object, 'asset');
				const filename = asset?.getAttribute('filename');
				if (!getChild(asset, 'contents')) continue;		// No contents means no file!
				// ext_object.getAttribute('type') === 'Audio'
				
				let name = ext_object.getAttribute('name');
				if (name === 'Audio File') {
					// The default name is boring, find a better one
					let last = filename.lastIndexOf('.');
					name = (last > 0) ? filename.slice(0,last) : filename;
				}
				
				let sound = {
					name: name,
					path: this.imageFilename(filename),		// including path
					description: "",
					//	"playing": false,
					//	"pausedTime": null,
					//	"repeat": false,
					//	"volume": 0.5,
					//	"flags": {},
				};
				
				const annotation = getChild(snippet, 'annotation');
				if (annotation) sound.description = stripHtml(annotation.textContent);
				
				playlist.sounds.push(sound);
			}
			if (this.overwriteExisting) {
				let existing = game.playlists.find(p => p.getFlag(GS_MODULE_NAME,GS_FLAGS_UUID) === uuid);
				if (existing) {
					await existing.update(playlist)
						.then(p => console.debug(`Updated existing Playlist ${p.id}`))
						.catch(e => console.warn(`Failed to update playlist '${name}' due to ${e}`));
					continue;
				}
			}
			await Playlist.create(playlist)
				.catch(e => console.warn(`Failed to create playlist '${name}' due to ${e}`));
		}
	}
	
	//
	// Read a HeroLab portfolio file and create Actors directly from the contents
	//
	async parseHL(file)
	{
		let data = await file.arrayBuffer();
		if (!data) throw "Failed to read .por file";
		
		if (this.init_actors) {
			await this.init_actors();
		}

		// Maybe delete old items
		if (this.deleteOldFolders) {
			// Delete folders with the given name.
			for (let folder of game.folders.filter(e => e.type === 'Actor' && e.name === this.folderName)) {
				await folder.delete({
					deleteSubfolders: true,
					deleteContents: true
				}).catch(`Failed to delete Actor folder ${this.folderName}`);
			}
		}

		let actor_folder_id = (await this.getFolder(this.folderName, 'Actor')).id;
		
		// Create the image folder if it doesn't already exist.
		await DirectoryPicker.verifyPath(DirectoryPicker.parse(this.asset_directory));

		if (!this.parser) this.parser = new DOMParser();
		const portfolio = this.readPortfolio(new Uint8Array(data));
		let actors = [];
		// Upload images (if any)
		for (const [charname, character] of portfolio) {
			if (this.create_actor_data) {
				// no XML means it is a MINION, and has been created from the XML of another character.
				if (character.xml) {
					const json = RealmWorksImporter.xmlToObject(this.parser.parseFromString(Utf8ArrayToStr(character.xml), "text/xml"));
					const actorlist = await this.create_actor_data(json.document.public.character);

					for (let actordata of actorlist) {
						// Minion will have ITS data in a different place in the portfolio.
						let port = portfolio.get(actordata.name);

						// Store the raw statblock (but don't overwrite the rest of data)
						actordata.system = foundry.utils.mergeObject(actordata.system, await this.actor_data_func(Utf8ArrayToStr(port[this.por_html])));
						actordata.token = {
							disposition: actordata.relationship === 'ally'  ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : 
										 actordata.relationship === 'enemy' ? CONST.TOKEN_DISPOSITIONS.HOSTILE  : CONST.TOKEN_DISPOSITIONS.NEUTRAL
						};
						actordata.folder = actor_folder_id;
						if (port.imgfilename) {
							// If we don't "await", then Actor.create will fail since the image doesn't exist
							await this.uploadBinaryFile(port.imgfilename, port.imgdata);
							actordata.img = this.imageFilename(port.imgfilename);
						}
						// Delete any existing actor with the same name
						//let existing = game.actors.contents.find(o => o.name === actordata.name);
						//if (existing) await existing.delete();
						actors.push(actordata);
					}
				}
			} else if (character[this.por_html]) {
				// Not supported for system-specific actor creation, so just put in the HTML
				let actordata = {
					name: character.name,
					type: this.actor_type,
					system: await this.actor_data_func(Utf8ArrayToStr(character[this.por_html])),
					folder: actor_folder_id,
				};
				if (actordata.system.items) actordata.items = actordata.system.items;
				if (character.imgfilename)
					actordata.img = this.imageFilename(character.imgfilename)
				//console.dir(actordata);
				actors.push(actordata);
			}
		}
		console.log(`Found ${actors.length} actors`);
		if (actors.length > 0) await Actor.create(actors)
			.then(async (new_actors) => { if (this.post_create_actors) await this.post_create_actors(new_actors) })
			.catch(e => console.warn(`Failed to create Actors due to ${e}`));

	}
	
	//
	// Parse the entire Realm Works file supplied in 'xmlString'
	// and extract each element into relevant areas of the world DB
	//
	async parseXML(topics)
	{
		// Collect information about the topics
		this.parent_map = new Map();
		this.child_map  = new Map();
		this.title_of_topic = new Map();
		this.connectionname_of_topic = new Map();
		this.revealed_topics = new Set();
		this.topic_item_type = new Map();		// [topic_id,Item#type]only contains topics which need to be created as items
		this.category_of_topic = new Map();
		for (const topic of topics) {
			let topic_id = topic.getAttribute('topic_id');
			this.title_of_topic.set(topic_id, this.journaltitle(topic));
			this.connectionname_of_topic.set(topic_id, this.journallinktitle(topic));
			if (topic.hasAttribute('is_revealed')) this.revealed_topics.add(topic_id);
			let found = [];
			for (const child of topic.getElementsByTagName('topicchild')) {
				const child_id = child.getAttribute('topic_id');
				this.parent_map.set(child_id, topic_id);
				found.push(child_id);
			}
			// Ensure entries inside child_map are in alphabetical order.
			if (found.length > 0) {
				found.sort( (p1,p2) => this.title_of_topic.get(p1).localeCompare(this.title_of_topic.get(p2), undefined, {numeric: true} ));
				this.child_map.set(topic_id, found);
			}
			// See if this topic should be created as an ITEM instead of a JOURNAL ENTRY
			let category_id   = topic.getAttribute('category_id');
			let category_name = this.structure.categories.get(category_id);
			this.category_of_topic.set(topic_id, category_name);
			if (this.structure.category_item_type.has(category_id))
				this.topic_item_type.set(topic_id, this.structure.category_item_type.get(category_id));
		}		
		
		// Maybe delete the old folders before creating a new one?
		if (this.deleteOldFolders) {
			// Delete folders with the given name.
			for (let folder of game.folders.filter(e => e.name === this.folderName)) {
				await folder.delete({
					deleteSubfolders: true,
					deleteContents: true
				}).catch(`Failed to delete folder ${this.folderName}`);
			}
		}

		// Create the folders now
		console.info('Creating folders');
		this.actor_folder     = await this.getFolder(this.folderName, 'Actor');
		this.scene_folder     = await this.getFolder(this.folderName, 'Scene');
		this.playlist_folder  = await this.getFolder(this.folderName, 'Playlist');
		this.rolltable_folder = await this.getFolder(this.folderName, 'RollTable');
		await DirectoryPicker.verifyPath(DirectoryPicker.parse(this.asset_directory));
		
		// Create a mapping to indicate which topics link INTO each topic
		if (this.addInboundLinks) {
			this.links_in = new Map();
			for (const child of topics) {
				const topic_id = child.getAttribute("topic_id");
				const links = child.getElementsByTagName('link');
				for (const link of links) {
					// All links
					const target_id = link.getAttribute('target_id');
					if (this.links_in.has(target_id))
						this.links_in.get(target_id).push(topic_id);
					else
						this.links_in.set(target_id, [topic_id]);
				}
			}
		}
		if (this.importOnlyNew || this.overwriteExisting) {
			this.existing_docs = new Map();
			for (const je of game.journal) {
				let uuid = je.getFlag(GS_MODULE_NAME, GS_FLAGS_UUID);
				if (uuid) this.existing_docs.set(uuid, je);
			}
			for (const item of game.items) {
				let uuid = item.getFlag(GS_MODULE_NAME, GS_FLAGS_UUID);
				if (uuid) this.existing_docs.set(uuid, item);
			}
			console.debug(`Found '${GS_FLAGS_UUID}' flag on ${this.existing_docs.size} journal entries/items`);
		}

		// Create FOLDERS for ITEMS and JOURNAL ENTRIES
		let journal_parent;
		let item_parent;
		let journal_folders = new Map();
		let item_folders    = new Map();
		for (const topic of topics) {
			// If the topic exists, then we don't need to worry about which folder it is in.
			if (this.overwriteExisting || this.importOnlyNew) {
				if (this.existing_docs.has(topic.getAttribute("original_uuid"))) continue;
			}
			// The topic doesn't already exist, so we need to ensure that the parent folder exists
			let category_id = topic.getAttribute('category_id');
			
			if (this.topic_item_type.has(topic.getAttribute('topic_id'))) {
				if (!item_folders.has(category_id)) {
					if (!item_parent) item_parent = (await this.getFolder(this.folderName, 'Item')).id;
					await this.getFolder(this.structure.categories.get(category_id), 'Item', item_parent)
					.then(f => item_folders.set(category_id, f.id));
				}
			} else {
				if (!journal_folders.has(category_id)) {
					if (!journal_parent) journal_parent = (await this.getFolder(this.folderName, 'JournalEntry')).id;
					await this.getFolder(this.structure.categories.get(category_id), 'JournalEntry', journal_parent)
					.then(f => journal_folders.set(category_id, f.id));
				}
			}
		}

		//
		// TOPICS => JOURNAL ENTRIES
		//
		// Generate empty topic entries first, so that we have Foundry id's for each topic.
		this.ui_message.val(`Creating ${topics.length} empty items and journal entries`);
		console.info(`Creating ${topics.length} empty items and journal entries`);
		
		this.document_for_topic = new Map();
		await Promise.allSettled(topics.map(async(topic) => {
			const topic_id = topic.getAttribute("topic_id");
			let uuid = topic.getAttribute("original_uuid");
			if (this.overwriteExisting || this.importOnlyNew) {
				if (this.existing_docs.has(uuid)) {
					// Return the existing topic
					return {
						topic_id: topic_id,
						topic: this.existing_docs.get(uuid),
					}
				}
			}
			let topic_doc;
			
			if (this.topic_item_type.has(topic_id)) {
				topic_doc = await Item.create({
					name:   this.title_of_topic.get(topic_id),
					type:   await this.get_item_type(this.structure, topic, this.topic_item_type.get(topic_id)),
					folder: item_folders.get(topic.getAttribute('category_id')),
					flags: { [GS_MODULE_NAME] : { [GS_FLAGS_UUID] : uuid }},
					system:   {},
				}).catch(e => console.error(`Failed to create ITEM '${this.title_of_topic.get(topic_id)}':\n${e}`));
			} else {
				topic_doc = await JournalEntry.create({
					name:   this.title_of_topic.get(topic_id),
					folder: journal_folders.get(topic.getAttribute('category_id')),
					flags: { [GS_MODULE_NAME] : { [GS_FLAGS_UUID] : uuid }},
				}).catch(e => console.error(`Failed to create JOURNAL ENTRY '${this.title_of_topic.get(topic_id)}':\n${e}`));
			}
			return { topic_id : topic_id, topic : topic_doc };
		}))
		// Now add all valid entries to document_for_topic synchronously
		.then(results => results.forEach(result => {
				if (result.status === 'fulfilled')
					this.document_for_topic.set(result.value.topic_id, result.value.topic);
				else
					console.warn(`Document creation failed due to ${result.reason}`);
			}));
		
		// Asynchronously generate each of the Journal Entries and Items
		this.ui_message.val(`Populating ${topics.length} items and journal entries`);
		console.info(`Populating ${topics.length} items and journal entries`);
		await Promise.allSettled(topics.map(async(topic) => {
			if (!(this.importOnlyNew && this.existing_docs.has(topic.getAttribute("original_uuid")))) {
				if (this.topic_item_type.has(topic.getAttribute('topic_id'))) {
					await this.createItem(topic)
					.catch(e => console.warn(`createItem failed for ${topic.getAttribute("public_name")}:\n${e}`))
				} else {
					await this.createTopic(topic)
					.catch(e => console.warn(`createTopic failed for ${topic.getAttribute("public_name")}:\n${e}`))
				}
			}
		}));
		
		//
		// HL PORTFOLIOS => ACTORS
		//

		if (this.init_actors) {
			await this.init_actors();
		}

		console.debug('Finding Topics with Actors');
		let actor_topics = this.getActorTopics(topics);
		this.ui_message.val(`Generating ${actor_topics.length} Actors`);
		console.info(`Generating actors from ${actor_topics.length} Topics`);

		// Asynchronously get the data for all the actors,
		// don't CREATE the Actors until we've had a chance to remove duplicates
		// TODO: if this.overwriteExisting, then how will post_create_actors work when the actor might already have lots of things added to it?
		await Promise.allSettled(actor_topics.map(async(topic_node) => {
			let uuid = topic_node.getAttribute("original_uuid");
			if (!(this.importOnlyNew && this.existing_docs.has(uuid)))
				await this.formatActors(topic_node)
				.then(async(actors) => {
					for (let actor of actors) actor.flags = { [GS_MODULE_NAME] : { [GS_FLAGS_UUID] : uuid }}
					
					await Actor.create(actors)
					.then( async(new_actors) => { 
						if (this.post_create_actors)
							await this.post_create_actors(new_actors)
					})
				})
				.catch(error => console.warn(`formatActors for topic '${topic_node.getAttribute("public_name")}': ${error}`))
		}))

		// AUDIO snippets => PLAYLISTS
		this.ui_message.val(`Generating playlists`);
		console.info(`Generating playlists`);
		await this.createPlaylists(topics);
		
		// Tidy up "this" - hopefully recovering some memory before the next run.
		delete this.child_map;
		delete this.parent_map;
		delete this.actor_folder;
		delete this.scene_folder;
		delete this.playlist_folder;
		delete this.rolltable_folder;
		delete this.document_for_topic;
		delete this.existing_docs;
		delete this.category_of_topic;
		if (this.addInboundLinks) delete this.links_in;
	}
} // class