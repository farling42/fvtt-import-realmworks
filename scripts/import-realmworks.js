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


class RealmWorksImporter extends Application
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
			let current_topic = html.find('[name=current-topic]');
			console.log(`**** current_topic = ${current_topic}`);
			
			// Do the actual work!
			this.parseXML(inputRW, compendiumName, current_topic);
		});
		this.close();
	}

	// Foundry VTT: find either an existing compendium, or create a new one.
	async getCompendiumWithType(compendiumName, type){
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
	//
	writeContents(node, linkage_names) {
		// Replace '<scan>something</scan>' with '@Compendium[world.packname.<topic-for-something>]{something}'
		// @Compendium is case sensitive when using names!
		const pack_name = this.journal_pack.collection;
		return node.textContent.replace(/<span>([^<]+)<\/span>/g, 
			function(match,p1,offset,string) {
				for (const [key, labels] of linkage_names) {
					// case insensitive search across all entries in the Array() stored in the map.
					if (labels.some(item => (item.localeCompare(p1, undefined, { sensitivity: 'base' }) == 0) )) {
						const result = labels[0];
						if (p1 == result)
							return `@Compendium[${pack_name}.${result}]`;
						else
							return `@Compendium[${pack_name}.${result}]{${p1}}`;
					}
				};
				// Not found in map, so just create a broken link.
				return `@Compendium[${pack_name}.${p1}]`;
			});
	}

	// Predefined snippet types have 'facet_name' attribute
	// User-defined snippets have 'label' attribute
	facetNameLabel(node) {
		let name = node.getAttribute('facet_name');
		if (name == null || name == "") name = node.getAttribute('label');
		return name;
	}

	//
	// Write one RW section
	//
	writeSection(section, level, linkage_names) {
		// Process all the snippets and sections in order
		const name = section.getAttribute("name");
		//console.log(`writeSection(${level}, '${name}'})`);
		let result = `<H${level}>${name}</H${level}>`;
		
		// Process all child nodes in this section
		for (const child of section.childNodes) {
			if (child.nodeName == "section") {
				// Subsections increase the HEADING number
				console.log(`nested section ${child.getAttribute("name")}`);
				result += this.writeSection(child, level+1, linkage_names);
			}
			else if (child.nodeName == "snippet") {
				// Snippets contain the real information!
				const sntype = child.getAttribute("type");
				
				if (sntype == "Multi_Line") {
					for (const snip of child.childNodes) {
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += this.writeContents(snip, linkage_names);
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
					for (const snip of child.childNodes) {
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += `<p><b>${label}:</b></p>${this.writeContents(snip, linkage_names)}`;		// TODO - label needs to be inside first <p>
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
					for (const snip of child.childNodes) {
						if (snip.nodeName == "contents") {
							// contents child (it will already be in encoded-HTML)
							result += `<p><b>${label}:</b> ${this.writeContents(snip, linkage_names)}</p>`;
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
					result += `<p><b>${this.facetNameLabel(child)}:</b> ${tag.getAttribute('tag_name')}</p>`;
					// annotation
				}
				else if (sntype == "Tag_Multi_Domain") {
					let items = [];
					for (const snip of child.childNodes) {
						if (snip.nodeName == "tag_assign") {
							items.push(`${snip.getAttribute('domain_name')}:${snip.getAttribute('tag_name')}`);
						}
					}
					result += `<p><b>${child.getAttribute('label')}:</b> ${items.join('; ')}</p>`;
				}
				else if (sntype == "Date_Game") {
					const tag = child.getElementsByTagName('game_date')[0];		// all descendents not just direct children
					result += `<p><b>${this.facetNameLabel(child)}:</b> ${tag.getAttribute("display")}</p>`;
					// annotation
				}
				else if (sntype == "Date_Range") {
					const tag = child.getElementsByTagName('date_range')[0];		// all descendents not just direct children
					result += `<p><b>${this.facetNameLabel(child)}:</b> ${tag.getAttribute("display_start")} to ${tag.getAttribute("display_end")}</p>`;
					// annotation
				}
				else if (sntype == "Portfolio") {
					 console.log(`Not implemented ${sntype}`);
					 // Use adm-zip to unpack the .por "file",
					 // then extract the .html inside the statblocks_html subdirectory.
				} else if (sntype == "Picture" ||
					sntype == "PDF" ||
					sntype == "Audio" ||
					sntype == "Video" ||
					sntype == "Statblock" ||
					sntype == "Foreign" ||
					sntype == "Rich_Text") {
					result += `<h3>${this.facetNameLabel(child)}</h3>`;
					
					//const ext_object = child.childNodes[0];  // <ext_object name="Portrait" type="Picture">
					const asset    = child.getElementsByTagName('asset')[0];  // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const contents = asset.getElementsByTagName('contents')[0];    // <contents>
					const filename = asset.getAttribute('filename');
					const fileext  = filename.split('.').pop();	// extra suffix from asset filename
					if (fileext == 'html' || fileext == 'htm' || fileext == "rtf")
						result += `${atob(contents.textContent)}`;
					else if (sntype == "Picture")
						result += `<p><img src="data:image/${fileext};base64,${contents.textContent}"></img></p>`;					
					else {
						let format = 'binary/octet-stream';
						if (fileext == 'pdf') {
							format = 'application/pdf';
						}
						result += `<p><a href="data:${format};base64,${contents.textContent}"></a></p>`;
					}
					 
				}
				else if (sntype == "Smart_Image") {
					//<snippet facet_name="Map" type="Smart_Image" search_text="">
					//  <smart_image name="Map">
					//    <asset filename="n5uvmpam.eb4.png">
					//      <contents>
					//	  <map_pin pin_name="Deneb Sector" topic_id="Topic_392" x="330" y="239">	-- topic_id is optional
					//		<description>Nieklsdia (Zhodani)</description> -- could be empty
					
					// These need to be created as Scenes (and linked from the original topic?)
					const asset    = child.getElementsByTagName('asset')[0];  // <asset filename="10422561_10153053819388385_8373621707661700909_n.jpg">
					const contents = asset.getElementsByTagName('contents')[0];    // <contents>
					const format   = asset.getAttribute('filename').split('.').pop();	// extra suffix from asset filename
					result += `<p><b>${this.facetNameLabel(child)}</b>: <img src="data:image/${format};base64,${contents.textContent}"></img></p>`;					
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

	writeLink(packname, linkage_names, topic_id, topic_name) {
		let tlink = linkage_names.get(topic_id);
		if (tlink && tlink[0] != topic_name) {
			return `@Compendium[${packname}.${tlink[0]}]{${topic_name}}`;
		}
		else {
			return `@Compendium[${packname}.${topic_name}]`;
		}
	}
	
	//
	// Write one RW topic
	//
	async writeTopic(topic) {
		console.log(`Importing '${topic.getAttribute("public_name")}'`);
		
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
				
		// Generate the HTML for the sections within the topic
		let html = "";
		let has_child_topics = false;
		for (const node of topic.childNodes) {
			if (node.nodeName == "section") {
				html += this.writeSection(node, 1, linkage_names);		// Start with H1
			} else if (node.nodeName == "topic") {
				// No need to handle nested topics, since we found all of them at the start.
				// Put link to child topic in original topic
				if (!has_child_topics) {
					html += "<H1>Child Topics</H1><ul>";
					has_child_topics = true;
				}
				html += `<li>${this.writeLink(this.journal_pack.collection, linkage_names, node.getAttribute("topic_id"), node.getAttribute("public_name"))}</li>`;
			//} else if (!node.nodeName.startsWith('#text')) {
				// tag_assign - no need to include these
				// linkage - handled above
				//console.log (`Unexpected node in topic ${node.nodeName}`);
			}
		}
		if (has_child_topics) {
			html += '</ul>';
		}
		
		// Now create the correct journal entry:
		//    name = prefix + public_name + suffix
		// Replace if the name already exists
		let entry = await this.journal_pack.index.find(e => e.name === topic.getAttribute("public_name"));
		if (entry) {
			//console.log(`*** Deleting old entry for ${topic.getAttribute("public_name")}`);
			await this.journal_pack.deleteEntity(entry._id);
		}

		let journal = await JournalEntry.create({
			name: topic.getAttribute("public_name"),
			content: html
		}, { displaySheet: false, temporary: true });
			
		// Add to the requested Compendium pack
		await this.journal_pack.importEntity(journal);
		await this.journal_pack.getIndex(); // Need to refresh the index to update it

		//console.log(`Finished importing '${topic.getAttribute("public_name")}'`);
	}

	//
	// Parse the entire Realm Works file supplied in 'xmlString'
	// and put each individual topic into the compendium named '<compendiumName>-journal'
	//
	async parseXML(xmlString, compendiumName, ui_label)
	{
		console.log(`Starting for ${compendiumName}`);
		this.journal_pack = await this.getCompendiumWithType(compendiumName, "JournalEntry");

		if (ui_label) ui_label.val('--- Starting ---');

		let parser = new DOMParser();
		let xmlDoc = parser.parseFromString(xmlString,"text/xml");
		
		const topics = xmlDoc.getElementsByTagName('topic');  // all descendents, not just direct children

		// Create a mapping from topic_id to public_name for all topic elements, required for creating "@Compendium[<packname>."mapping[linkage:target_id]"]{"linkage:target_name"}" entries.
		// Also collect aliases for each topic:
		// <alias alias_id="Alias_1" name="Barracks Emperors" />
		this.topic_names = new Map();
		for (const child of topics) {
			//console.log(`Found topic '${child.getAttribute("topic_id")}' with name '${child.getAttribute("public_name")}'`);
			let names = new Array();
			names.push(child.getAttribute("public_name"));
			
			for (const alias of child.childNodes) {
				if (alias.nodeName == "alias") {
					names.push(alias.getAttribute('name'));
				}
			};
			this.topic_names.set(child.getAttribute("topic_id"), names);
		};
	
		// Now process each topic in order
		for (const topic of topics) {
			if (ui_label) ui_label.val(topic.getAttribute('public_name'));
			await this.writeTopic(topic);
		}
		if (ui_label) ui_label.val('--- Finished ---');
	}
} // class
