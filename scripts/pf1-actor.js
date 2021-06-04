//import { PF1 } from "../../../systems/pf1/pf1.js";

export class RWPF1Actor {

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

	// Items whose name doesn't fit into one of the pattern matches.
	static item_name_mapping = new Map([
		[ "thieves' tools", "tools, thieves' (common)" ],
		[ "thieves' tools, masterwork",  "tools, thieves' (masterwork)" ],
		[ "thieves' tools, concealable",  "tools, thieves' (concealable)" ],
		[ "pot", "pot, cooking (iron)" ],
	]);
	
	static async initModule() {
		// full list of packs: classes, mythicpaths, commonbuffs
		// spells, feats, items, armors-and-shields, weapons-and-ammo, racialhd
		// races, class-abilities, monster-templates, sample-macros, roll-tables
		// ultimate-equipment, bestiary_1/2/3/4/5, conditions, skills
		//game.packs.find(p => console.log(`PF1 pack = ${p.metadata.name}`));
		// Very specific to PF1, generate the FEAT index only once (it avoids excessive re-writing of feats.db)
		await game.packs.find(p => p.metadata.name === 'armors-and-shields')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'classes')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'feats')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'items')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'racialhd')?.getIndex();	// creature types
		await game.packs.find(p => p.metadata.name === 'races')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'spells')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'weapons-and-ammo')?.getIndex();
	}

	
	static parseXml(xmlDoc, arrayTags) {

		function parseNode(xmlNode, result) {
			if (xmlNode.nodeName == "#text") {
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
				if (arrayTags && arrayTags.indexOf(xmlNode.nodeName) != -1)
					result[xmlNode.nodeName] = [jsonNode];
				else
					result[xmlNode.nodeName] = jsonNode;
			}
			if (xmlNode.attributes) {
				for (let attribute of xmlNode.attributes) {
					jsonNode[attribute.nodeName] = attribute.nodeValue;
				}
			}
			for (let node of xmlNode.childNodes) {
				parseNode(node, jsonNode);
			}
		}
		let result = {};
		for (let node of xmlDoc.childNodes) {
			parseNode(node, result);
		}
		return result;
	}

	static async createActorData(xmlString) {
		let parser = new DOMParser();
		const json = RWPF1Actor.parseXml(parser.parseFromString(xmlString, "text/xml"));
		const character = json.document.public.character;
		// The main character
		let result = [ await RWPF1Actor.createOneActorData(character) ];
		// The minions
		if (character.minions?.character) {
			for (const minion of (Array.isArray(character.minions.character) ? character.minions.character : [character.minions.character])) {
				result.push (await RWPF1Actor.createOneActorData(minion));
			}
		}
		return result;
	}
		
	static async createOneActorData(character) {

		//console.log(`Parsing ${character.name}`);
		
		function addParas(string) {
			return `<p>${string.replace(/\n/g,'</p><p>')}</p>`;
		}
		function toArray(thing) {
			return (!thing || Array.isArray(thing)) ? thing : [thing];
		}
		
		let actor = {
			name: character.name,
			type: (character.type == 'Hero') ? 'character' : 'npc',		// 'npc' or 'character'
			//type: (character.role == 'pc') ? 'character' : 'npc',		// 'npc' or 'character'
			data: {
				abilities: {},
				attributes: {},
				details: {},
				skills: {},
				traits: {},
			},
			items: []
		};


		//
		// SUMMARY tab
		//

		// data.attributes.hp.value/base/max/temp/nonlethal
		actor.data.attributes.hp = {
			value: parseInt(character.health.hitpoints),
			base: parseInt(character.health.hitpoints),
			min: 0,
			max: parseInt(character.health.hitpoints),
		};
		// data.attributes.wounds.min/max/base/value
		// data.attributes.vigor.min/value/temp/max/base
		// data.attributes.woundThresholds.penalty/mod/level/override

		// data.details.cr.base/total
		if (character.challengerating) {
			let cr = parseInt(character.challengerating.value);
			actor.data.details.cr = { base: cr, total: cr };
		}
		if (actor.type == 'npc') {
			actor.data.details.xp = { value : parseInt(character.xpaward.value) };
		} else {	
			// data.details.xp.value/min/max
			actor.data.details.xp = {
				value: parseInt(character.xp.total),
				min  : 0,
				max  : parseInt(character.xp.total)
			};
		};
		// data.details.height/weight/gender/deity/age
		actor.data.details.height = character.personal.charheight.text;
		actor.data.details.weight = character.personal.charweight.text;
		actor.data.details.gender = character.personal.gender;
		actor.data.details.deity = character?.deity?.name;
		actor.data.details.age = character.personal.age;

		// <race racetext="human (Taldan)" name="human" ethnicity="Taldan"/>
		const race_pack = await game.packs.find(p => p.metadata.name === 'races');
		const lowerrace = character.race.name.toLowerCase();
		const race = await race_pack.index.find(e => e.name.toLowerCase() === lowerrace);
		if (race) {
			if (isNewerVersion(game.data.version, "0.8.0"))
				actor.items.push((await race_pack.getDocument(race._id)).data);
			else
				actor.items.push(await race_pack.getEntry(race._id));
		} else if (character.types.type?.name == 'Humanoid') {
			// Only do manual entry for humanoids, since monstrous races
			// have "classes" of the monster/animal levels
			console.log(`Race '${character.race.name}' not in 'races' pack for ${character.name}`);
			const itemdata = {
				name: character.race.name,
				type: 'race',
				creatureType: character.types?.type?.name,
				//data: { description : { value : addParas(character.race.name['#text']) }}
			};
			if (isNewerVersion(game.data.version, "0.8.0"))
				actor.items.push(itemdata);
			else
				actor.items.push(new Item(itemdata));
		}
		// <types><type name="Humanoid" active="yes"/>
		// <subtypes><subtype name="Human"/>
		if (character.types.type && character.types.type.name != 'Humanoid') {
			const racialhd_pack = await game.packs.find(p => p.metadata.name === 'racialhd');
			const racehdlower = character.types.type.name.toLowerCase();
			const racialhd = await racialhd_pack.index.find(e => e.name === racehdlower);
			if (racialhd) {
				if (isNewerVersion(game.data.version, "0.8.0")) {
					let item = (await racialhd_pack.getDocument(racialhd._id)).data;
					item.data.level = parseInt(character.health.hitdice);	// HD - TODO : NOT WORKING YET
					actor.items.push(item);
				} else {
					let item = await racialhd_pack.getEntry(racialhd._id);
					item.data.level = parseInt(character.health.hitdice);	// HD - TODO : NOT WORKING YET
					actor.items.push(item);
				}
			} else {
				//console.log(`racialhd '${character.racialhd.name.toLowerCase()}' not in 'racialhd' pack`);
				const itemdata = {
					name: character.types.type.name,
					type: 'class',
					classType: 'racial',
					//data: { description : { value : addParas(character.racialhd.name['#text']) }}
				};
				if (isNewerVersion(game.data.version, "0.8.0"))
					actor.items.push(itemdata);
				else
					actor.items.push(new Item(itemdata));
			}
		}
		//
		// CLASSES sub-tab
		//
		//	<classes level="11" summary="bard (archaeologist) 2/unchained rogue 9" summaryabbr="Brd 2/Rog 9">
		//		<class name="Bard (Archaeologist)" level="2" spells="Spontaneous" casterlevel="2" concentrationcheck="+5" overcomespellresistance="+2" basespelldc="13" castersource="Arcane">
		//			<arcanespellfailure text="0%" value="0"/>
		//		</class>
		//		<class name="Rogue (Unchained)" level="9" spells="" casterlevel="0" concentrationcheck="+3" overcomespellresistance="+0" basespelldc="13" castersource=""/>
		//	</classes>		
		const classes = character.classes?.["class"];
		if (classes) {
			const class_pack = await game.packs.find(p => p.metadata.name === 'classes');
			
			for (const cclass of toArray(classes)) {
				// TODO: we shouldn't really do this, because we are stripping the archetype from the class.
				const name = (cclass.name.indexOf('(Unchained)') > 0) ? cclass.name : cclass.name.replace(/ \(.*/,'');
				//console.log(`Looking for class called '${name}'`);
				// Strip trailing (...)  from class.name
				const entry = class_pack.index.find(e => e.name === name);
				if (entry) {
					if (isNewerVersion(game.data.version, "0.8.0")) {
						//console.log(`Class ${entry.name} at level ${cclass.level}`);
						let itemdata = (await class_pack.getDocument(entry._id)).data;
						itemdata.data.level = parseInt(cclass.level);		// TODO - doesn't work
						actor.items.push(itemdata);
					} else {
						let itemdata =  await class_pack.getEntry(entry._id);
						itemdata.data.level = cclass.level;
						actor.items.push(itemdata);
					}
				} else {
					// Create our own placemarker feat.
					const itemdata = {
						name: cclass.name,
						type: 'race',
						data: { level : cclass.level },
						//data: { description : { value : addParas(feat.description['#text']) }}
					};
					if (isNewerVersion(game.data.version, "0.8.0"))
						actor.items.push(itemdata);
					else
						actor.items.push(new Item(itemdata));
				}
			}
		}
		
		//
		// ATTRIBUTES tab
		//
		for (const attr of character.attributes.attribute) {
			actor.data.abilities[RWPF1Actor.ability_names[attr.name.toLowerCase()]] = {
				total: attr.attrvalue.modified,
				value: attr.attrvalue.base,
				mod:   attr.attrbonus?.base ? attr.attrbonus.base : 0
			}
		}

		actor.data.attributes.savingThrows = {};
		for (const child of character.saves.save) {
			if (child.abbr == "Fort") {
				actor.data.attributes.savingThrows.fort = {
					base: parseInt(child.base),
					total: parseInt(child.save),
					ability: "con"
				};
			} else if (child.abbr == "Ref") {
				actor.data.attributes.savingThrows.ref = {
					base: parseInt(child.base),
					total: parseInt(child.save),
					ability: "dex"
				};
			} else if (child.abbr == "Will") {
				actor.data.attributes.savingThrows.will = {
					base: parseInt(child.base),
					total: parseInt(child.save),
					ability: "wis"
				};
			}
		};

		// data.attributes.vision.lowLight/darkvision
		actor.data.attributes.vision = {
			lowLight   : character.senses?.special?.name && character.senses.special.name.includes("Low-Light Vision"),
			darkvision : 0,
		}
		// data.attributes.hpAbility
		// data.attributes.cmbAbility
		// data.attributes.hd -> actually handled by level of "racialhd" item

		// data.attributes.sr.formula/total
		// data.attributes.saveNotes
		// data.attributes.acNotes
		// data.attributes.cmdNotes
		// data.attributes.srNotes
		// data.attributes.attack.general/shared/melee/ranged/meleeAbility/rangedAbility
		// data.attributes.damage.general/weapon/spell
		// data.attributes.maxDexBonus
		// data.attributes.mDex.armorBonus/shieldBonus
		// data.attributes.acp.gear/encumbrance/total/armorBonus/shieldBonus/attackPenalty
		// data.attributes.energyDrain
		// data.attributes.quadruped

		// data.attributes.prof
		// data.attributes.speed.land/climb/swim/burrow/fly (base/total + for fly, .maneuverability)
		actor.data.attributes.speed = {
			land: {
				base: parseInt(character.movement.speed.value),
				total: parseInt(character.movement.speed.value)
			},
		}
		// data.attributes.conditions((long list false|true)
		// data.attributes.spells.usedSpellbooks[]
		// data.attributes.spells.spellbooks.primary/secondary/tertiary/spelllike
		// data.details.level.value/min/max
		// data.details.mythicTier
		// data.details.bonusFeatFormula
		// data.details.alignment: 'tn'
		actor.data.details.alignment = character.alignment;
		// data.details.biography.value/public
		let bio = character.personal.description['#text'];
		if (bio) {
			actor.data.details.biography = {
				value: addParas(bio)	  // Each paragraph is on a single line
			};
		}
		// data.details.notes.value/public
		// data.details.bonusRankSkillFormula
		// data.details.tooltip.name/hideHeld/hideArmor/hideBuffs/hideConditions/hideClothing/hideName
		
		//
		// COMBAT tab
		//
		
		// data.attributes.init.value/bonus/total/ability
		actor.data.attributes.init = {
			value: parseInt(character.initiative.total),
			bonus: parseInt(character.initiative.total),
			total: parseInt(character.initiative.total),
			ability: RWPF1Actor.ability_names[character.initiative.attrname]
		};

		actor.data.attributes.bab = {
			value: parseInt(character.attack.baseattack),
			total: parseInt(character.attack.baseattack)
		};
		actor.data.attributes.cmd = {
			value: parseInt(character.maneuvers.cmd),
			total: parseInt(character.maneuvers.cmd),
			flatFootedTotal: parseInt(character.maneuvers.cmdflatfooted)
		}
		actor.data.attributes.cmb = {
			value: parseInt(character.maneuvers.cmb),
			total: parseInt(character.maneuvers.cmb),
		}

		actor.data.attributes.naturalAC = parseInt(character.armorclass.fromnatural);
		actor.data.attributes.ac = {
			normal: {
				value: parseInt(character.armorclass.ac),
				total: parseInt(character.armorclass.ac)
			},
			touch: {
				value: parseInt(character.armorclass.touch),
				total: parseInt(character.armorclass.touch),
			},
			flatFooted: {
				value: parseInt(character.armorclass.flatfooted),
				total: parseInt(character.armorclass.flatfooted)
			}
		};


		//
		// INVENTORY tab
		//
		
		// data.currency.pp/gp/sp/cp
		actor.data.currency = {
			pp: parseInt(character.money.pp),
			gp: parseInt(character.money.gp),
			sp: parseInt(character.money.sp),
			cp: parseInt(character.money.cp),
		}
		// data.altCurrency.pp/gp/sp/cp  (weightless coins) - count as weightless

		// data.attributes.encumbrance.level/levels/carriedWeight
		const enc = character.encumbrance;
		actor.data.attributes.encumbrance = {
			level: (enc.level == 'Light Load') ? 0 : 1, // 0 = light load TBD
			levels: {
				light: parseInt(enc.light),
				medium: parseInt(enc.medium),
				heavy: parseInt(enc.heavy),
				//carry:
				//drag:
			},
			carriedWeight: parseInt(enc.carried)
		};

		// gear.[item.name/quantity/weight/cost/description
		if (character.gear?.item) {
			const item_pack   = await game.packs.find(p => p.metadata.name === 'items');
			const armor_pack  = await game.packs.find(p => p.metadata.name === 'armors-and-shields');
			const weapon_pack = await game.packs.find(p => p.metadata.name === 'weapons-and-ammo');
			let packs = [ item_pack,armor_pack,weapon_pack ];
			
			for (const item of toArray(character.gear.item)) {
				// Get all forms of item's name once, since we search each pack.
				let lower = item.name.toLowerCase();
				let singular, reversed, pack, entry;
				// Remove container "(x @ y lbs)"
				if (!entry && lower.endsWith('lbs)')) lower = lower.slice(0,lower.lastIndexOf(' ('));
				// Remove plurals
				if (lower.endsWith('s')) singular = lower.slice(0,-1);
				// Handle names like "bear trap" => "trap, bear"
				const words = lower.split(' ');
				if (words.length == 2) reversed = words[1] + ', ' + words[0];
				// Finally, some name changes aren't simple re-mappings
				if (RWPF1Actor.item_name_mapping.has(lower)) lower = RWPF1Actor.item_name_mapping.get(lower);
				
				for (const p of packs) {
					entry = p.index.find(e => {	const elc = e.name.toLowerCase(); 
						return elc === lower || (singular && elc === singular) || (reversed && elc === reversed)});
					if (entry) {
						pack = p;
						break;
					}
				}
				
				if (entry) {
					let itemdata;
					if (isNewerVersion(game.data.version, "0.8.0")) {
						itemdata = (await pack.getDocument(entry._id)).data;
						itemdata.data.quantity = parseInt(item.quantity);		// TODO - not working
					} else {
						itemdata = await pack.getEntry(entry._id);
						itemdata.quantity = parseInt(item.quantity);
					}
					actor.items.push(itemdata);
				} else {
					// Create our own placemarker item.
					const itemdata = {
						name: item.name,
						type: 'loot',
						data: {
							quantity: parseInt(item.quantity),			// This DOES work!
							weight: parseInt(item.weight.value),
							price: parseInt(item.cost.value),
							description: {
								value: addParas(item.description['#text'])
							},
							identified: true,
							carried: true,
						},
					};
					if (isNewerVersion(game.data.version, "0.8.0"))
						actor.items.push(itemdata);
					else
						actor.items.push(new Item(itemdata));
				}
			}
		}
				
		//
		// FEATURES tab
		//
		
		// data.items (includes feats)
		if (character.feats?.feat) {
			const feat_pack = await game.packs.find(p => p.metadata.name === 'feats');
			for (const feat of toArray(character.feats.feat)) {
				const entry = feat_pack.index.find(e => e.name === feat.name);
				if (entry) {
					if (isNewerVersion(game.data.version, "0.8.0"))
						actor.items.push((await feat_pack.getDocument(entry._id)).data);
					else
						actor.items.push(await feat_pack.getEntry(entry._id));
				} else {
					// Create our own placemarker feat.
					const itemdata = {
						name: feat.name,
						type: 'feat',
						data: {
							description: {
								value: addParas(feat.description['#text'])
							}
						}
					};
					if (feat.featcategory) {
						let cats = [[feat.featcategory['#text']]];
						//item.data.tags = new Map();
						//item.data.tags.insert( cats );
					}
					if (isNewerVersion(game.data.version, "0.8.0"))
						actor.items.push(itemdata);
					else
						actor.items.push(new Item(itemdata));
				}
			}
		}
		
		// defensive.[special.shortname]  from 'class abilities'
		

		//
		// SKILLS tab
		//
		let numart = 0;
		let numcrf = 0;
		let numlor = 0;
		let numprf = 0;
		let numpro = 0;
		let numcust = 0;
		for (const skill of character.skills.skill) {
			let value = {
				value: parseInt(skill.value),
				ability: RWPF1Actor.ability_names[skill.attrname.toLowerCase()],
				rank: parseInt(skill.ranks),
				mod: parseInt(skill.attrbonus)
				// rt, acp, background
			}
			if (!value.ability) {
				console.log(`Failed to find an ability called '${skill.attrname}' for skill '${skill.name}' - SKIPPING`);
				continue;
			}
			
			if (skill.name == 'Acrobatics')
				actor.data.skills.acr = value;
			else if (skill.name == "Appraise")
				actor.data.skills.apr = value;
			else if (skill.name == "Artistry")
				actor.data.skills.art = value;
			else if (skill.name.startsWith("Artistry (")) {
				value.name = skill.name;
				if (!actor.data.skills.art) actor.data.skills.art = {subSkills : {}};
				else if (!actor.data.skills.art.subSkills) actor.data.skills.art.subSkills = {};
				actor.data.skills.art.subSkills[`art${++numart}`] = value;
			} else if (skill.name == "Bluff")
				actor.data.skills.blf = value;
			else if (skill.name == "Climb")
				actor.data.skills.clm = value;
			else if (skill.name == "Craft")
				actor.data.skills.crf = value; // special skills
			else if (skill.name.startsWith("Craft (")) {
				value.name = skill.name;
				if (!actor.data.skills.crf) actor.data.skills.crf = {subSkills : {}};
				else if (!actor.data.skills.crf.subSkills) actor.data.skills.crf.subSkills = {};
				actor.data.skills.crf.subSkills[`crf${++numcrf}`] = value;
			} else if (skill.name == "Diplomacy")
				actor.data.skills.dip = value;
			else if (skill.name == "Disguise")
				actor.data.skills.dev = value;
			else if (skill.name == "Disable Device")
				actor.data.skills.dis = value;
			else if (skill.name == "Escape Artist")
				actor.data.skills.esc = value;
			else if (skill.name == "Fly")
				actor.data.skills.fly = value;
			else if (skill.name == "Handle Animal")
				actor.data.skills.han = value;
			else if (skill.name == "Heal")
				actor.data.skills.hea = value;
			else if (skill.name == "Intimidate")
				actor.data.skills.int = value;
			else if (skill.name == "Knowledge (arcana)")
				actor.data.skills.kar = value;
			else if (skill.name == "Knowledge (dungeoneering)")
				actor.data.skills.kdu = value;
			else if (skill.name == "Knowledge (engineering)")
				actor.data.skills.ken = value;
			else if (skill.name == "Knowledge (geography)")
				actor.data.skills.kge = value;
			else if (skill.name == "Knowledge (history)")
				actor.data.skills.khi = value;
			else if (skill.name == "Knowledge (local)")
				actor.data.skills.klo = value;
			else if (skill.name == "Knowledge (nature)")
				actor.data.skills.kna = value;
			else if (skill.name == "Knowledge (nobility)")
				actor.data.skills.kno = value;
			else if (skill.name == "Knowledge (planes)")
				actor.data.skills.kpl = value;
			else if (skill.name == "Knowledge (religion)")
				actor.data.skills.kre = value;
			else if (skill.name == "Linguistics")
				actor.data.skills.lin = value;
			else if (skill.name == "Lore")
				actor.data.skills.lor = value;
			else if (skill.name.startsWith("Lore (")) {
				value.name = skill.name;
				if (!actor.data.skills.lor) actor.data.skills.lor = {subSkills : {}};
				else if (!actor.data.skills.lor.subSkills) actor.data.skills.lor.subSkills = {};
				actor.data.skills.lor.subSkills[`lor${++numlor}`] = value;
			} else if (skill.name == "Perception")
				actor.data.skills.per = value;
			else if (skill.name == "Perform")
				actor.data.skills.prf = value;
			else if (skill.name.startsWith("Perform (")) {
				value.name = skill.name;
				if (!actor.data.skills.prf) actor.data.skills.prf = {subSkills : {}};
				else if (!actor.data.skills.prf.subSkills) actor.data.skills.prf.subSkills = {};
				actor.data.skills.prf.subSkills[`prf${++numprf}`] = value;
			} else if (skill.name == "Profession")
				actor.data.skills.pro = value;
			else if (skill.name.startsWith("Profession (")) {
				value.name = skill.name;
				if (!actor.data.skills.pro) actor.data.skills.pro = {subSkills : {}};
				else if (!actor.data.skills.pro.subSkills) actor.data.skills.pro.subSkills = {};
				actor.data.skills.pro.subSkills[`pro${++numpro}`] = value;
			} else if (skill.name == "Ride")
				actor.data.skills.rid = value;
			else if (skill.name == "Sense Motive")
				actor.data.skills.sen = value;
			else if (skill.name == "Sleight of Hand")
				actor.data.skills.slt = value;
			else if (skill.name == "Spellcraft")
				actor.data.skills.spl = value;
			else if (skill.name == "Stealth")
				actor.data.skills.ste = value;
			else if (skill.name == "Survival")
				actor.data.skills.sur = value;
			else if (skill.name == "Swim")
				actor.data.skills.swm = value;
			else if (skill.name == "Use Magic Device")
				actor.data.skills.umd = value;
			else
			{
				console.log(`PF1 custom skill ${skill.name}`);
				value.name = skill.name;
				actor.data.skills[numcust++ ? `skill${numcust}` : 'skill'] = value;
			}
		}
		
		
		//
		// BUFFS tab
		//
		
		
		//
		// BIOGRAPHY tab
		//
		
		
		//
		// SPELLS tab
		//
		// data.attributes.spells.spellbooks.primary/secondary/tertiary/spelllike
		//
		// data.attributes.spellbooks.usedSpellbooks: [ 'primary', 'tertiary', 'spelllike' ]
		// spells are added to items array.
		// <character>
		// <spellsknown>
		// <spell name="Ghost Sound" level="0" class="Bard" casttime="1 action" range="close (25 + 5 ft./2 levels)" target="" area="" effect="illusory sounds" duration="1 round/level (D)" save="DC 13 Will disbelief" resist="no" dc="13" casterlevel="2" componenttext="Verbal, Somatic, Material" schooltext="Illusion" subschooltext="Figment" descriptortext="" savetext="Will disbelief" resisttext="No" spontaneous="yes">
		//			<description>Ghost sound allows you to create a volume of sound that rises, recedes, approaches, or remains at a fixed place. You choose what type of sound ghost sound creates when casting it and cannot thereafter change the sound's basic character. The volume of sound created depends on your level. You can produce as much noise as four normal humans per caster level (maximum 40 humans). Thus, talking, singing, shouting, walking, marching, or running sounds can be created. The noise a ghost sound spell produces can be virtually any type of sound within the volume limit. A horde of rats running and squeaking is about the same volume as eight humans running and shouting. A roaring lion is equal to the noise from 16 humans, while a roaring dragon is equal to the noise from 32 humans. Anyone who hears a ghost sound receives a Will save to disbelieve.
		//	 		Ghost sound can enhance the effectiveness of a silent image spell.
		//			Ghost sound can be made permanent with a permanency spell.</description>
		//			<spellcomp>Verbal</spellcomp>
		//			<spellcomp>Somatic</spellcomp>
		//			<spellcomp>Material</spellcomp>
		//			<spellschool>Illusion</spellschool>
		//			<spellsubschool>Figment</spellsubschool>
		//		</spell>
		const spell_pack = await game.packs.find(p => p.metadata.name === 'spells');
		
		async function addSpells(nodes, book, memorized=[]) {
			let result = false;
			if (nodes) {
				console.log(`Creating spellbook ${book} for '${character.name}'`);
				result = true;
				if (!actor.data.attributes.spells) actor.data.attributes.spells = { usedSpellbooks : []};
				actor.data.attributes.spells.usedSpellbooks.push(book);
				
				for (const spell of toArray(nodes)) {
					const lowername = spell.name.toLowerCase();
					const shortpos = lowername.indexOf(' (');
					const shortname = (shortpos > 0) ? lowername.slice(0,shortpos) : lowername;
					
					const entry = spell_pack.index.find(e => e.name.toLowerCase() == shortname);
					if (entry) {
						if (isNewerVersion(game.data.version, "0.8.0")) {
							let itemdata = (await spell_pack.getDocument(entry._id)).data;
							itemdata.data.spellbook = book;
							if (memorized.includes(lowername)) itemdata.preparation = { preparedAmount : 1};
							if (shortpos >= 0) itemdata.name = spell.name;	// full name has extra details
							if (lowername.endsWith('at will)')) itemdata.data.atWill = true;
							if (lowername.endsWith('/day)')) {
								itemdata.data.uses.max = parseInt(lowername.slice(-6));	// assume one digit
								itemdata.data.uses.per = 'day';
							}
							//itemdata.data.learnedAt = { 'class': [  };
							console.log(`Adding spell ${itemdata.name}`);
							actor.items.push(itemdata);
						} else {
							let itemdata = await spell_pack.getEntry(entry._id);
							itemdata.data.spellbook = book;
							if (memorized.includes(lowername)) itemdata.preparation = { preparedAmount : 1};
							if (shortpos >= 0) itemdata.name = spell.name;	// full name has extra details
							actor.items.push(itemdata);
						}
					} else {
						// Manually create a spell
						console.log(`Add entry to ${book} manually for spell '${spell.name}'`);
					}
				}
			}
			return result;
		}

		// Technically, we should process spellsmemorized to mark which spells in spellbook are prepared
		let spellbooks = [ 'primary', 'secondary', 'tertiary' ];
		let memorized = [];
		if (character.spellsmemorized.spell) {
			for (const spell of toArray(character.spellsmemorized.spell)) {
				memorized.push(spell.name.toLowerCase());
			}
		}
		await addSpells(character.spellbook.spell, spellbooks[0], memorized);
		//if (await addSpells(character.spellsmemorized.spell, spellbooks[0])) spellbooks.shift();
		if (await addSpells(character.spellsknown.spell, spellbooks[0])) spellbooks.shift();
		
		// <special name="Disguise Self (humanoid form only, At will)" shortname="Disguise Self">
		// <special name="Blur (1/day)" shortname="Blur">
		// <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">
		await addSpells(character.spelllike.special, 'spelllike');
		
		//
		// NOTES tab
		//
		
		
		//
		// SETTINGS tab
		//
		
		
		//
		// STUFF TO BE PUT INTO THE CORRECT PLACE
		//
		
		// data.traits.size - fine|dim|tiny|med|lg|huge|grg|col
		switch (character.size.name) {
		case 'Fine':		actor.data.traits.size = 'fine';	break;
		case 'Diminutive':	actor.data.traits.size = 'dim';		break;
		case 'Tiny':		actor.data.traits.size = 'tiny';	break;
		case 'Small':		actor.data.traits.size = 'sm';		break;
		case 'Medium':		actor.data.traits.size = 'med';		break;
		case 'Large':		actor.data.traits.size = 'lg';		break;
		case 'Huge':		actor.data.traits.size = 'huge';	break;
		case 'Gargantuan':	actor.data.traits.size = 'grg';		break;
		case 'Colossal':	actor.data.traits.size = 'col';		break;
		default:
			console.log(`Unknown actor size ${character.size.name}`);
		}
		// data.traits.senses
		let senses = [];
		if (character.senses.special) {
			for (const sense of toArray(character.senses.special)) {
				senses.push(sense.name);
			}
		}
		actor.data.traits.senses = senses.join(', ');
		// data.traits.dr		// damage reduction		(character.damagereduction)
		// data.traits.eres		// energy resistance	(character.resistances)
		// data.traits.cres		// condition resistance	(character.resistances)
		// data.traits.regen
		// data.traits.fastHealing
		// data.traits.languages.value[]/custom
		if (character.languages.language) {
			actor.data.traits.languages = {
				value: []
			};
			for (const lang of toArray(character.languages.language)) {
				actor.data.traits.languages.value.push(lang.name.toLowerCase());
			}
		}

		// data.traits.di.value[]/custom
		// data.traits.dv.value[]/custom
		// data.traits.ci.value[]/custom
		// data.traits.perception.
		// data.traits.stature
		// data.traits.weaponProf.value[]/custom
		// data.traits.armorProf.value[]/custom
		// data.flags
		// data.token (leave empty)
		
		// data.effects

		return actor;
	}
}