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



const online = true;


// LOCAL TESTING: node.js doesn't have Application parent class
class RealmWorksImporter extends Application
//class RealmWorksImporter
{
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
			let inputRW = html.find('[name=all-xml]').val();
			let adder = {
				class: html.find('[name=classButton]').is(':checked'),
				spells: html.find('[name=spellsButton]').is(':checked'),
				creature: html.find('[name=creatureButton]').is(':checked'),
				journal: html.find('[name=journalButton]').is(':checked'),
			}
			// Read in the file contents here?
			//const response = await fetch('inputRW');
			//const xmlString = await response.text();

			let compendiumName = html.find('[name=compendium-input]').val();
		  
			// Do the actual work!
			RealmWorksImporter.parseXML(inputRW, compendiumName);
		});
		this.close();
	}

	// Foundry VTT: find either an existing compendium, or create a new one.
	static async getCompendiumWithType(compendiumName, type){
		// Look for compendium
		let pack = game.packs.find(p => p.metadata.name === compendiumName);

		if (pack == null) {
			console.log(`Creating new compendium called ${compendiumName}`);
			// Create a new compendium
			pack = await Compendium.create({
				name: compendiumName,
				label: compendiumName,
				collection: compendiumName,
				entity: type
			  });
		}
		if (!pack){
		  throw "Could not find/make pack";
		}
		return pack;
	}

	//
	// Write a "contents" element:
	// Only <contents> can contain <span> which identify links.
	// Replace '<scan>something</scan>' with '@JournalEntry[world.packname.<topic-for-something>]{something}'
	// @Compendium is case sensitive when using names!
	//
	static writeContents(node, topic_array, packname) {
		return node.textContent.replace(/<span>([^<]+)<\/span>/g, 
			function(match,p1,offset,string) {
				let linkname = topic_array.find(item => (item.localeCompare(p1, undefined, { sensitivity: 'base' }) == 0) );
				if (linkname == undefined || linkname == p1)
					return `@Compendium[${packname}.${p1}]`;
				else
					return `@Compendium[${packname}.${linkname}]{${p1}}`;
			});
	}
	
	//
	// Write one RW section
	//
	static writeSection(section, level, topic_map, topic_array, packname) {
		// Process all the snippets and sections in order
		const name = section.getAttribute("name");
		//console.log(`writeSection(${level}, '${name}'})`);
		let result = `<H${level}>${name}</H${level}>`;
		
		// Process all child nodes in this section
		const kids = section.childNodes;
		for(var n = 0; n < kids.length; n++) {
			const child = kids[n];
			if (child.nodeName == "section") {
				// Subsections increase the HEADING number
				console.log(`nested section ${child.getAttribute("name")}`);
				result += RealmWorksImporter.writeSection(child, level+1, topic_map, topic_array, packname);
			}
			else if (child.nodeName == "snippet") {
				// Snippets contain the real information!
				const sntype = child.getAttribute("type");
				
				if (sntype == "Multi_Line") {
					const snips = child.childNodes;
					for (var sn = 0; sn < snips.length; sn++) {
						const snip = snips[sn];
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += RealmWorksImporter.writeContents(snip, topic_array, packname);
						} else if (snip.nodeName == "gm_directions") {
							// contents child (it will already be in encoded-HTML)
							//console.log("gm_directions");
							result += snip.textContent;
						} else if (snip.nodeName == "annotation") {
							//
						}
						else if (!snip.nodeName.startsWith("#text")) {
							console.log (`Unknown node in Multi_Line snippet '${snip.nodeName}'`);	// GM-DIR style
						}
					}
				} // else do other snippet types
				else if (sntype == "Labeled_Text") {
					const label = child.getAttribute("label");
					const snips = child.childNodes;
					for (var sn = 0; sn < snips.length; sn++) {
						const snip = snips[sn];
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += `<p><b>${label}:</b></p>${RealmWorksImporter.writeContents(snip, topic_array, packname)}`;		// TODO - label needs to be inside first <p>
						} else if (snip.nodeName == "gm_directions") {
							// contents child (it will already be in encoded-HTML)
							//console.log("gm_directions");
							result += `<p><b>${label}:</b></p>${snip.textContent}`;		// GM-DIR style
						}
						else if (!snip.nodeName.startsWith("#text")) {
							console.log (`Unknown node in Labeled_Text snippet '${snip.nodeName}'`);
						}
					}
				}
				else if (sntype == "Numeric") {
					// contents will hold just a number
					const label = child.getAttribute('label');
					const snips = child.childNodes;
					for (var sn = 0; sn < snips.length; sn++) {
						const snip = snips[sn];
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += `<p><b>${label}:</b> ${RealmWorksImporter.writeContents(snip, topic_array, packname)}</p>`;
						} else if (snip.nodeName == "gm_directions") {
							// contents child (it will already be in encoded-HTML)
							//console.log('gm_directions');
							result += snip.textContent;
						} else if (snip.nodeName == "annotation") {
							result += `; ${snip.textContent}`;
							
						} else if (!snip.nodeName.startsWith("#text")) {
							console.log (`Unknown node in Numeric snippet '${snip.nodeName}'`);	// GM-DIR style
						}
					}
				}
				else if (sntype == "Tag_Standard") {
					// <tag_assign tag_name="Manufacturing" domain_name="Commerce Activity" type="Indirect" />
					const tag = child.getElementsByTagName('tag_assign')[0];	// all descendents not just direct children
					result += `<p><b>${child.getAttribute('facet_name')}:</b> ${tag.getAttribute('tag_name')}</p>`;
					// annotation
				}
				else if (sntype == "Tag_Multi_Domain") {
					const snips = child.childNodes;
					let items = [];
					for (var sn = 0; sn < snips.length; sn++) {
						const snip = snips[sn];
						if (snip.nodeName == "tag_assign") {
							items.push(`${snip.getAttribute('domain_name')}:${snip.getAttribute('tag_name')}`);
						}
					}
					result += `<p><b>${child.getAttribute('label')}:</b> ${items.join('; ')}</p>`;
				}
				else if (sntype == "Date_Game") {
					const tag = child.getElementsByTagName('game_date')[0];		// all descendents not just direct children
					result += `<p><b>${child.getAttribute('facet_name')}:</b> ${tag.getAttribute("display")}</p>`;
					// annotation
				}
				else if (sntype == "Date_Range") {
					const tag = child.getElementsByTagName('date_range')[0];		// all descendents not just direct children
					result += `<p><b>${child.getAttribute('label')}:</b> ${tag.getAttribute("display_start")} to ${tag.getAttribute("display_end")}</p>`;
					// annotation
				}
				else if (sntype == "Portfolio") {
					 console.log(`Not implemented ${sntype}`);
				}
				else if (sntype == "Picture") {
					const facet_name = child.getAttribute('facet_name');
					//const ext_object = child.childNodes[0];  // <ext_object name="Portrait" type="Picture">
					const asset    = child.getElementsByTagName('asset')[0];  // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const contents = asset.getElementsByTagName('contents')[0];    // <contents>
					const format   = asset.getAttribute('filename').split('.').pop();	// extra suffix from asset filename
					result += `<p><b>${facet_name}</b>: <img src="data:image/${format};base64,${contents.textContent}"></img></p>`;					
				} else if (sntype == "PDF" ||
					sntype == "Audio" ||
					sntype == "Video" ||
					sntype == "Statblock" ||
					sntype == "Foreign" ||
					sntype == "Rich_Text") {
					const facet_name = child.getAttribute('facet_name');
					//const ext_object = child.childNodes[0];  // <ext_object name="Portrait" type="Picture">
					const asset      = child.getElementsByTagName('asset')[0];  // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const contents   = asset.getElementsByTagName('contents')[0];    // <contents>
					let format = 'binary/octet-stream';
					const fileext = asset.getAttribute('filename').split('.').pop();	// extra suffix from asset filename
					if (fileext == 'pdf') {
						format = 'application/pdf';
					}
					result += `<p><b>${facet_name}</b>: <a href="data:${format};base64,${contents.textContent}"></a></p>`;
					 
				}
				else if (sntype == "Smart_Image") {
					//<snippet facet_name="Map" type="Smart_Image" search_text="">
					//  <smart_image name="Map">
					//    <asset filename="n5uvmpam.eb4.png">
					//      <contents>
					//	  <map_pin pin_name="Deneb Sector" topic_id="Topic_392" x="330" y="239">	-- topic_id is optional
					//		<description>Nieklsdia (Zhodani)</description> -- could be empty
					const facet_name = child.getAttribute('facet_name');
					const asset    = child.getElementsByTagName('asset')[0];  // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const contents = asset.getElementsByTagName('contents')[0];    // <contents>
					const format   = asset.getAttribute('filename').split('.').pop();	// extra suffix from asset filename
					result += `<p><b>${facet_name}</b>: <img src="data:image/${format};base64,${contents.textContent}"></img></p>`;					
				}
				else {
					console.log(`Unsupported snippet type: ${child.getAttribute("type")}`);
				}
			}
			else if (!child.nodeName.startsWith('#text')) {
				// We can safely ignore whitespace at this level.
				// Some other element type which we haven't implemented yet
				console.log(`Unsupported element type: ${child.nodeName}`);
			}
		}
		
		//console.log(`writeSection(${name}) returning ${result}`);
		return result;
	}

	static writeLink(packname, topic_map, topic_id, topic_name) {
		let tlink = topic_map.get(topic_id);
		if (tlink) {
			return `@Compendium[${packname}.${tlink}]{${topic_name}}`;
		}
		else {
			return `@Compendium[${packname}.${topic_name}]`;
		}
	}
	
	//
	// Write one RW topic
	//pack
	static async writeTopic(topic, pack, topic_map, topic_array) {
		console.log(`Importing '${topic.getAttribute("public_name")}'`);
		let html = "";
		let first_child_topic = true;
		
		// Generate the HTML for the sections within the topic
		const kids = topic.childNodes;
		for (var n=0; n < kids.length; n++) {
			const node = kids[n];
			if (node.nodeName == "section") {
				html += RealmWorksImporter.writeSection(node, 1, topic_map, topic_array, pack.collection);		// Start with H1
			} else if (node.nodeName == "topic") {
				// No need to handle nested topics, since we found all of them at the start.
				//await RealmWorksImporter.writeTopic(node, pack, topic_map, topic_array);
				
				// Put link to child topic in original topic
				if (first_child_topic) {
					html += "<H1>Child Topics</H1>";
					first_child_topic = false;
				}
				html += '<p>';
				html += RealmWorksImporter.writeLink(pack.collection, topic_map, node.getAttribute("topic_id"), node.getAttribute("public_name"));
				html += '<\p>';
			//} else if (!node.nodeName.startsWith('#text')) {
				// tag_assign
				// linkage
				//console.log (`Unexpected node in topic ${node.nodeName}`);
			}
		}
		
		// Now create the correct journal entry:
		//    name = prefix + public_name + suffix
		if (online) {
			// Replace if the name already exists
			let entry = await pack.index.find(e => e.name === topic.getAttribute("public_name"));
			if (entry) {
				//console.log(`*** Deleting old entry for ${topic.getAttribute("public_name")}`);
				await pack.deleteEntity(entry._id);
			}

			//console.log({
			let journal = await JournalEntry.create({
				name: topic.getAttribute("public_name"),
				content: html
			}, { displaySheet: false, temporary: true });
			
			// Add to the requested Compendium pack
			await pack.importEntity(journal);
			await pack.getIndex(); // Need to refresh the index to update it
		} else {
			console.log({
				name: topic.getAttribute("public_name"),
				content: html,
			}, { displaySheet: false, temporary: true });
		}

		//console.log(`Finished importing '${topic.getAttribute("public_name")}'`);
	}

	//
	// Parse the entire Realm Works file supplied in 'xmlString'
	// and put each individual topic into the compendium named '<compendiumName>-journal'
	//
	static async parseXML(xmlString, compendiumName)
	{
		console.log(`Starting for ${compendiumName}`);
		let jpack = await RealmWorksImporter.getCompendiumWithType(compendiumName, "JournalEntry");
		//let jpack = null;

		// Only for offline testing
		//var DOMParser = require('xmldom').DOMParser;
		
		let parser = new DOMParser();
		let xmlDoc = parser.parseFromString(xmlString,"text/xml");
		
		const topics = xmlDoc.getElementsByTagName('topic');  // all descendents, not just direct children

		// Create a mapping from topic_id to public_name for all topic elements, required for creating "@Compendium[<packname>."mapping[linkage:target_id]"]{"linkage:target_name"}" entries.
		let topic_map = new Map();
		let topic_array = new Array();
		for (var i = 0; i<topics.length; i++) {
			const child = topics[i];
			//console.log(`Found topic '${child.getAttribute("topic_id")}' with name '${child.getAttribute("public_name")}'`);
			topic_map.set(child.getAttribute("topic_id"), child.getAttribute("public_name"));
			topic_array.push(child.getAttribute("public_name"));
		}
		//console.log(`topic_array = ${topic_array}`);

		// Now process each topic in order
		for(var t = 0; t < topics.length; t++) {
			await RealmWorksImporter.writeTopic(topics[t], jpack, topic_map, topic_array);
		}
	}

} // class


// For local testing
if (!online) {
	const fs = require('fs');
	const xmlString = /*await*/ fs.readFileSync('D:/Documents/Realm Works/Output/OGL Pathfinder 7.rwoutput', 'utf8');
	RealmWorksImporter.parseXML(xmlString, null);
}