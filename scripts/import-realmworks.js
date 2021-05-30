// Realm Works rwoutput file:
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
//                 +-- 
//         +-- tag_assign(x) (attrs: tag_name, domain_name)
//         +-- linkage(x) (attrs: target_id, target_name, direction[Inbound|Outbound|Both])

// Nested "section" elements increase the Hx number by one for the section heading.

// Links need to be @Compendium[entity-id]{label}
// or simply @Compendium[pack-name.entity-name]{label}

import UZIP from "./UZIP.js";
import { RWPF1Actor } from "./pf1-actor.js";

// Provide hook to put the button at the bottom of the COMPENDIUM panel in Foundry VTT
// Set up the user interface

Hooks.on("renderSidebarTab", async (app, html) => {
    if (app.options.id == "compendium") {
      let button = $("<button class='import-cd'><i class='fas fa-file-import'></i> Realm Works Import</button>")
      button.click(function () {
        new RealmWorksImporter().render(true);
      });
      
      html.find(".directory-footer").append(button);
    }
})


class RealmWorksImporter extends Application
{
	// entity_for_topic is a map: key = topic_id, value = JournalEntry
	
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

	// Foundry VTT listener for actions in the window.
	activateListeners(html) {
		super.activateListeners(html);
		html.find(".import-rwoutput").click(async ev => {
			this.journalCompendiumName = html.find('[name=journal-compendium]').val();
			this.actorCompendiumName = html.find('[name=actor-compendium]').val();
			this.folderName = html.find('[name=folder-name]').val();
			this.ui_message = html.find('[name=message-area]');
			this.addInboundLinks = html.find('[name=inboundLinks]').is(':checked');
			this.addOutboundLinks = html.find('[name=outboundLinks]').is(':checked');
			this.deleteCompendium = html.find('[name=deleteCompendium]').is(':checked');
			this.storeInCompendium = (this.folderName == 0);
			// Where image files should be stored...
			this.filedirectory = 'worlds/' + game.world.name + '/realmworksimport';		// no trailing "/"
			this.filesource = 'data';	// or 'core' or 's3'
			
			// Try to load the file
			let fileinput = html.find('[name=rwoutputFile]')?.[0];
			if (!fileinput?.files || fileinput.files.length == 0)
			{
				this.ui_message.val(`Please select a file.`);
				return;
			}
			let file = fileinput.files[0];
			
			this.ui_message.val(`Reading ${file.name}`);
			console.log(`Reading contents of ${file.name} (size ${file.size})`);
			
			// Javascript string has a maximum size of 512 MB, so can't pass the entire file to parseFromString,
			// so read chunks of the file and look for topics within the chunks.
			const chunkSize = 5000000;	// ~5 MB
			let buffer = "";
			let topic_start, topic_end;
			let topics = [];
			let parser = new DOMParser();
			let start = 0;
			let block, topic, blob;
			while (start < file.size) {
				// Read another chunk onto the end of the buffer.
				blob = await file.slice(start, start+chunkSize);
				if (blob.size == 0) break;
				start += blob.size;
				buffer += await blob.text();
				console.log(`Read ${blob.size} bytes from file (buffer size now ${buffer.length}`);
				// Read all complete topics which are in the buffer
				do {
					topic_end = buffer.indexOf('</topic>');
					if (topic_end > 0) {
						topic_start = buffer.lastIndexOf('<topic ', topic_end);
						if (topic_start >= 0) {
							//let docnode = parser.parseFromString('<?xml version="1.0" encoding="utf-8"?>' + buffer.slice(topic_start, topic_end+8), "text/xml");
							// parseFromString returns a #Document node as the top node.
							block = buffer.slice(topic_start, topic_end+8);
							try {
								topic = this.getChild(parser.parseFromString(block, "text/xml"), 'topic');
								if (topic) {
									topics.push(topic);
									// Ensure topics with " in the title don't cause problems
									buffer = buffer.slice(0,topic_start) + 
										`<topicchild topic_id="${topic.getAttribute('topic_id')}" public_name="${topic.getAttribute('public_name').replace(/"/g,'%22')}" />` + 
										buffer.slice(topic_end+8);
								} else {
									console.log(`Failed to decode topic in ${block}`);
									buffer = buffer.slice(0,topic_start) + buffer.slice(topic_end+8);
								}
							}
							catch(e) {
								console.log(`Parsing failed due to ${e}`);
								console.log (`text: ${block}`);
								buffer = buffer.slice(0,topic_start) + buffer.slice(topic_end+8);
							}
						}
					}
				} while (topic_end >= 0 && topic_start >= 0);
			}
			// Do the actual work!
			console.log(`Found ${topics.length} topics`);
			await this.parseXML(topics);
			// Automatically close the window after the import is finished
			//this.close();
		});
	}

	// Foundry VTT: find either an existing compendium, or create a new one.
	async getCompendiumWithType(compendiumName, type){
		// Look for compendium
		let pack = game.packs.find(p => p.metadata.name === compendiumName);
		if (pack == null) {
			this.ui_message.val(`Creating '${compendiumName}' compendium`);
			console.log(`Creating new compendium called ${compendiumName}`);
			// Create a new compendium
			let packdata = {
				name: compendiumName,
				label: compendiumName,
				collection: compendiumName,
				entity: type
			};
			if (isNewerVersion(game.data.version, "0.8.0"))
				pack = await createCompendium(packdata);
			else
				pack = await Compendium.create(packdata);
		}
		if (!pack){
		  throw "Could not find/make pack";
		}
		return pack;
	}

