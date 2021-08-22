import { DND5E } from "../../../systems/dnd5e/module/config.js";

export default class RWDND5EActor {

	static ability_names = {
		"strength" : "str",
		"dexterity" : "dex",
		"constitution" : "con",
		"intelligence" : "int",
		"wisdom" : "wis",
		"charisma" : "cha",
		// Just so that we don't have to have conditional code to check if it is long or short name
		"str" : "str",
		"dex" : "dex",
		"con" : "con",
		"int" : "int",
		"wis" : "wis",
		"cha" : "cha"
	};
	
	static tool_proficiencies = {
	"alchemist's supplies": "alchemist",
	"bagpipes": "bagpipes",
	"brewer's supplies": "brewer",
	"calligrapher's supplies": "calligrapher",
	"playing card set": "card",
	"three-dragon ante set": "card",
	"carpenter's tools": "carpenter",
	"cartographer's tools": "cartographer",
	"dragonchess set": "chess",
	"cobbler's tools": "cobbler",
	"cook's utensils": "cook",
	"dice set": "dice",
	"disguise kit": "disg",
	"drum": "drum",
	"dulcimer": "dulcimer",
	"flute": "flute",
	"forgery kit": "forg",
	"glassblower's tools": "glassblower",
	"herbalism kit": "herb",
	"horn": "horn",
	"jeweler's tools": "jeweler",
	"leatherworker's tools": "leatherworker",
	"lute": "lute",
	"lyre": "lyre",
	"mason's tools": "mason",
	"navigator's tools": "navg",
	"painter's supplies": "painter",
	"pan flute": "panflute",
	"poisoner's kit": "pois",
	"potter's tools": "potter",
	"shawm": "shawm",
	"smith's tools": "smith",
	"thieves' tools": "thief",
	"tinker's tools": "tinker",
	"viol": "viol",
	"weaver's tools": "weaver",
	"woodcarver's tools": "woodcarver",
	}
	
	static skill_names = {
		"Acrobatics"      : "acr",
		"Animal Handling" : "ani",
		"Arcana"          : "arc",
		"Athletics"       : "ath",
		"Deception"       : "dec",
		"History"         : "his",
		"Insight"         : "ins",
		"Intimidation"    : "itm",
		"Investigation"   : "inv",
		"Medicine"        : "med",
		"Nature"          : "nat",
		"Perception"      : "prc",
		"Performance"     : "prf",
		"Persuasion"      : "per",
		"Religion"        : "rel",
		"Sleight of Hand" : "slt",
		"Stealth"         : "ste",
		"Survival"        : "sur",
	}
	
	static item_names = {
		"dragonchess set" : "gaming set of chess",
		"acid" : "acid (vial)",
	}
	
	static spell_schools = {
		"abjuration"  : "abj",
		"conjuration" : "con",
		"divination"  : "div",
		"enchantment" : "enc",
		"evocation"   : "evo",
		"illusion"    : "ill",
		"necromancy"  : "nec",
		"transmutation" : "trs",
	}
	
