export default class RWDND5EActor {
	
	static tool_proficiencies = {
		// These are in HL but not in DND5E Items (SRD) compendium
		"playing card set": "card",
		"three-dragon ante set": "card",
		"dragonchess set": "chess",
	};

	static once;
	static ability_names = {};
	static skill_names   = {};
	static spell_schools = {};
	static armor_profs   = {};
	static actor_sizes   = {}; // not lower case

	static item_names = {
		"dragonchess set" : "gaming set of chess",
		"acid" : "acid (vial)",
	}
	
	static async initModule() {
		if (RWDND5EActor.once) return;
		RWDND5EActor.once=true;

		// Create look-up tables from the system's data tables
		const skills = CONFIG.DND5E.skills;
		for (const [key,value] of Object.entries(skills)) {
			RWDND5EActor.skill_names[value.label] = key;
		}
		const schools = CONFIG.DND5E.spellSchools;
		for (const [key,value] of Object.entries(schools)) {
			RWDND5EActor.spell_schools[value.toLowerCase()] = key;
		}
		const abilities = CONFIG.DND5E.abilities;  // both "strength" and "str" are stored with "str" as the value
		for (const [key,value] of Object.entries(abilities)) {
			RWDND5EActor.ability_names[value.toLowerCase()] = key;
			RWDND5EActor.ability_names[key] = key;
		}
		const tools = CONFIG.DND5E.toolIds;
		let item_pack = await game.packs.find(p => p.metadata.name === 'items');
		for (const [key,value] of Object.entries(tools)) {
			// Find name from Items compendium
			RWDND5EActor.tool_proficiencies[item_pack.index.get(value).name.toLowerCase()] = key;
		}
		const armorprofs = CONFIG.DND5E.armorProficiencies;
		for (const [key,value] of Object.entries(armorprofs)) {
			RWDND5EActor.armor_profs[value.toLowerCase()] = key;
		}
		const actorSizes = CONFIG.DND5E.actorSizes;
		for (const [key,value] of Object.entries(actorSizes)) {
			RWDND5EActor.actor_sizes[value] = key;  // not lower case
		}
	}

	static async createActorData(character) {
		// The main character
		let result = [ await RWDND5EActor.createOneActorData(character) ];
		// The minions
		if (character.minions?.character) {
			for (const minion of (Array.isArray(character.minions.character) ? character.minions.character : [character.minions.character])) {
				result.push (await RWDND5EActor.createOneActorData(minion));
			}
		}
		return result;
	}
	