	// Generic routine to create any type of inter-topic link (remote_link can be undefined)
	formatLink(topic_id, link_name) {
		const id = this.entity_for_topic[topic_id]?.data._id;
		if (this.storeInCompendium) {
			// pack_name included when referencing an item in a compendium
			if (id)
				return `@Compendium[${this.journal_pack_name}.${id}]{${link_name}}`;
			else
				return `@Compendium[${this.journal_pack_name}.${link_name}]`;
		} else {
			if (id)
				return `@JournalEntry[${id}]{${link_name}}`;
			else
				return `@JournalEntry[${link_name}]`;
		}
	}
	
	//
	// Write a "contents" element:
	// Only <contents> can contain <span> which identify links.
	//
	replaceLinks(original, linkage_names) {
		// Replace '<scan>something</scan>' with '@Compendium[world.packname.<topic-for-something>]{something}'
		// @Compendium is case sensitive when using names!
		
		// We can't access "this" inside the replace function
		let formatLink = this.formatLink;
		let functhis = this;
		
		return original.replace(/<span>([^<]+)<\/span>/g, 
			function(match,p1,offset,string) {
				for (const [topic_id, labels] of linkage_names) {
					// case insensitive search across all entries in the Array() stored in the map.
					if (labels.some(item => (item.localeCompare(p1, undefined, { sensitivity: 'base' }) == 0) )) {
						return formatLink.call(functhis, topic_id, p1);
					}
				};
				// Not found in map, so just create a broken link.
				return formatLink.call(functhis, undefined, p1);
			});
	}

	// The label for a snippet is either the 'facet_name' attribute (for predefined categories) or 'label' attribute (for user-defined categories)
	getSnippetLabel(node) {
		let name = node.getAttribute('facet_name');
		if (!name || name == "") name = node.getAttribute('label');
		return name;
	}