	static async initModule() {
		// Ensure all packs have valid indices
		await game.packs.find(p => p.metadata.name === 'classes')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'classfeatures')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'heroes')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'items')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'monsterfeatures')?.getIndex();	// creature types
		await game.packs.find(p => p.metadata.name === 'monsters')?.getIndex();	// creature types
		await game.packs.find(p => p.metadata.name === 'racialfeatures')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'races')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'rules')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'spells')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'tradegoods')?.getIndex();
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

		console.log(`Parsing DND5E actor '${character.name}'`);
		
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
			data: {
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
		for (let stat of character.abilityscores.abilityscore) {
			actor.data.abilities[RWDND5EActor.ability_names[stat.name.toLowerCase()]] = {
				value      : +stat.abilvalue.base,
				proficient : stat.savingthrow.isproficient === "no" ? 0 : 1,
			};
		}
		
		// Attributes:
		// ac : { flat : null, calc : "default", formula : "" }
		// init : ( value : 0, bonus: 0 }
		// movement : { burrow : 0, climb: 0, fly: 0, swim: 0, walk: 30, units: "ft", hover: false }
		let natural = 0;
		for (let def of toArray(character.otherspecials.special)) {
			if (def.name === 'Natural Armor') natural = +character.armorclass.fromnatural + 10;
		}
		actor.data.attributes.ac = {
			flat : natural,
			calc : natural ? "natural" : "default",
			formula: ""
		};
		// hp : { value : 0, min: 0,max: 10, temp: 0, tempmax: 0 }
		actor.data.attributes.hp = { value : +character.health.currenthp, max: +character.health.hitpoints };
		// init : { value: 0, bonus: 0 }    - allow it to be auto-calculated
		actor.data.attributes.movement = { walk: +character.movement.basespeed.value };
		// actor.details.biography = { value : "", public: "" }
		
		//actor.traits.di = { value : [], custom: "" };
		actor.data.traits = {};
		
		function resist(string, predefined) {
			let values = [];
			let custom = [];
			for (let item of string.split(', ')) {
				let lower = item.toLowerCase();
				if (lower in predefined)
					values.push(lower);
				else
					custom.push(item);
			}
			return { value : values, custom : custom.join(';') }
		}
		actor.data.traits.di = resist(character.damageimmunities.text,      DND5E.damageTypes);
		actor.data.traits.dr = resist(character.damageresistances.text,     DND5E.damageTypes);
		actor.data.traits.dv = resist(character.damagevulnerabilities.text, DND5E.damageTypes);
		actor.data.traits.ci = resist(character.conditionimmunities.text,   DND5E.conditionTypes);
		
		switch (character.size.name) {
			case 'Tiny':       actor.data.traits.size = "tny";  break;
			case 'Small':      actor.data.traits.size = "sm";   break;
			case 'Medium':     actor.data.traits.size = "med";  break;
			case 'Large':      actor.data.traits.size = "lg";   break;
			case 'Huge':       actor.data.traits.size = "huge"; break;
			case 'Gargantuan': actor.data.traits.size = "grg";  break;
		}
		
		for (let money of character.money.coins) {
			actor.data.currency[money.abbreviation] = +money.count;
		}
		
		//
		// CREATURE template
		//
		//character.senses.?
		actor.data.attributes.senses = {
			darkvision  : 0,
			blindsight  : 0,
			tremorsense : 0,
			truesight   : 0,
			units   : "ft",
			special : "",
		}
		for (let spec of toArray(character.otherspecials.special)) {
			let name = spec.name.toLowerCase();
			if (name.startsWith("darkvision"))
				actor.data.attributes.senses.darkvision = getNumber(name);
			else if (name.startsWith("blindsight"))
				actor.data.attributes.senses.blindsight = getNumber(name);
			else if (name.startsWith("tremorsense")) 
				actor.data.attributes.senses.tremorsense = getNumber(name);
			else if (name.startsWith("truesight"))
				actor.data.attributes.senses.truesight = getNumber(name);
		}
		
		//actor.data.spellcasting = "int"		-- TODO
		actor.data.details = {
			alignment: character.alignment.name,
			race     : character.race.displayname,
		}
		for (let skill of toArray(character.skills.skill)) {
			let name = skill.name;
			// value : 0 (not proficient), 0.5 (half proficient), 1 (proficient), 2 (expertise)
			actor.data.skills[RWDND5EActor.skill_names[name]] = {
				value  : skill.isprofdoubled ? 2 : skill.isproficient ? 1 : 0,
				ability: skill.abilabbreviation.toLowerCase(),
			}
		}
		
		actor.data.traits.languages = { value: [], custom: "" };
		let lcust = [];
		for (let lang of toArray(character.languages.language)) {
			let name = lang.name.toLowerCase();
			if (name === "deep speech")
				actor.data.traits.languages.value.push("deep");
			else if (CONFIG.DND5E.languages[name])
				actor.data.traits.languages.value.push(name);
			else
				lcust.push(lang.name);
		}
		actor.data.traits.languages.custom = lcust.join(';');
		
		// actor.data.spells - TODO
		// actor.data.spells = []
		// actor.data.spells[x] = { value: 0, override: null }
		
		let dc;
		for (let clas of toArray(character.classes.class)) {
			if (clas.spellsavedc) dc = clas.spellsavedc;
		}
		
		actor.data.bonuses = {
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
			//actor.data.attributes.death = { success: 0, failure: 0 }
			let insp = 0;
			for (let res of toArray(character.trackedresources.trackedresource)) {
				if (res.name === 'Inspiration')
					actor.data.attributes.inspiration = +res.left;
			}
			//actor.data.details.background = ""
			//actor.data.details.originalClass = ""
			actor.data.details.xp = { value: character.xp.total /*, min: 0, max: 300*/ }
			//actor.data.details.appearance = "";
			let traits = [];
			for (let bg of toArray(character.background.backgroundtrait)) {
				let txt = bg["#text"];
				switch (bg.type) {
					case 'personalitytrait':
						traits.push(txt);
						break;
					case 'ideal':
						actor.data.details.ideal = txt;
						break;
					case 'bond':
						actor.data.details.bond = txt;
						break;
					case 'flaw':
						actor.data.details.flaw = txt;
						break;
				}
			}
			actor.data.details.trait = traits.join('\n');
			/*actor.data.resources = {
				primary:   { value: 0, max: 0, sr: 0, lr: 0 },
				secondary: { value: 0, max: 0, sr: 0, lr: 0 },
				tertiary:  { value: 0, max: 0, sr: 0, lr: 0 },
			}*/
			actor.data.traits.weaponProf = { value: [], custom: "" };
			let wcust = [];
			for (let prof of character.weaponproficiencies.text.split('; ')) {
				if (prof === 'Martial weapons')
					actor.data.traits.weaponProf.value.push('mar');
				else if (prof === 'Simple weapons')
					actor.data.traits.weaponProf.value.push('sim');
				else {
					let wpn = prof.toLowerCase();
					// Swap something like "Crossbow, Hand" to become "Hand Crossbow"
					let pos = wpn.indexOf(', ');
					if (pos > 0) wpn = wpn.slice(pos+2) + ' ' + wpn.slice(0,pos);
					
					let min = wpn.toLowerCase().replaceAll(' ','');
					if (DND5E.weaponIds[min])
						actor.data.traits.weaponProf.value.push(min);
					else 
						wcust.push(prof);
				}
			}
			actor.data.traits.weaponProf.custom = wcust.join(';');
		
			actor.data.traits.armorProf = { value: [], custom: "" };
			let acust = [];
			for (let prof of character.armorproficiencies.text.split('; ')) {
				if (prof === 'Light armor')
					actor.data.traits.armorProf.value.push('lgt');
				else if (prof === 'Medium armor')
					actor.data.traits.armorProf.value.push('med');
				else if (prof === 'Heavy armor')
					actor.data.traits.armorProf.value.push('hvy');
				else if (prof === 'Shields')
					actor.data.traits.armorProf.value.push('shl');
				else
					acust.push(prof);
			}
			actor.data.traits.armorProf.custom = acust.join(';');
		
			actor.data.traits.toolProf = { value: [], custom: "" };
			let tcust = [];
			for (let prof of character.toolproficiencies.text.split('; ')) {
				let tool = RWDND5EActor.tool_proficiencies[prof.toLowerCase()]
				if (tool)
					actor.data.traits.toolProf.value.push(tool)
				else
					tcust.push(prof);
			}
			actor.data.traits.toolProf.custom = tcust.join(';');
		}
		
		//
		// EXTRA for 'npc'
		//
		if (actor.type === 'npc') {
			actor.data.details.type = { value: "", subtype: "", swarm: "", custom: "" }
			actor.data.details.environment = ""
			actor.data.details.cr = 1
			actor.data.details.spellLevel = 0
			actor.data.details.xp = { value: 10 }
			actor.data.details.source = ""
			actor.data.resources.legact = { value: 0, max: 0 }
			actor.data.resources.legres = { value: 0, max: 0 }
			actor.data.resources.lair   = { value: 0, initiative: 0 }
		}

		//
		// ITEMS : inventory (character.gear)
		//
		
		if (character.gear.item) {
			let item_pack = await game.packs.find(p => p.metadata.name === 'items');
			for (let item of toArray(character.gear.item)) {
				// HL puts bonus into the name of the item, so remove it
				let name = item.name.replace(/ \(+.*/,'');
				if (name.endsWith('lbs)') || name.endsWith('empty)')) name = name.replace(/\(+.*/,'');
				let lower = name.toLowerCase();
				
				const othername = RWDND5EActor.item_names[lower];
				if (othername) lower = othername;
			
				let entry = item_pack.index.find(e => {	
					const elc = e.name.toLowerCase().replace("’","'"); 
					return elc === lower || elc === lower + ' armor';
				});
				
				if (entry) {
					let itemdata = (await item_pack.getDocument(entry._id)).data.toObject();
					if (othername) itemdata.name = name;
					itemdata.data.quantity = +item.quantity;
					// Equipped state of equipment is stored in the melee/ranged/defenses section
					let equipped = false;
					for (let armor of toArray(character.defenses.armor)) {
						if (armor.name === item.name) {
							if (armor.equipped) equipped = true;
							break;
						}
					}
					for (let wpn of toArray(character.melee.weapon)) {
						if (wpn.name === item.name) {
							if (wpn.equipped) equipped = true;
							break;
						}
					}
					for (let wpn of toArray(character.ranged.weapon)) {
						if (wpn.name === item.name) {
							if (wpn.equipped) equipped = true;
							break;
						}
					}
					if (equipped) itemdata.data.equipped = true;
					actor.items.push(itemdata);
				} else {
					// Create our own placemarker item.
					const itemdata = {
						name: name,
						type: 'loot',
						data: {
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
		
		let spell_pack = await game.packs.find(p => p.metadata.name === 'spells');
		async function addSpells(spells) {
			if (!spells) return;
			for (let spell of toArray(spells)) {
				let lower = spell.name.toLowerCase();
				let entry = spell_pack.index.find(e => {	
					const elc = e.name.toLowerCase(); 
					return elc === lower;
				});
				if (entry) {
					actor.items.push((await spell_pack.getDocument(entry._id)).data.toObject());
				} else {
					// Create our own placemarker item.
					let itemdata = {
						name: spell.name,
						type: 'spell',
						data: {
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
					for (let comp of toArray(spell.spellcomp)) {
						let label = comp["#text"];
						if      (label === 'Verbal')   itemdata.data.components.vocal    = true;
						else if (label === 'Somatic')  itemdata.data.components.somatic  = true;
						else if (label === 'Material') itemdata.data.components.material = true;
					}

					actor.items.push(itemdata);
				}
			}
		}
		await addSpells(character.cantrips.spell);
		await addSpells(character.spellsknown.spell);
		await addSpells(character.spellsmemorized.spell)
		
		// Special Abilities
		
		let classab_pack = await game.packs.find(p => p.metadata.name === 'classfeatures');
		let races_pack   = await game.packs.find(p => p.metadata.name === 'races');
		let packs = [ classab_pack, races_pack ];
		
		for (let ability of toArray(character.otherspecials.special)) {
			let entry, pack;
			for (let onepack of packs) {
				let lower = ability.name.toLowerCase();
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
				actor.items.push((await pack.getDocument(entry._id)).data.toObject());
			} else {
				// Add a "feat"
				let itemdata = {
					name: ability.name,
					type: 'feat',
					data: {
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
		let class_pack = await game.packs.find(p => p.metadata.name === 'classes');
		for (let cls of toArray(character.classes.class)) {
			let lower = cls.name.toLowerCase();
			let entry = class_pack.index.find(e => {
				const elc = e.name.toLowerCase(); 
				return elc === lower;
			});
			
			if (entry) {
				let itemdata = (await class_pack.getDocument(entry._id)).data.toObject();
				itemdata.data.levels = cls.level;
				actor.items.push(itemdata);
			} else {
				let itemdata = {
					name : cls.name,
					type : 'class',
					data : {
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
				if (cls.description) itemdata.data.description.value = addParas(cls.description['#text']);
				actor.items.push(itemdata);
			}
		}
		return actor;
	}
}

//details: { biography: { value: html }}} 