	static async createOneActorData(character) {

		console.debug(`Parsing DND5E actor '${character.name}'`);
		
		function addParas(string) {
			if (!string) return "";
			return `<p>${string.replace(/\n/g,'</p><p>')}</p>`;
		}
		function toArray(thing) {
			return !thing ? [] : Array.isArray(thing) ? thing : [thing];
		}
		function getNumber(string) {
			let num = string.replaceAll(/[^0-9]/g,'');
			return +num;
		}
		
		// A HL file will have EITHER <xp> or <challengerating> & <xpaward>
		let actor = {
			name: character.name,
			type: (character.role === 'pc') ? 'character' : 'npc',		// 'npc' or 'character'
			relationship : character.relationship,
			system: {
				// common template: abilities, attributes, details, traits, currency
				abilities: {},
				attributes: {},
				details: {},
				traits: {},
				currency: {},
				// creature template: attributes, details, skills, traits, spells, bonuses
				skills: {},
				spells: {},
				bonuses: {},
				// 'character' type: attributes, details, resources, traits
				resources: {},
				// 'npc' type: details, resources
				
			},
			items: [],		// add items with :   items.push(new Item(itemdata).data)
		};

		//
		// COMMON template
		//
		
		// Abilities:   name : { value : number , proficient : 0|1 }
		for (const stat of character.abilityscores.abilityscore) {
			actor.system.abilities[RWDND5EActor.ability_names[stat.name.toLowerCase()]] = {
				value      : +stat.abilvalue.base,
				proficient : stat.savingthrow.isproficient === "no" ? 0 : 1,
			};
		}
		
		// Attributes:
		// ac : { flat : null, calc : "default", formula : "" }
		// init : ( value : 0, bonus: 0 }
		// movement : { burrow : 0, climb: 0, fly: 0, swim: 0, walk: 30, units: "ft", hover: false }
		let natural = 0;
		for (const def of toArray(character.otherspecials.special)) {
			if (def.name === 'Natural Armor') natural = +character.armorclass.fromnatural + 10;
		}
		actor.system.attributes.ac = {
			flat : natural,
			calc : natural ? "natural" : "default",
			formula: ""
		};
		// hp : { value : 0, min: 0,max: 10, temp: 0, tempmax: 0 }
		actor.system.attributes.hp = { value : +character.health.currenthp, max: +character.health.hitpoints };
		// init : { value: 0, bonus: 0 }    - allow it to be auto-calculated
		actor.system.attributes.movement = { walk: +character.movement.basespeed.value };
		// actor.details.biography = { value : "", public: "" }
		
		function resist(string, predefined) {
			let values = [];
			let custom = [];
			for (const item of string.split(', ')) {
				let lower = item.toLowerCase();
				if (lower in predefined)
					values.push(lower);
				else
					custom.push(item);
			}
			return { value : values, custom : custom.join(';') }
		}
		actor.system.traits = {
			di: resist(character.damageimmunities.text,      CONFIG.DND5E.damageTypes),
		    dr: resist(character.damageresistances.text,     CONFIG.DND5E.damageTypes),
			dv: resist(character.damagevulnerabilities.text, CONFIG.DND5E.damageTypes),
			ci: resist(character.conditionimmunities.text,   CONFIG.DND5E.conditionTypes),
			size: RWDND5EActor.actor_sizes[character.size.name]
		};
		
		for (const money of character.money.coins) {
			actor.system.currency[money.abbreviation] = +money.count;
		}
		
		//
		// CREATURE template
		//
		//character.senses.?
		actor.system.attributes.senses = {
			darkvision  : 0,
			blindsight  : 0,
			tremorsense : 0,
			truesight   : 0,
			units   : "ft",
			special : "",
		}
		for (const spec of toArray(character.otherspecials.special)) {
			let name = spec.name.toLowerCase();
			if (name.startsWith("darkvision"))
				actor.system.attributes.senses.darkvision = getNumber(name);
			else if (name.startsWith("blindsight"))
				actor.system.attributes.senses.blindsight = getNumber(name);
			else if (name.startsWith("tremorsense")) 
				actor.system.attributes.senses.tremorsense = getNumber(name);
			else if (name.startsWith("truesight"))
				actor.system.attributes.senses.truesight = getNumber(name);
		}
		
		//actor.system.spellcasting = "int"		-- TODO
		actor.system.details = {
			alignment: character.alignment.name,
			race     : character.race.displayname,
		}
		for (const skill of toArray(character.skills.skill)) {
			let name = skill.name;
			// value : 0 (not proficient), 0.5 (half proficient), 1 (proficient), 2 (expertise)
			actor.system.skills[RWDND5EActor.skill_names[name]] = {
				value  : skill.isprofdoubled ? 2 : skill.isproficient ? 1 : 0,
				ability: skill.abilabbreviation.toLowerCase(),
			}
		}
		
		actor.system.traits.languages = { value: [], custom: "" };
		let lcust = [];
		for (const lang of toArray(character.languages.language)) {
			let name = lang.name.toLowerCase();
			if (name === "deep speech")
				actor.system.traits.languages.value.push("deep");
			else if (CONFIG.DND5E.languages[name])
				actor.system.traits.languages.value.push(name);
			else
				lcust.push(lang.name);
		}
		actor.system.traits.languages.custom = lcust.join(';');
		
		// actor.system.spells - TODO
		// actor.system.spells = []
		// actor.system.spells[x] = { value: 0, override: null }
		
		let dc;
		for (const clas of toArray(character.classes.class)) {
			if (clas.spellsavedc) dc = clas.spellsavedc;
		}
		
		actor.system.bonuses = {
			mwak : { attack: "", damage: "" },		// melee  weapon attack
			rwak : { attack: "", damage: "" },		// ranged weapon attack
			msak : { attack: "", damage: "" },		// melee  spell attack
			rsak : { attack: "", damage: "" },		// ranged spell attack
			abilities : { check: "", save: "", skill: "" },
			spell : { dc : "" },
		}
		
		//
		// EXTRA for 'character'
		//
		if (actor.type === 'character') {
			//actor.system.attributes.death = { success: 0, failure: 0 }
			let insp = 0;
			for (const res of toArray(character.trackedresources.trackedresource)) {
				if (res.name === 'Inspiration')
					actor.system.attributes.inspiration = +res.left;
			}
			//actor.system.details.background = ""
			//actor.system.details.originalClass = ""
			actor.system.details.xp = { value: character.xp.total /*, min: 0, max: 300*/ }
			//actor.system.details.appearance = "";
			let traits = [];
			for (const bg of toArray(character.background.backgroundtrait)) {
				let txt = bg["#text"];
				switch (bg.type) {
					case 'personalitytrait':
						traits.push(txt);
						break;
					case 'ideal':
						actor.system.details.ideal = txt;
						break;
					case 'bond':
						actor.system.details.bond = txt;
						break;
					case 'flaw':
						actor.system.details.flaw = txt;
						break;
				}
			}
			actor.system.details.trait = traits.join('\n');
			/*actor.system.resources = {
				primary:   { value: 0, max: 0, sr: 0, lr: 0 },
				secondary: { value: 0, max: 0, sr: 0, lr: 0 },
				tertiary:  { value: 0, max: 0, sr: 0, lr: 0 },
			}*/
			actor.system.traits.weaponProf = { value: [], custom: "" };
			let wcust = [];
			for (const prof of character.weaponproficiencies.text.split('; ')) {
				if (prof === 'Martial weapons')
					actor.system.traits.weaponProf.value.push('mar');
				else if (prof === 'Simple weapons')
					actor.system.traits.weaponProf.value.push('sim');
				else {
					let wpn = prof.toLowerCase();
					// Swap something like "Crossbow, Hand" to become "Hand Crossbow"
					let pos = wpn.indexOf(', ');
					if (pos > 0) wpn = wpn.slice(pos+2) + ' ' + wpn.slice(0,pos);
					
					let min = wpn.toLowerCase().replaceAll(' ','');
					if (CONFIG.DND5E.weaponIds[min])
						actor.system.traits.weaponProf.value.push(min);
					else 
						wcust.push(prof);
				}
			}
			actor.system.traits.weaponProf.custom = wcust.join(';');
		
			actor.system.traits.armorProf = { value: [], custom: "" };
			let acust = [];
			for (const prof of character.armorproficiencies.text.split('; ')) {
				let id = RWDND5EActor.armor_profs[prof.toLowerCase()];
				if (id)
					actor.system.traits.armorProf.value.push(id);
				else
					acust.push(prof);
			}
			actor.system.traits.armorProf.custom = acust.join(';');
		
			actor.system.traits.toolProf = { value: [], custom: "" };
			let tcust = [];
			for (const prof of character.toolproficiencies.text.split('; ')) {
				let tool = RWDND5EActor.tool_proficiencies[prof.toLowerCase()]
				if (tool)
					actor.system.traits.toolProf.value.push(tool)
				else
					tcust.push(prof);
			}
			actor.system.traits.toolProf.custom = tcust.join(';');
		} else if (actor.type === 'npc') {
			//
			// EXTRA for 'npc'
			//
			actor.system.details.type = { value: "", subtype: "", swarm: "", custom: "" }
			actor.system.details.environment = ""
			actor.system.details.cr = +character.challengerating.value;
			actor.system.details.spellLevel = 0
			actor.system.details.xp = { value: +character.xpaward.value }
			actor.system.details.source = ""
			actor.system.resources.legact = { value: 0, max: 0 }
			actor.system.resources.legres = { value: 0, max: 0 }
			actor.system.resources.lair   = { value: 0, initiative: 0 }
		}

		//
		// ITEMS : inventory (character.gear)
		//
		
		if (character.gear.item) {
			const item_pack = await game.packs.find(p => p.metadata.name === 'items');
			for (const item of toArray(character.gear.item)) {
				// HL puts bonus into the name of the item, so remove it
				let name = item.name.replace(/ \(+.*/,'');
				if (name.endsWith('lbs)') || name.endsWith('empty)')) name = name.replace(/\(+.*/,'');
				let lower = name.toLowerCase();
				
				const othername = RWDND5EActor.item_names[lower];
				if (othername) lower = othername;
			
				const entry = item_pack.index.find(e => {	
					const elc = e.name.toLowerCase().replace("’","'"); 
					return elc === lower || elc === lower + ' armor';
				});
				
				if (entry) {
					let itemdata = (await item_pack.getDocument(entry._id)).toObject();
					if (othername) itemdata.name = name;
					itemdata.system.quantity = +item.quantity;
					// Equipped state of equipment is stored in the melee/ranged/defenses section
					let equipped = false;
					for (const armor of toArray(character.defenses.armor)) {
						if (armor.name === item.name) {
							if (armor.equipped) equipped = true;
							break;
						}
					}
					for (const wpn of toArray(character.melee.weapon)) {
						if (wpn.name === item.name) {
							if (wpn.equipped) equipped = true;
							break;
						}
					}
					for (const wpn of toArray(character.ranged.weapon)) {
						if (wpn.name === item.name) {
							if (wpn.equipped) equipped = true;
							break;
						}
					}
					if (equipped) itemdata.system.equipped = true;
					actor.items.push(itemdata);
				} else {
					// Create our own placemarker item.
					const itemdata = {
						name: name,
						type: 'loot',
						img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
						system: {
							// itemDescription template
							description: {
								value: addParas(item.description['#text']),
								chat:  "",
								unidentified: "",
							},
							source: "",
							
							// physicalItem template
							quantity: +item.quantity,
							weight:   +item.weight.value,
							price:    +item.cost.value,
							attunement: 0,
							equipped:   false,
							rarity:     "common",
							identified: true,
						},
					};
					actor.items.push(itemdata);
				}
			}
		}

		// All known spells
		
		const spell_pack = await game.packs.find(p => p.metadata.name === 'spells');
		async function addSpells(spells) {
			if (!spells) return;
			for (const spell of toArray(spells)) {
				const lower = spell.name.toLowerCase();
				const entry = spell_pack.index.find(e => {	
					const elc = e.name.toLowerCase(); 
					return elc === lower;
				});
				if (entry) {
					actor.items.push((await spell_pack.getDocument(entry._id)).toObject());
				} else {
					// Create our own placemarker item.
					let itemdata = {
						name: spell.name,
						type: 'spell',
						img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
						system: {
							// itemDescription template
							description: {
								value: addParas(spell.description['#text']),
								chat:  "",
								unidentified: "",
							},
							source: "",
							
							// activatedEffect template
							activation: {
								type: spell.casttime.startsWith("1 reaction") ? "reaction" :
									  spell.casttime.startsWith("1 bonus action") ? "bonus" :
									  spell.casttime.startsWith("1 action") ? "action" :
									  spell.casttime,
								cost: parseInt(spell.casttime),
								condition: ""
							},
							duration:   { value: null, units: "" },
							target:     { value: null, width: null, units: "", type: "" },
							range:      { value: spell.range, "long": null, units: "" },
							uses:       { value: 0, max: 0, per: null },
							consume:    { type: "", target: null, amount: null },
							
							// action Template
							ability:    null,
							actionType: null,
							attackBonus: 0,
							chatFlavor: "",
							critical: null,
							damage: {
								parts: [],
								versatile: "",
							},
							formula: "",
							save: {
								ability: "",
								dc: null,
								scaling: "spell",
							},
							
							// 'spell' item type
							level:  parseInt(spell.level),
							school: RWDND5EActor.spell_schools[spell.schooltext.toLowerCase()],
							components: {
								value:    "",
								vocal:    false,
								somatic:  false,
								material: false,
								ritual:   false,
								concentration: spell.duration.startsWith("Concentration"),
							},
							materials: {
								value:    "",
								consumed: false,
								cost:     0,
								supply:   0,
							},
							preparation: {
								mode: "prepared",
								prepared: false,
							},
							scaling: {
								mode: "none",
								formula: null,
							},
						},
					};
					for (const comp of toArray(spell.spellcomp)) {
						let label = comp["#text"];
						if      (label === 'Verbal')   itemdata.system.components.vocal    = true;
						else if (label === 'Somatic')  itemdata.system.components.somatic  = true;
						else if (label === 'Material') itemdata.system.components.material = true;
					}

					actor.items.push(itemdata);
				}
			}
		}
		await addSpells(character.cantrips.spell);
		await addSpells(character.spellsknown.spell);
		await addSpells(character.spellsmemorized.spell)
		
		// Special Abilities
		
		const classab_pack = await game.packs.find(p => p.metadata.name === 'classfeatures');
		const races_pack   = await game.packs.find(p => p.metadata.name === 'races');
		const packs = [ classab_pack, races_pack ];
		
		for (const ability of toArray(character.otherspecials.special)) {
			let entry, pack;
			for (const onepack of packs) {
				const lower = ability.name.toLowerCase();
				entry = onepack.index.find(e => {	
					const elc = e.name.toLowerCase(); 
					return elc === lower;
				});
				if (entry) {
					pack = onepack;
					break;
				}
			}
			
			if (entry) {
				actor.items.push((await pack.getDocument(entry._id)).toObject());
			} else {
				// Add a "feat"
				let itemdata = {
					name: ability.name,
					type: 'feat',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
						// itemDescription template
						description: {
							value: addParas(ability.description['#text']),
							chat:  "",
							unidentified: "",
						},
						source: "",
							
						// activatedEffect template
						activation: {
							type: "",
							cost: 0,
							condition: ""
						},
						duration:   { value: null, units: "" },
						target:     { value: null, width: null, units: "", type: "" },
						range:      { value: null, "long": null, units: "" },
						uses:       { value: 0, max: 0, per: null },
						consume:    { type: "", target: null, amount: null },
							
						// action Template
						ability:    null,
						actionType: null,
						attackBonus: 0,
						chatFlavor: "",
						critical: null,
						damage: {
							parts: [],
							versatile: "",
						},
						formula: "",
						save: {
							ability: "",
							dc: null,
							scaling: "spell",
						},
						
						// feat
						requirements: "",
						recharge: {
							value: null,
							charged: false,
						}
					}						
				}
				actor.items.push(itemdata);
			}
		}
		
		// classes
		const class_pack = await game.packs.find(p => p.metadata.name === 'classes');
		for (const cls of toArray(character.classes.class)) {
			const lower = cls.name.toLowerCase();
			const entry = class_pack.index.find(e => {
				const elc = e.name.toLowerCase(); 
				return elc === lower;
			});
			
			if (entry) {
				let itemdata = (await class_pack.getDocument(entry._id)).toObject();
				itemdata.system.levels = cls.level;
				actor.items.push(itemdata);
			} else {
				let itemdata = {
					name: cls.name,
					type: 'class',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
						// itemDescription template
						description: {
							value: "",
							chat:  "",
							unidentified: "",
						},
						source: "",
					
						// class
						levels: cls.level,
						subclass: "",
						hitDice: `d${cls.classhitdice.sides}`,
						hitDiceUsed: 0,
						saves: [],
						skills: {
							number: 2,
							choices: [],
							value: [],
						},
						spellcasting: {
							progression: "none",
							ability: "",
						},
					}
				}
				// Some NPC classes don't have a description
				if (cls.description) itemdata.system.description.value = addParas(cls.description['#text']);
				actor.items.push(itemdata);
			}
		}
		return actor;
	}
}

//details: { biography: { value: html }}} 