	//
	// Convert Utf8Array to UTF-8 string
	//
	Utf8ArrayToStr(array) {
		var out, i, len, c;
		var char2, char3;

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
	// If the paragraph contains only a single Realm Works paragraph+span, then replace with a simple paragraph
	// Strip <p class="RWDefault"><span class="RWSnippet">...</span></p> from the supplied text
	stripPara(original) {
		const prefix = '<p class="RWDefault"><span class="RWSnippet">';
		const suffix = '</span></p>';
		if (original.startsWith(prefix) && original.endsWith(suffix)) {
			const result = original.slice(prefix.length, -suffix.length);
			// Don't do it if there is another paragraph in the middle
			if (!result.includes('<p')) return result;
		}
		return original;
	}
	// Remove the default class information from the RW formatting to reduce the size of the final HTML.
	simplifyPara(original) {
		// Too much effort to remove <span> and </span> tags, so just simplify.
		return original.replace(/<p class="RWDefault">/g,'<p>').replace(/<span class="RWSnippet">/g,'<span>');
	}

	imageFilename(filename) {
		return this.filedirectory + '/' + filename;
	}

	// Upload the specified binary data to a file in this.filedirectory
	async uploadBinaryFile(filename, data) {
		// data = base64 string
		const file = new File([data], filename);
		await FilePicker.upload(this.filesource, this.filedirectory, file)
			//.then(console.log(`Uploaded file ${filename}`))
			.catch(e => console.log(`Failed to upload ${filename}: ${e}`));
		//if (request.status === 413) {
		//	return ui.notifications.error(game.i18n.localize("FILES.ErrorTooLarge"));
		//} else if (request.status !== 200) {
		//	return ui.notifications.error(game.i18n.localize("FILES.ErrorSomethingWrong"));
		//}
	}

	// Convert a string in base64 format into binary and upload to this.filedirectory,
	async uploadFile(filename, base64) {
		this.uploadBinaryFile(filename, Uint8Array.from(atob(base64), c => c.charCodeAt(0)) );
	}

	// Convert a Smart_Image into a scene
	async createScene(smart_image) {
		//<snippet facet_name="Map" type="Smart_Image" search_text="">
		//  <smart_image name="Map">
		//    <asset filename="n5uvmpam.eb4.png">
		//      <contents>
		//	  <map_pin pin_name="Deneb Sector" topic_id="Topic_392" x="330" y="239">	-- topic_id is optional
		//		<description>Nieklsdia (Zhodani)</description> -- could be empty

		// These need to be created as Scenes (and linked from the original topic?)
		//const scenename = smart_image.parentElement?.getAttribute('facet_name');
		const asset    = this.getChild(smart_image, 'asset'); // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
		const contents = this.getChild(asset, 'contents'); // <contents>
		const filename = asset?.getAttribute('filename');
		if (!asset)	throw('<smart_image> is missing <asset>');
		if (!contents) throw('<smart_image> is missing <contents>');
		if (!filename) throw('<smart_image><asset> is missing filename attribute');
		
		// Name comes from topic name + facet_name
		let node = smart_image;
		let scenename;
		let topic_id;
		while (!scenename && node) {
			if (node.nodeName == 'topic') {
				scenename = node.getAttribute('public_name') + ':' + smart_image.getAttribute('name');
				topic_id  = node.getAttribute('topic_id');
			} else {
				node = node.parentElement;
			}
		}
		//console.log(`smart_image: scene name = ${scenename} from topic_id ${topic_id}`);
	
		// Firstly, put the file into the files area.
		//const imgname = await this.uploadFile(asset.getAttribute('filename'), contents.textContent);
		
		// The file was uploaded when the TOPIC was processed, so can simply read it here.
		const imagename = this.imageFilename(filename);
		const tex = await loadTexture(imagename);
		let scenedata = {
			name   : scenename,
			img    : imagename,
			//folder : this.scene_folder.id,
			//compendium : name,
			active: false,
			navigation: false,
			width: tex.baseTexture.width,
			height: tex.baseTexture.height,
			padding: 0,
		};
		if (this.scene_folder) scenedata.folder = this.scene_folder.id;
		if (topic_id) scenedata.journal = this.entity_for_topic[topic_id]?.data._id;
		
		// Delete the old scene by the same name
		let oldscene = game.scenes.find(p => p.name === scenename);
		if (oldscene) {
			this.ui_message.val(`Deleting old scene ${scenename}`);
			console.log(`Deleting old scene ${scenename}`);
			await oldscene.delete();
		}

		//console.log(`Creating scene in folder ${scenedata.folder}`);
		let scene = await Scene.create(scenedata)
			.catch(e => console.log(`Failed to created scene for '${scenename}' with image '${scenedata.img}' due to ${e}`));
		//if (scene) console.log(`Successfully created scene for ${scenename} in folder ${scene.folder}`);

		// Add some notes
		for (const pin of smart_image.getElementsByTagName('map_pin')) {
			const pinname = pin.getAttribute('pin_name');
			let desc = pin.getElementsByTagName('description')[0];
			let entryid = this.entity_for_topic[pin.getAttribute('topic_id')]?.data._id;
			let notedata = {
				name: pinname,
				entryId: entryid,				// can't link to COMPENDIUM !!!
				x: pin.getAttribute('x'),
				y: pin.getAttribute('y'),
				icon: 'icons/svg/circle.svg',		// Where do we get a good icon?
				iconSize: 32,		// minimum size 32
				iconTint: entryid ? '#7CFC00' : '#c00000',
				text: (desc.textContent.length > 0 ) ? desc.textContent.replace('&#xd;\n','\n') : pinname,
				//fontSize: 48,
				//textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
				//textColor: "#00FFFF",
				scene: scene._id
			};
			
			//let note = await Note.create(notedata)
			//	.catch(console.log(`Failed to create map pin ${pinname}`));
			// As per Note.create, but adding it to a different scene, not canvas.scene
			let newnote = new Note(notedata, scene);
			const note = await scene.createEmbeddedEntity('Note', newnote.data);
			
			//if (note) console.log(`Created map pin ${notedata.name}`);
		}
		this.ui_message.val(`Created scene ${scenename}`);
		//console.log(`Created scene ${scenename}`);
	}
		
	// Returns the named direct child of node.  node can be undefined, failure to find will return undefined.
	getChild(node,name) {
		if (!node) return node;
		for (const child of node.childNodes) {
			if (child.nodeName == name) return child;
		}
		return undefined;
	}

	// base64 is the base64 string containing the .por file
	// format is one of the character formats in the .por file: 'html', 'text', 'xml'
	// Returns an array of [ name , data ] for each character/minion in the portfolio.
	
	readPortfolio(base64) {
		let result = [];
		const buf = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
		const files = UZIP.parse(buf);
		// Now have an object with "key : property" pairs  (key = filename [String]; property = file data [Uint8Array])

		// Process the index.xml in the root of the portfolio file.
		let parser = new DOMParser();
		const xmlDoc = parser.parseFromString(this.Utf8ArrayToStr(files['index.xml']),"text/xml");
		// <document><characters>
		//   <character name="Fantastic">
		//    <statblocks><statblock format="html" folder="statblocks_html" filename="1_Fantastic.htm"/>
		//    <images><image>
		//    <minions><character name="Flappy"> <summary><statblocks><statblock format="html" folder="statblocks_html" filename="1_Fantastic.htm"/>
		
		// For each character in the POR, extract the statblock with the corresponding format, and any minions with the corresponding statblock
		for (const character of xmlDoc.getElementsByTagName('character')) {
			let actordata = { name: character.getAttribute('name') };
			if (!actordata.name) {
				console.log(`No 'name' tag in character portfolio: fields = ${character.getAttributeNames()}`);
				continue;
			}
			for (const statblock of character.getElementsByTagName('statblock')) {
				let format = statblock.getAttribute('format');
				let folder = statblock.getAttribute('folder');
				let filename = statblock.getAttribute('filename');
				actordata[format] = this.Utf8ArrayToStr(files[folder + '/' + filename]);
			}
			for (const item of character.getElementsByTagName('image')) {
				let folder = item.getAttribute('folder');
				let filename = item.getAttribute('filename');
				actordata.imgfilename = filename;
				actordata.imgdata = files[folder + '/' + filename];
			}
			result.push(actordata);
		}
		//console.log(`...found ${result.length} sheets`);
		return result;
	}

	//
	// Write one RW section
	//
	async writeSection(section, level, linkage_names) {
		// Process all the snippets and sections in order
		const name = section.getAttribute("name");
		//console.log(`writeSection(${level}, '${name}'})`);
		let result = `<h${level}>${name}</h${level}>`;
		
		// Process all child (not descendent) nodes in this section
		for (const child of section.childNodes) {
			if (child.nodeName == "section") {
				// Subsections increase the HEADING number
				result += await this.writeSection(child, level+1, linkage_names);
			} else if (child.nodeName == "snippet") {
				// Snippets contain the real information!
				let annotation;
				const sntype = child.getAttribute("type");
				const label = this.getSnippetLabel(child);
				
				if (sntype == "Multi_Line") {
					for (const snip of child.childNodes) {
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += this.simplifyPara(this.replaceLinks(snip.textContent, linkage_names));
						} else if (snip.nodeName == "gm_directions") {
							// contents child (it will already be in encoded-HTML)
							result += '<b>GMDIR: </b>' + this.simplifyPara(this.replaceLinks(snip.textContent, linkage_names));
						//} else if (snip.nodeName == "annotation") {
							//
						} else if (!snip.nodeName.startsWith("#text") && 
							!snip.nodeName.startsWith("other_spans")) {
							// 'other_spans'
							// 'tag_assign'  <-- tag assigned to this specific snippet by the user.
							console.log (`Unknown node in Multi_Line snippet: '${snip.nodeName}'`);	// GM-DIR style
						}
					}
				} // else do other snippet types
				else if (sntype == "Labeled_Text") {
					// TODO: Put label on left, and text on the right (indented)
					result += `<p><b>${label}:</b> `;
					for (const snip of child.childNodes) {
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += this.stripPara(this.replaceLinks(snip.textContent, linkage_names));
						} else if (snip.nodeName == "gm_directions") {
							// contents child (it will already be in encoded-HTML)
							result += '<b>GMDIR: </b>' + this.stripPara(snip.textContent);		// GM-DIR style
						} else if (snip.nodeName == "annotation") {
							annotation = snip.textContent;
						} else if (!snip.nodeName.startsWith("#text") && 
							!snip.nodeName.startsWith("other_spans")) {
							// 'other_spans'
							// 'tag_assign'  <-- tag assigned to this specific snippet by the user.
							console.log (`Unknown node in Labeled_Text snippet: '${snip.nodeName}'`);
						}
					}
					if (annotation) result += `; <i>${this.stripPara(annotation)}</i>`;
					result += `</p>`;
				}
				else if (sntype == "Numeric") {
					// contents will hold just a number
					result += `<p><b>${label}:</b> `;
					for (const snip of child.childNodes) {
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += this.replaceLinks(snip.textContent, linkage_names);
						} else if (snip.nodeName == "gm_directions") {
							// contents child (it will already be in encoded-HTML)
							result += '<b>GMDIR: </b>' + this.stripPara(snip.textContent);
						} else if (snip.nodeName == "annotation") {
							annotation = snip.textContent;
						} else if (!snip.nodeName.startsWith("#text") && 
							!snip.nodeName.startsWith("other_spans")) {
							console.log (`Unknown node in Numeric snippet: '${snip.nodeName}'`);	// GM-DIR style
						}
					}
					if (annotation) result += `; <i>${this.stripPara(annotation)}</i>`;
					result += `</p>`;
				}
				else if (sntype == "Tag_Standard") {
					// <tag_assign tag_name="Manufacturing" domain_name="Commerce Activity" type="Indirect" />
					let first = true;
					result += `<p><b>${label}:</b> `;
					for (const snip of child.childNodes) {
						if (snip.nodeName == 'tag_assign') {
							if (snip.hasAttribute('tag_name')) {
								if (first)
									first = false;
								else
									result += ', ';
								result += snip.getAttribute('tag_name');
							}
						} else if (snip.nodeName == "annotation") {
							annotation = snip.textContent;
						} else if (!snip.nodeName.startsWith("#text") && 
							!snip.nodeName.startsWith("other_spans")) {
							console.log (`Unknown node in Tag_Standard snippet: '${snip.nodeName}'`);	// GM-DIR style
						}
					}
					if (annotation) result += `; <i>${this.stripPara(annotation)}</i>`;
					result += `</p>`;
				}
				else if (sntype == "Tag_Multi_Domain") {
					let first = true;
					result += `<p><b>${label}:</b> `;
					for (const snip of child.childNodes) {
						if (snip.nodeName == "tag_assign") {
							if (snip.hasAttribute('tag_name')) {
								if (first)
									first = false;
								else
									result += ', ';
								result += `${snip.getAttribute('domain_name')}:${snip.getAttribute('tag_name')}`;
							}
						} else if (snip.nodeName == "annotation") {
							// annotation appears before tag_assign elements, so save it for later
							annotation = snip.textContent;
						} else if (!snip.nodeName.startsWith("#text") && 
							!snip.nodeName.startsWith("other_spans")) {
							console.log (`Unknown node in Tag_Multi_Domain snippet: '${snip.nodeName}'`);	// GM-DIR style
						}
					}
					if (annotation) result += `; <i>${this.stripPara(annotation)}</i>`;
					result += `</p>`;
				}
				else if (sntype == "Date_Game") {
					result += `<p><b>${label}:</b> `;
					for (const snip of child.childNodes) {
						if (snip.nodeName == 'game_date') {
							result += snip.getAttribute("display");
						} else if (snip.nodeName == "annotation") {
							annotation = snip.textContent;
						}
					}
					if (annotation) result += `; <i>${this.stripPara(annotation)}</i>`;
					result += `</p>`;
					// annotation
				}
				else if (sntype == "Date_Range") {
					result += `<p><b>${label}:</b> `;
					for (const snip of child.childNodes) {
						if (snip.nodeName == "date_range") {
							result += `${snip.getAttribute("display_start")} to ${snip.getAttribute("display_end")}`;
						} else if (snip.nodeName == "annotation") {
							annotation = snip.textContent;
						}
					}
					if (annotation) result += `; <i>${this.stripPara(annotation)}</i>`;
					result += `</p>`;
					// annotation
				}
				else if (sntype == "Portfolio") {
					const ext_object = this.getChild(child,      'ext_object');
					const asset      = this.getChild(ext_object, 'asset');  // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const contents   = this.getChild(asset,      'contents');    // <contents>
					if (contents) {
						let characters = this.readPortfolio(contents.textContent);
						for (let i=0; i<characters.length; i++) {
							if (i > 0) result += '<hr>';
							result += `<h${level+1}>Portfolio: ${characters[i].name}</h${level+1}>`;
							result += characters[i].html;
						}
					}
				} else if (sntype == "Picture" ||
					sntype == "PDF" ||
					sntype == "Audio" ||
					sntype == "Video" ||
					sntype == "Statblock" ||
					sntype == "Foreign" ||
					sntype == "Rich_Text") {
					
					const ext_object = this.getChild(child,      'ext_object');  // <ext_object name="Portrait" type="Picture">
					const asset      = this.getChild(ext_object, 'asset');       // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const contents   = this.getChild(asset,      'contents');    // <contents>
					const filename   = asset.getAttribute('filename');
					if (contents) {
						result += `<h${level+1}>${ext_object.getAttribute('name')}</h${level+1}>`;
						const fileext  = filename.split('.').pop();	// extra suffix from asset filename
						if (fileext == 'html' || fileext == 'htm' || fileext == "rtf")
							result += `${atob(contents.textContent)}`;
						else if (sntype == "Picture") {
							//result += `<p><img src="data:image/${fileext};base64,${contents.textContent}"></img></p>`;
							await this.uploadFile(filename, contents.textContent);
							result += `<p><img src='${this.imageFilename(filename)}'></img></p>`;
						} else {
							let format = 'binary/octet-stream';
							if (fileext == 'pdf') {
								format = 'application/pdf';
							}
							//result += `<p><a href="data:${format};base64,${contents.textContent}"></a></p>`;
							await this.uploadFile(filename, contents.textContent);
							result += `<p><a href='${this.imageFilename(filename)}'></a></p>`;
						}
					}
				} else if (sntype == "Smart_Image") {
					//<snippet facet_name="Map" type="Smart_Image" search_text="">
					//  <smart_image name="Map">
					//    <asset filename="n5uvmpam.eb4.png">
					//      <contents>
					//	  <map_pin pin_name="Deneb Sector" topic_id="Topic_392" x="330" y="239">	-- topic_id is optional
					//		<description>Nieklsdia (Zhodani)</description> -- could be empty
					
					// These need to be created as Scenes (and linked from the original topic?)
					const smart_image = this.getChild(child,       'smart_image');
					const asset       = this.getChild(smart_image, 'asset'); 	    // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const contents    = this.getChild(asset,       'contents');  	// <contents>
					const filename    = asset?.getAttribute('filename');
					const format      = filename?.split('.').pop();	// extra suffix from asset filename
					if (format && contents) {
						result += `<h${level+1}>${smart_image.getAttribute('name')}</h${level+1}>`;
						//result += `<p><img src="data:image/${format};base64,${contents.textContent}"></img></p>`;
						await this.uploadFile(filename, contents.textContent);
						result += `<p><img src='${this.imageFilename(filename)}'></img></p>`;
					}
				} else if (sntype == "tag_assign") {
					// Nothing to done for these
				} else {
					console.log(`Unsupported snippet type: ${sntype}`);
				}
			} else if (!child.nodeName.startsWith('#text')) {
				// We can safely ignore whitespace at this level.
				// Some other element type which we haven't implemented yet
				console.log(`Unsupported element type: ${child.nodeName}`);
			}
		}
		
		//console.log(`writeSection(${name}) returning ${result}`);
		return result;
	}

	getScenes(topic) {
		let result = [];
		function checkSnippets(node) {
			for (const child of node.childNodes) {
				if (child.nodeName == 'smart_image')
					result.push(child);
				else if (child.nodeName != 'topic' && child.childNodes.length > 0)
					checkSnippets(child);
			}
		}
		checkSnippets(topic);
		return result;
	}
	
	//
	// Write one RW topic
	//
	async formatOneTopic(topic) {
		//console.log(`Formatting topic '${topic.getAttribute("public_name")}'`);

		// Extract only the links that we know are in this topic (if any).
		// Collect linkage children and create an alias/title-to-topic map:
		//   <linkage target_id="Topic_345" target_name="Air/Raft" direction="Outbound" />
		let linkage_names = new Map();
		for (const node of topic.childNodes) {
			if (node.nodeName == "linkage" && node.getAttribute('direction') != 'Inbound') {
				const target_id = node.getAttribute('target_id');
				// In partial output, all linkages are reported even if the target topic is not present.
				if (this.topic_names.has(target_id)) {
					linkage_names.set(target_id, this.topic_names.get(target_id));
				}
			}
		}
		// Add self to the mapping (in case a topic links to itself, but differs only in case)
		const this_topic_id = topic.getAttribute('topic_id');
		if (this.topic_names.has(this_topic_id)) {
			linkage_names.set(this_topic_id, this.topic_names.get(this_topic_id));
		}
		// Generate the HTML for the sections within the topic
		let html = "";
		let inbound = [];
		let outbound = [];
		let both = [];
		let has_child_topics = false;
		let has_connections = false;
		for (const node of topic.childNodes) {
			if (node.nodeName == "alias") {
				// These come first
				html += `<p><b>Aliases: </b><i>${node.getAttribute('name')}</i></p>`;
			} else if (node.nodeName == "section") {
				html += await this.writeSection(node, 1, linkage_names);		// Start with H1
			} else if (node.nodeName == "topicchild" || node.nodeName == "topic") {
				// No need to handle nested topics, since we found all of them at the start.
				// Put link to child topic in original topic
				// topicchild elements are added when parsing a LARGE file
				if (!has_child_topics) {
					html += '<h1>Child Topics</h1><ul>';
					has_child_topics = true;
				}
				html += `<li>${this.formatLink(node.getAttribute("topic_id"), node.getAttribute("public_name"))}</li>`;
			} else if (node.nodeName == "linkage") {
				var dir = node.getAttribute('direction');
				if (dir == 'Outbound') outbound.push(node);
				else if (dir == 'Inbound') inbound.push(node);
				else if (dir == 'Both') both.push(node);
			} else if (node.nodeName == "connection") {
				// <connection target_id="Topic_2" target_name="Child Feat 1" nature="Master_To_Minion" qualifier="Owner / Subsidiary"/>
				if (!has_connections)
				{
					has_connections = true;
					html += '<h1>Connections</h1>';
				}
				html += `<p>${this.formatLink(node.getAttribute('target_id'), node.getAttribute('target_name'))} = ${node.getAttribute('nature')}`;
				if (node.hasAttribute('qualifier')) html += `:${node.getAttribute('qualifier')}`;
				if (node.hasAttribute('rating'))    html += `, ${node.getAttribute('rating')} rating`;
				if (node.hasAttribute('attitude'))  html += `, ${node.getAttribute('attitude')} attitude`;
			}
			// and ignore tag_assign at this point.
		}
		if (has_child_topics) {
			html += '</ul>';
		}
		// Add inbound and/or outbound link information (if requested)
		if ((this.addInboundLinks || this.addOutboundLinks) && (inbound.length > 0 || outbound.length > 0 || both.length > 0)) {
			if (this.addInboundLinks && (inbound.length > 0 || both.length > 0)) {
				html += '<h1>Links From Other Topics</h1><p>';
				for (const node of inbound) {
					html += this.formatLink(node.getAttribute("target_id"), node.getAttribute("target_name"));
				}
				for (const node of both) {
					html += this.formatLink(node.getAttribute("target_id"), node.getAttribute("target_name"));
				}
				html += '<\p>';
			}
			if (this.addOutboundLinks && (outbound.length > 0 || both.length > 0)) {
				html += '<h1>Links To Other Topics</h1><p>';
				for (const node of outbound) {
					html += this.formatLink(node.getAttribute("target_id"), node.getAttribute("target_name"));
				}
				for (const node of both) {
					html += this.formatLink(node.getAttribute("target_id"), node.getAttribute("target_name"));
				}
				html += '<\p>';
			}
		}

		// Create all the scenes now
		await Promise.allSettled(Array.from(this.getScenes(topic)).map( async(smart_image) => {
			await this.createScene(smart_image).catch(e => console.log(`Failed to create scene due to ${e}`));
		}));

		// Format as a data block usable by JournalEntry.create
		let result = {
			_id:      this.entity_for_topic[this_topic_id].data._id,
			name:     topic.getAttribute("public_name"),
			topic_id: this_topic_id,
			//folder: this.journal_folder.id,
			content:  html
		};
		// Create each category folder as required
		// (the folders were created when we created blank journal entries.
		if (this.journal_folders) result.folder = this.journal_folders.get(topic.getAttribute('category_name')).id;
		//console.log(`Finished topic '${topic.getAttribute("public_name")}' in folder ${result.folder}`);
		
		return result;
	}

	// Examine each topic within topics to see if it should be converted into an actor:
	// i.e. it contains a Portfolio or Statblock snippet type directly, not in a child topic.
	getActorSnippet(node) {
		for (const child of node.childNodes) {
			if (child.nodeName == 'snippet' && 
				(child.getAttribute('type') == 'Portfolio' || 
				 child.getAttribute('type') == 'Statblock')) {
				return child;
			} else if (child.nodeName != 'topic' && child.childNodes.length > 0) {
				// Don't check nested topics
				let result = this.getActorSnippet(child);
				if (result) return result;
			}
		}
		return undefined;
	}
	
	getActorTopics(topics) {
		// This should return an HTMLCollection
		let result = [];
		for (const topic of topics) {
			if (this.getActorSnippet(topic)) {
				result.push(topic);
			}
		}
		return result;
	}

	//
	// Convert a TOPIC into an ACTOR
	//
	async formatActors(topic) {
		//console.log(`Formatting actor for ${topic.getAttribute('public_name')}`);
		const snippet = this.getActorSnippet(topic);
		if (!snippet) throw('formatActors: <snippet type=Portfolio|Statblock> is missing');
		
		const sntype = snippet.getAttribute('type');
		const ext_object = this.getChild(snippet, 'ext_object');  // <ext_object name="Portrait" type="Picture">
		if (!ext_object) throw('formatActors: no <ext_object> for actor');
		const asset      = this.getChild(ext_object, 'asset');       // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
		if (!asset)      throw('formatActors: no <asset> for actor');
		const contents   = this.getChild(asset, 'contents');    // <contents>
		if (!contents)   throw('formatActors: no <contents> for actor');
		const filename   = asset.getAttribute('filename');

		let actor = { 
			name: topic.getAttribute('public_name'),
			type: 'npc',
			//folder: this.actor_folder.id
		};		

		let statblock;
		let portfolio;
		if (sntype == 'Portfolio') {
			if (!filename.endsWith('.por'))
				throw('formatActors: Portfolio file does not end with .por');
			portfolio = this.readPortfolio(contents.textContent);
			// Upload images (if any)
			for (let character of portfolio) {
				if (character.imgfilename) {
					await this.uploadBinaryFile(character.imgfilename, character.imgdata);
				}
			}				
		} else { // (sntype == 'Statblock')
			if (!filename.endsWith('.html') && !filename.endsWith('.htm') && !filename.endsWith('.rtf'))
				throw('formatActors: Statblock file does not end with .htm or .html or .rtf');
			statblock = atob(contents.textContent);
		}

		// TODO - call the ACTOR creator for the specific GAME SYSTEM that is installed
		//console.log(`ACTOR ${topic.getAttribute('public_name')} = HTML '${html}'`);
		let result = [];
		
		if (game.system.id == 'pf1') {
			// Test, put all the information into data.details.notes.value
			if (portfolio) {
				for (let character of portfolio) {
					if (character.xml) {
						actor = await RWPF1Actor.createActorData(character.xml);
					} else {
						console.log(`Portfolio for ${character.name} is missing XML data`);
						actor = { 
							name: character.name,
							type: 'npc',
							data: { details : {} }
						}
					}
					actor.data.details.notes = { value : character.html };
					if (character.imgfilename) actor.img = this.imageFilename(character.imgfilename);
					result.push(actor);
				}
			} else {
				actor = { 
					name: topic.getAttribute('public_name'),
					type: 'npc',
					//folder: this.actor_folder.id
					data: { details : { notes : { value : statblock }}}
				};		
				result.push(actor);
			}
			
		} else if (game.system.id == 'dnd5e') {
			actor.type = 'Player Character';
			if (portfolio) {
				for (let character of portfolio) {
					//actor.data = await RWDND5EActor.createActorData(character.xml);
					actor.data = { details : { biography : { value : character.html }}};
					if (character.imgfilename) actor.img = this.imageFilename(character.imgfilename)
					result.push(actor);
				}
			} else {
				actor = { 
					name: topic.getAttribute('public_name'),
					type: 'npc',
					//folder: this.actor_folder.id
					data: { details : { biography : { value : statblock }}}
				};		
				result.push(actor);
			}
			
		} else if (game.system.id == 'grpga') {
			if (portfolio) {
				for (let character of portfolio) {
					actor.type = 'CharacterD20';	// Character3D6 | CharacterVsD | CharacterD100 | CharacterOaTS | CharacterD20
					actor.data = { biography : character.html };
					if (character.imgfilename) actor.img = this.imageFilename(character.imgfilename);
					result.push(actor);
				}
			} else {
				actor = { 
					name: topic.getAttribute('public_name'),
					type: 'CharacterD20',	// Character3D6 | CharacterVsD | CharacterD100 | CharacterOaTS | CharacterD20
					//folder: this.actor_folder.id,
					data: { biography : statblock }
				};		
				result.push(actor);
			}
		}

		if (this.actor_folder) {
			for (let i=0; i<result.length; i++)
				result[i].folder = this.actor_folder.id;
		}
		//console.log(`Actor data for ${actor.name} in folder ${actor.folder}`);
		
		return result;
	}
	
	//
	// Parse the entire Realm Works file supplied in 'xmlString'
	// and put each individual topic into the compendium named '<compendiumName>-journal'
	//
	async parseXML(topics)
	{
		let category_names = new Set();
		if (this.folderName) {
			for (const topic of topics)  {
				category_names.add(topic.getAttribute('category_name'));
			}
		}

		// Maybe delete the old compendium before creating a new one?
		// (This has to be done now so that we can get journal_pack.collection name for links)
		if (this.deleteCompendium) {
			if (this.storeInCompendium) {
				if (this.journalCompendiumName.length > 0) {
					let pack = game.packs.find(p => p.metadata.name === this.journalCompendiumName);
					if (pack) {
						this.ui_message.val(`Deleting old compendium ${this.journalCompendiumName}`);
						console.log(`Deleting journal compendium pack ${this.journalCompendiumName}`);
						await pack.delete();
					}
				}
				if (this.actorCompendiumName.length > 0) {
					let pack = game.packs.find(p => p.metadata.name === this.actorCompendiumName);
					if (pack) {
						this.ui_message.val(`Deleting old compendium ${this.actorCompendiumName}`);
						console.log(`Deleting journal compendium pack ${this.actorCompendiumName}`);
						await pack.delete();
					}
				}
			} else {
				if (this.folderName) {
					// Delete folders with the given name.
					for (let folder of game.folders.filter(e => e.name == this.folderName)) {
						await folder.delete({
							deleteSubfolders: true,
							deleteContents: true
						});
					}
				}
			}
		}

		// If putting into compendium packs, create the packs now
		// If using folders, then create the folders now
		let journal_pack;
		let actor_pack;
		if (this.storeInCompendium) {
			// Get/Create the compendium pack into which we are adding journal entries
			journal_pack = await this.getCompendiumWithType(this.journalCompendiumName, "JournalEntry");
			this.journal_pack_name = journal_pack.collection;	// the full name of the compendium
			if (this.actorCompendiumName.length > 0) {
				actor_pack = await this.getCompendiumWithType(this.actorCompendiumName, "Actor");
				this.actor_pack_name = actor_pack.collection;	// the full name of the compendium
			}
		} else {
			if (this.folderName) {
				console.log('Creating folders');
				this.actor_folder   = await Folder.create({name: this.folderName, type: 'Actor', parent: null});
				this.scene_folder   = await Folder.create({name: this.folderName, type: 'Scene', parent: null})
				//this.journal_folder = await Folder.create({name: this.folderName, type: 'JournalEntry', parent: null})
				let journal_parent = await Folder.create({name: this.folderName, type: 'JournalEntry', parent: null})
				this.journal_folders = new Map();  // actual journal entries will be in a folder with the TOPIC category name
				for (const category_name of category_names) {
					let folder = await Folder.create({name : category_name, type: 'JournalEntry', parent: journal_parent.id})
						.catch(`Failed to create Journal folder for ${category_name}`);
					if (folder) this.journal_folders.set(category_name, folder);
				}
				//console.log(`folder-ids: actor ${this.actor_folder.id}, journal ${this.journal_folder.id}, scene ${this.scene_folder.id}`);
			}
		}
		// Create the image folder if it doesn't already exist.
		await FilePicker.createDirectory(this.filesource, this.filedirectory, new FormData()).catch(e => `Creating folder ${this.filedirectory} failed due to ${e}`);
		
		// Create a mapping from topic_id to public_name for all topic elements, required for creating "@Compendium[<packname>."mapping[linkage:target_id]"]{"linkage:target_name"}" entries.
		// Also collect aliases for each topic:
		// <alias alias_id="Alias_1" name="Barracks Emperors" />
		//let indices = await journal_pack.getIndex();
		this.topic_names = new Map();
		//this.topic_entities = new Map();
		for (const child of topics) {
			const topic_name = child.getAttribute("public_name");
			//console.log(`Found topic '${child.getAttribute("topic_id")}' with name '${topic_name}'`);
			let names = new Array();
			names.push(topic_name);
			
			for (const alias of child.childNodes) {
				if (alias.nodeName == "alias") {
					names.push(alias.getAttribute('name'));
				}
			};
			const topic_id = child.getAttribute("topic_id");
			this.topic_names.set(topic_id, names);
		};

		//
		// TOPICS => JOURNAL ENTRIES
		//
		// Generate empty topic entries first, so that we have Foundry id's for each topic.
		this.ui_message.val(`Creating ${topics.length} empty journal entries`);
		console.log(`Creating ${topics.length} empty journal entries`);
		this.entity_for_topic = new Map();
		for (const topic of topics) {
			const topic_name = topic.getAttribute('public_name');
			const category_name = topic.getAttribute('category_name');
			let initdata = {
				name : topic_name
			};
			// Create directly in the relevant folder
			if (this.journal_folders) initdata.folder = this.journal_folders.get(category_name).id;
			let item = await JournalEntry.create(initdata, { displaySheet: false, temporary: this.storeInCompendium });
			if (this.storeInCompendium && item) item = await journal_pack.importEntity(item);
			//console.log(`Item ${topic_name} has _id = ${item.data._id}`);
			this.entity_for_topic[topic.getAttribute("topic_id")] = item;
		}
		//console.log(this.entity_for_topic);
		
		// Asynchronously generate each of the Journal Entries
		this.ui_message.val(`Generating ${topics.length} journal contents`);		
		console.log(`Generating ${topics.length} journal contents`);	
		await Promise.allSettled(Array.from(topics).map(async (topic_node) =>
			await this.formatOneTopic(topic_node)
				.then(async(topic) => {
					if (this.storeInCompendium)
						await journal_pack.updateEntity(topic)
							//.then(console.log(`Topic ${topic.name} added to Compendium pack`))
							.catch(p => console.log(`Update JE failed for '${topic.name}' because ${p}`));
					else
						await JournalEntry.update(topic)
							//.then(console.log(`Topic ${topic.name} added to World directory`))
							.catch(p => console.log(`Update JE failed for '${topic.name}' because ${p}`));
				})
				.catch(e => console.log(`Failed to create topic ${topic_node.getAttribute("public_name")} due to ${e}`))
			));
			
		//
		// HL PORTFOLIOS => ACTORS
		//

		if (game.system.id == 'pf1' || game.system.id == 'dnd5e' || game.system.id == 'grpga') {
			
			if (game.system.id == 'pf1') {
				// Very specific to PF1, generate the FEAT index only once (it avoids excessive re-writing of feats.db)
				const pack = await game.packs.find(p => p.metadata.name === 'feats');
				if (pack) await pack.getIndex();
			}
			
			let actor_topics = this.getActorTopics(topics);
			this.ui_message.val(`Generating ${actor_topics.length} Actors`);
			console.log(`Generating ${actor_topics.length} Actors`);
			
			// TODO:
			// change formatActors to return an array of Actor data that is required for the supplied topic.
			// Then sort them into alphabetical order.
			// Then for all Actors with the same name, remove ones with the same actor data (e.g. most likely common monsters in the campaign)
			// Then create actual Actor entities.
			
			// Asynchronously create all the actors (now that we have full HTML for the relevant topics)
			let actors = [];
			for (let topic of actor_topics) {
				try {
					actors.push(await this.formatActors(topic));
				} catch(error) {
					console.log(`formatActors for topic '${topic.getAttribute("public_name")}': ${error}`);
				};
			}
			// formatActors might have generated more than one actor
			actors = actors.flat();
			
			// remove duplicates - does not remove any
			actors = [...new Set(actors)];
			console.log(`Reduced to ${actor_topics.length} Actors after removing duplicates`);
			
			// Now create the actual Actor elements
			await Promise.allSettled(actors.map(async(actor_data) =>
				await Actor.create(actor_data, { displaySheet: false, temporary: this.storeInCompendium })
				.then(async(actor) => { if (this.storeInCompendium) await actor_pack.importEntity(actor) })
				.catch(e => console.log(`Failed to create Actor due to ${e}`))
			));
		}
		
		console.log('******  Finished  ******');
		this.ui_message.val('--- Finished ---');
	}
} // class
