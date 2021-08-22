//import { PF1 } from "../../../systems/pf1/pf1.js";

export default class RWPF1Actor {

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

	static spellschool_names = {
		"abjuration": "abj",
		"conjuration": "con",
		"divination": "div",
		"enchantment": "enc",
		"evocation": "evo",
		"illusion": "ill",
		"necromancy": "nec",
		"transmutation": "trs",
		"universal": "uni",
	};
	
	// Items whose name doesn't fit into one of the pattern matches.
	static item_name_mapping = new Map([
		[ "thieves' tools", "tools, thieves' (common)" ],
		[ "thieves' tools, masterwork",  "tools, thieves' (masterwork)" ],
		[ "thieves' tools, concealable",  "tools, thieves' (concealable)" ],
		[ "pot", "pot, cooking (iron)" ],
		[ "feed", "feed, animal" ],
		[ "riding saddle", "saddle (riding)" ],
		[ "military saddle", "saddle (military)" ],
		[ "exotic saddle", "saddle (exotic)" ],
	]);
	
	static feat_name_mapping = new Map([
		[ "Armor Proficiency (Light)", "Armor Proficiency, Light" ],
		[ "Armor Proficiency (Medium)", "Armor Proficiency, Medium" ],
		[ "Armor Proficiency (Heavy)", "Armor Proficiency, Heavy" ],
	]);

	static skill_mapping = new Map([
		[ "Acrobatics", "acr" ],
		[ "Appraise", "apr" ],
		[ "Artistry", "art" ],
		[ "Bluff", "blf" ],
		[ "Climb", "clm" ],
		[ "Craft", "crf" ],
		[ "Diplomacy", "dip" ],
		[ "Disguise", "dis" ],
		[ "Disable Device", "dev" ],
		[ "Escape Artist", "esc" ],
		[ "Fly", "fly" ],
		[ "Handle Animal", "han" ],
		[ "Heal", "hea" ],
		[ "Intimidate", "int" ],
		[ "Knowledge (arcana)", "kar" ],
		[ "Knowledge (dungeoneering)", "kdu" ],
		[ "Knowledge (engineering)", "ken" ],
		[ "Knowledge (geography)", "kge" ],
		[ "Knowledge (history)", "khi" ],
		[ "Knowledge (local)", "klo" ],
		[ "Knowledge (nature)", "kna" ],
		[ "Knowledge (nobility)", "kno" ],
		[ "Knowledge (planes)", "kpl" ],
		[ "Knowledge (religion)", "kre" ],
		[ "Linguistics", "lin" ],
		[ "Lore", "lor" ],
		[ "Perception", "per" ],
		[ "Perform", "prf" ],
		[ "Profession", "pro" ],
		[ "Ride", "rid" ],
		[ "Sense Motive", "sen" ],
		[ "Sleight of Hand", "slt" ],
		[ "Spellcraft", "spl" ],
		[ "Stealth", "ste" ],
		[ "Survival", "sur" ],
		[ "Swim", "swm" ],
		[ "Use Magic Device", "umd" ],
	]);
	
	static wizard_subclasses = [ 'Abjurer', 'Conjurer', 'Diviner', 'Enchanter', 'Evoker', 'Illusionist', 'Necromancer', 'Transmuter', 'Universalist' ];
	
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

	
	static async createActorData(character) {
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
		
		// A HL file will have EITHER <xp> or <challengerating> & <xpaward>
		let actor = {
			name: character.name,
			type: (character.challengerating === undefined) ? 'character' : 'npc',		// 'npc' or 'character'
			relationship : character.relationship,
			data: {
				abilities: {},
				attributes: {},
				details: {},
				skills: {},
				traits: {},
			},
			items: []		// add items with :   items.push(new Item(itemdata).data)
		};

		//
		// SUMMARY tab
		//

		// data.attributes.hp.value/base/max/temp/nonlethal
		//let hp = +character.health.hitpoints;
		actor.data.attributes.hp = {
			value: +character.health.currenthp,
			//base:  +character.health.hitpoints,		// This screws up PF1E if automatic HP calculation is enabled
			min:   0,
			max:   +character.health.hitpoints,
		};
		// data.attributes.wounds.min/max/base/value
		// data.attributes.vigor.min/value/temp/max/base
		// data.attributes.woundThresholds.penalty/mod/level/override

		// data.details.cr.base/total
		if (character.challengerating === undefined) {
			// data.details.xp.value/min/max
			actor.data.details.xp = {
				value: +character.xp.total,
				min  : 0,
				max  : +character.xp.total
			};
		} else {
			let cr = +character.challengerating.value;
			actor.data.details.cr = { base: cr, total: cr };
			actor.data.details.xp = { value : +character.xpaward.value };
		};
		// data.details.height/weight/gender/deity/age
		actor.data.details.height = character.personal.charheight.text;
		actor.data.details.weight = character.personal.charweight.text;
		actor.data.details.gender = character.personal.gender;
		actor.data.details.deity = character?.deity?.name;
		actor.data.details.age = character.personal.age;

		const hitpoints = +character.health.hitpoints;
		// Ignore any possible "12 HD;" prefix, putting just the second half into justdice
		// Calculate total number of HD for the character
		const hitdice = character.health.hitdice;		// either "9d8+16" or "12 HD; 7d6+5d10+67" or just "7d6+5d10+67"
		let t1 = hitdice.split(';');
		let justdice = t1[t1.length - 1];
		let hdparts = justdice.split('+');
		let lastpart = hdparts[hdparts.length - 1];
		let hp_bonus = lastpart.includes('d') ? 0 : parseInt(lastpart);
		let total_hd = 0;
		for (let i = 0; i<hdparts.length-1; i++)
			total_hd += parseInt(hdparts[i]);
		let classes_hd = parseInt(character.classes.level);
		let races_hd  = total_hd - classes_hd;
		
		let remain_hp = hitpoints - hp_bonus;
		let races_hp  = (races_hd > 0) ? Math.round(remain_hp * races_hd / total_hd) : 0;
		let classes_hp = remain_hp - races_hp;
		
		//
		// CLASSES sub-tab (before RACE, in case we need to adjust HD by number of class levels)
		//
		//	<classes level="11" summary="bard (archaeologist) 2/unchained rogue 9" summaryabbr="Brd 2/Rog 9">
		//		<class name="Bard (Archaeologist)" level="2" spells="Spontaneous" casterlevel="2" concentrationcheck="+5" overcomespellresistance="+2" basespelldc="13" castersource="Arcane">
		//			<arcanespellfailure text="0%" value="0"/>
		//		</class>
		//		<class name="Rogue (Unchained)" level="9" spells="" casterlevel="0" concentrationcheck="+3" overcomespellresistance="+0" basespelldc="13" castersource=""/>
		//	</classes>
		//	<favoredclasses>
		//		<favoredclass name="Rogue (Unchained)"/>  <-- to set fc.hp.value, fc.skill.value, fc.alt.value/notes
		//	</favoredclasses>
		let favclasses = [];
		let charfav = character.favoredclasses?.favoredclass;
		if (charfav) {
			for (const fc of toArray(charfav)) {
				favclasses.push(fc.name);
			}
		}
		const classes = character.classes?.["class"];
		if (classes) {
			const class_pack = await game.packs.find(p => p.metadata.name === 'classes');
			
			for (const cclass of toArray(classes)) {
				// Calculate how many class HP belong to this class; and remove from the pool.
				let levels = +cclass.level;
				let class_hp = Math.round((classes_hp * levels) / classes_hd);
				classes_hp -= class_hp;
				classes_hd -= levels;
				
				// TODO: we shouldn't really do this, because we are stripping the archetype from the class.
				let name = (cclass.name.indexOf('(Unchained)') > 0) ? cclass.name : cclass.name.replace(/ \(.*/,'');
				// Special case for wizard classes
				if (this.wizard_subclasses.includes(name)) {
					name = 'Wizard';
				}
				//console.log(`Looking for class called '${name}'`);
				// Strip trailing (...)  from class.name
				const entry = class_pack.index.find(e => e.name === name);
				if (entry) {
					let classdata = (await class_pack.getDocument(entry._id)).data.toObject();
					//console.log(`Class ${entry.name} at level ${cclass.levels}`);

					// class.hp needs setting to the amount of HP gained from levelling in this class.
					// class.fc needs setting for the favoured class with information as to how the point was spent.
					// Do all NPCs really get the HP favoured class bonus on their stats?
					if (favclasses.includes(cclass.name) || character.role === 'npc') {
						// This is NOT a favoured class, so cancel any favoured class bonuses.
						console.log(`Setting favoured class for ${cclass.name}`);
						classdata.data.fc.hp.value = levels;
						classdata.data.fc.skill.value = 0;
						classdata.data.fc.alt.value = 0;
					}
					
					// Start by adding the class item with the correct number of levels & HP
					classdata.data.level = levels;
					classdata.data.hp = class_hp;		// how do we work this out?
					actor.items.push(classdata);
					
					// Now add all the class features up to the level of the class.
					// See PF1._onLevelChange (triggered by updateItem and createItem, but not create()
					const classAssociations = (classdata.data.links.classAssociations || []).filter((o, index) => {
						o.__index = index;
						return o.level <= levels;
					});

					for (let co of classAssociations) {
						const collection = co.id.split(".").slice(0, 2).join(".");
						const itemId = co.id.split(".")[2];
						const pack = game.packs.get(collection);
						const itemData = duplicate((await pack.getDocument(itemId)).data);
						
						// No record on each classFeature as to which class and level added it.
						//classUpdateData[`flags.pf1.links.classAssociations.${itemData.id}`] = co.level;	// itemData.id isn't valid yet!
						actor.items.push(itemData);
					}
				} else {
					// Create our own placemarker class.
					const itemdata = {
						name: cclass.name,
						type: 'race',
						data: { 
							level : levels,
							hp    : class_hp,
						},
						//data: { description : { value : addParas(feat.description['#text']) }}
					};
					actor.items.push(itemdata);
				}
			}
		} // if (classes)

		// <race racetext="human (Taldan)" name="human" ethnicity="Taldan"/>
		const race_pack = await game.packs.find(p => p.metadata.name === 'races');
		const lowerrace = character.race.name.toLowerCase();
		const race = await race_pack.index.find(e => e.name.toLowerCase() === lowerrace);
		if (race) {
			actor.items.push((await race_pack.getDocument(race._id)).data.toObject());
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
			actor.items.push(itemdata);
		}
		// <types><type name="Humanoid" active="yes"/>
		// <subtypes><subtype name="Human"/>
		if (character.types.type) {
			const racialhd_pack = await game.packs.find(p => p.metadata.name === 'racialhd');
			const racehdlower = character.types.type.name.toLowerCase();
			const racialhd = await racialhd_pack.index.find(e => e.name.toLowerCase() === racehdlower);
			if (racialhd) {
				let item = (await racialhd_pack.getDocument(racialhd._id)).data.toObject();
				item.data.level = races_hd;
				item.data.hp = races_hp;
				if (races_hd == 0) {
					item.data.skillsPerLevel = 0;
					item.data.savingThrows.fort.value = "Low";
					item.data.savingThrows.ref.value = "Low";
					item.data.savingThrows.will.value = "Low";
				}					
				actor.items.push(item);
			} else {
				//console.log(`racialhd '${character.racialhd.name.toLowerCase()}' not in 'racialhd' pack`);
				const itemdata = {
					name: character.types.type.name,
					type: 'class',
					classType: 'racial',
					hp : races_hp,
					//data: { description : { value : addParas(character.racialhd.name['#text']) }}
				};
				actor.items.push(itemdata);
			}
		}
		//
		// ATTRIBUTES tab
		//
		// attrvalue.base is unmodified by magical items
		// attrvalue.modified includes bonuses
		for (const attr of character.attributes.attribute) {
			actor.data.abilities[RWPF1Actor.ability_names[attr.name.toLowerCase()]] = {
				value: +attr.attrvalue.base,
			}
		}

		// Saving Throws are calculated automatically
/*		actor.data.attributes.savingThrows = {};
		for (const child of character.saves.save) {
			if (child.abbr == "Fort") {
				actor.data.attributes.savingThrows.fort = {
					base:  +child.fromresist, //+child.base,
					//total: +child.save - +child.fromattr,
					ability: "con"
				};
			} else if (child.abbr == "Ref") {
				actor.data.attributes.savingThrows.ref = {
					base:  +child.fromresist,
					//total: +child.save - +child.fromattr,
					ability: "dex"
				};
			} else if (child.abbr == "Will") {
				actor.data.attributes.savingThrows.will = {
					base:  +child.fromresist,
					//total: +child.save - +child.fromattr,
					ability: "wis"
				};
			}
		};
*/

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
				base:  +character.movement.speed.value,
				total: +character.movement.speed.value
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
		const initvalue = +character.initiative.misctext; //+character.initiative.total - +character.initiative.attrtext;
		actor.data.attributes.init = {
			value: initvalue,
			bonus: initvalue,
			total: initvalue,
			ability: RWPF1Actor.ability_names[character.initiative.attrname]
		};

		actor.data.attributes.bab = {
			value: +character.attack.baseattack,
			total: +character.attack.baseattack
		};
		actor.data.attributes.cmd = {
			value: +character.maneuvers.cmd,
			total: +character.maneuvers.cmd,
			flatFootedTotal: +character.maneuvers.cmdflatfooted
		}
		actor.data.attributes.cmb = {
			value: +character.maneuvers.cmb,
			total: +character.maneuvers.cmb,
		}

		// AC will be calculated automatically
/*		actor.data.attributes.naturalAC = +character.armorclass.fromnatural;
		actor.data.attributes.ac = {
			normal: {
				value: +character.armorclass.ac,
				total: +character.armorclass.ac
			},
			touch: {
				value: +character.armorclass.touch,
				total: +character.armorclass.touch,
			},
			flatFooted: {
				value: +character.armorclass.flatfooted,
				total: +character.armorclass.flatfooted
			}
		};
*/

		//
		// INVENTORY tab
		//
		
		// data.currency.pp/gp/sp/cp
		actor.data.currency = {
			pp: +character.money.pp,
			gp: +character.money.gp,
			sp: +character.money.sp,
			cp: +character.money.cp,
		}
		// data.altCurrency.pp/gp/sp/cp  (weightless coins) - count as weightless

		// data.attributes.encumbrance.level/levels/carriedWeight
		const enc = character.encumbrance;
		actor.data.attributes.encumbrance = {
			level: (enc.level == 'Light Load') ? 0 : 1, // 0 = light load TBD
			levels: {
				light:  +enc.light,
				medium: +enc.medium,
				heavy:  +enc.heavy,
				//carry:
				//drag:
			},
			carriedWeight: +enc.carried
		};

		// gear.[item.name/quantity/weight/cost/description
		let items = [];
		if (character.gear?.item) items = items.concat(toArray(character.gear.item));
		if (character.magicitems?.item) items = items.concat(toArray(character.magicitems.item));
		
		if (items.length > 0) {
			// Core System compendiums
			const item_pack   = await game.packs.find(p => p.metadata.name === 'items');
			const armor_pack  = await game.packs.find(p => p.metadata.name === 'armors-and-shields');
			const weapon_pack = await game.packs.find(p => p.metadata.name === 'weapons-and-ammo');
			let packs = [ item_pack,armor_pack,weapon_pack ];
			// PF1 Content compendiums
			const pg_magic_pack = await game.packs.find(p => p.metadata.name === 'pf-magic');
			if (pg_magic_pack) packs.push(pg_magic_pack);
			const pg_items_pack = await game.packs.find(p => p.metadata.name === 'pf-items');
			if (pg_items_pack) packs.push(pg_items_pack);
			const wondrous_pack = await game.packs.find(p => p.metadata.name === 'pf-wondrous');
			if (wondrous_pack) packs.push(wondrous_pack);
			const goods_services_pack = await game.packs.find(p => p.metadata.name === 'pf-goods-services');
			if (goods_services_pack) packs.push(goods_services_pack);
			
			
			for (const item of items) {
				// Get all forms of item's name once, since we search each pack.
				let lower = item.name.toLowerCase();
				let singular, reversed, pack, entry, noparen;
				// Remove container "(x @ y lbs)"
				if (lower.endsWith(')') && (lower.endsWith('lbs)') || lower.endsWith('empty)') || lower.endsWith('per day)')))
					lower = lower.slice(0,lower.lastIndexOf(' ('));
				// Remove plurals
				if (lower.endsWith('s')) singular = lower.slice(0,-1);
				// Handle names like "bear trap" => "trap, bear"
				const words = lower.split(' ');
				if (words.length == 2) reversed = words[1] + ', ' + words[0];
				// Handle "Something (else)" -> "Something, else"
				if (lower.endsWith(')')) {
					let pos = lower.lastIndexOf(' (');
					noparen = lower.slice(0,pos) + ', ' + lower.slice(pos+2,-1);
				}
				
				// Finally, some name changes aren't simple re-mappings
				if (RWPF1Actor.item_name_mapping.has(lower)) lower = RWPF1Actor.item_name_mapping.get(lower);
				
				for (const p of packs) {
					entry = p.index.find(e => {	
						const elc = e.name.toLowerCase(); 
						return elc === lower || (singular && elc === singular) || (reversed && elc === reversed) || (noparen && elc === noparen)
					});
					if (entry) {
						pack = p;
						break;
					}
				}
				
				if (entry) {
					let itemdata = (await pack.getDocument(entry._id)).data.toObject();
					itemdata.data.quantity = +item.quantity;
					actor.items.push(itemdata);
				} else {
					// Create our own placemarker item.
					const itemdata = {
						name: item.name,
						type: 'loot',
						data: {
							quantity: +item.quantity,
							weight:   +item.weight.value,
							price:    +item.cost.value,
							description: {
								value: addParas(item.description['#text'])
							},
							identified: true,
							carried: true,
						},
					};
					actor.items.push(itemdata);
				}
			}
		}
				
		//
		// SKILLS tab
		//
		let numsub = { art: 0, crf: 0, lor: 0, prf: 0, pro: 0 };
		let numcust = 0;
		for (const skill of character.skills.skill) {
			// <skill name="Acrobatics" ranks="5" attrbonus="5" attrname="DEX" value="10" armorcheck="yes" classskill="yes" trainedonly="yes" usable="no" tools="uses|needs">
			let value = {
				//value:   +skill.value,
				ability: RWPF1Actor.ability_names[skill.attrname.toLowerCase()],
				rt:      (skill.trainedonly === 'yes'),
				acp:     (skill.armorcheck  === 'yes'),
				rank:    +skill.ranks,
				//mod:     +skill.attrbonus,
				//cs:      (skill.classskill  === 'yes'),		// overridden by class definitions
				// rt, acp, background
			}
			if (!value.ability) {
				console.log(`Failed to find an ability called '${skill.attrname}' for skill '${skill.name}' - SKIPPING`);
				continue;
			}
			let baseskill = this.skill_mapping.get(skill.name);
			if (baseskill) {
				actor.data.skills[baseskill] = value;
			} else {
				let paren = skill.name.indexOf(' (');
				baseskill = paren ? this.skill_mapping.get(skill.name.slice(0,paren)) : undefined;
				if (baseskill) {
					value.name = skill.name;
					if (!actor.data.skills[baseskill]) actor.data.skills[baseskill] = {subSkills : {}};
					else if (!actor.data.skills[baseskill].subSkills) actor.data.skills[baseskill].subSkills = {};
					actor.data.skills[baseskill].subSkills[`${baseskill}${++numsub[baseskill]}`] = value;
				} else {
					console.log(`PF1 custom skill ${skill.name}`);
					value.name = skill.name;
					actor.data.skills[numcust++ ? `skill${numcust}` : 'skill'] = value;
				}
			}
		}
		
		
		//
		// FEATURES tab
		//
		
		// data.items (includes feats) - must be done AFTER skills
		if (character.feats?.feat) {
			const feat_pack = await game.packs.find(p => p.metadata.name === 'feats');
			for (const feat of toArray(character.feats.feat)) {
				// since that indicates a class or race-based feature.
				let featname = feat.name;
				let realname = featname;
				if (RWPF1Actor.feat_name_mapping.has(featname))
					realname = featname = RWPF1Actor.feat_name_mapping.get(featname);
				else
					featname = featname.replace(/ \(.*/,'').replace(/ -.*/,'');

				if (feat.useradded == 'no') {
					// Never manually add armor/shield/weapon proficiencies
					if (feat.profgroup == 'yes') continue;
						
					// But don't add it if a copy has already been added when processing classes.
					let acopy = false;
					for (const item of actor.items) {
						if (item.name == featname) {
							acopy = true;
							break;
						}
					}
					if (acopy) continue;
				}
				
				const entry = feat_pack.index.find(e => e.name === featname);
				if (entry) {
					let itemdata = duplicate((await feat_pack.getDocument(entry._id)).data);
					itemdata.name = realname;	// TODO: in case we removed parentheses

					if (feat.useradded == 'no') {
						// We are going to add it as a manual class feature.
						itemdata.data.featType = 'classFeat';
					}
					
					// Special additions:
					if (feat.name.startsWith('Skill Focus (')) {
						// Skill Focus (Profession [Merchant]) => Profession (Merchant)
						let ranks;
						let p1 = feat.name.indexOf(' (');
						let p2 = feat.name.lastIndexOf(')');
						let skillname = feat.name.slice(p1+2,p2).replace('[','(').replace(']',')');
						// Find any descendent of actor.data.skills with a .name that matches the skill
						let skill;
						let baseskill = this.skill_mapping.get(skillname);
						if (baseskill) {
							ranks = actor.data.skills[baseskill].rank;
							skill = 'skill.' + baseskill;
						} else {
							// Check for a subskill
							let paren = skillname.indexOf(' (');
							skill = paren ? this.skill_mapping.get(skillname.slice(0,paren)) : undefined;
							if (skill) {
								for (let skl2 of Object.keys(actor.data.skills[skill].subSkills)) {
									if (actor.data.skills[skill].subSkills[skl2].name == skillname) {
										ranks = actor.data.skills[skill].subSkills[skl2].rank;
										skill = 'skill.' + skill + ".subSkills." + skl2;
										break;
									}
								}
							}
							if (!skill) { 
								// Check custom skills
								// actor.data.skills.skill
								// actor.data.skills.skill2
								let i=0;
								while (true) {
									let name = (i==0) ? 'skill' : `skill${i}`;
									if (!(name in actor.data.skills)) break;
									if (actor.data.skills[name].name == skill.name) {
										ranks = actor.data.skills[name].rank;
										skill = 'skill.' + name;
										break;
									}
								}
							}
						}
						if (skill) {
							let bonus = (ranks >= 10) ? "6" : "3";
							itemdata.data.changes = [
							{
								formula:   bonus,
								operator:  "add",
								subTarget: skill,
								modifier:  "untyped",
								priority:  0,
								value:     bonus,
							}];
							//console.log(`Skill Focus: ${itemdata.data.changes[0].formula} to ${itemdata.data.changes[0].subTarget}`);
						}
					}
					actor.items.push(itemdata);
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
					if (feat.useradded == 'no') {
						itemdata.data.featType = 'classFeat';
					}					
					if (feat.featcategory) {
						let cats = [[feat.featcategory['#text']]];
						//itemdata.data.tags = new Map();
						//itemdata.data.tags.insert( cats );
					}
					actor.items.push(itemdata);
				}
			}
		}
		
		// Traits (on FEATURES tab)
		// <trait name="Dangerously Curious" categorytext="Magic">
		if (character.traits?.trait) {
			const trait_pack = await game.packs.find(p => p.metadata.name === 'feats');
			for (const trait of toArray(character.traits.trait)) {
				const subtype = trait.categorytext;		// Magic, Racial, Social
				const itemdata = {
					name: trait.name,
					type: 'feat',
					data: {
						featType: (subtype == 'Racial') ? 'racial' : 'trait',	// feat, classFeat, trait, racial, misc, template
						description: {
							value: addParas(trait.description['#text'])
						}
					}
				};
				actor.items.push(itemdata);
			}
		}
		// and otherspecials.special with sourcetext attribute set to one of the classes
		// find items in "class-abilities"
		
		
		// defensive.[special.shortname]  from 'class abilities'
		

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
		//			<spellschool>Void Elemental</spellschool>
		//			<spellsubschool>Figment</spellsubschool>
		//		</spell>
		const spell_pack = await game.packs.find(p => p.metadata.name === 'spells');
		
		async function addSpells(nodes, book, memorized=[]) {
			if (!nodes) return false;
			
			//console.log(`Creating spellbook ${book} for '${character.name}'`);
			if (!actor.data.attributes.spells) actor.data.attributes.spells = { usedSpellbooks : []};
			actor.data.attributes.spells.usedSpellbooks.push(book);
				
			// <spell name="Eagle's Splendor" level="2" class="Sorcerer" casttime="1 action" range="touch" target="creature touched" area="" effect="" duration="1 min./level" 
			//		save="Will negates (harmless)" resist="yes" dc="18" casterlevel="7" componenttext="Verbal, Somatic, Material or Divine Focus"
			//		schooltext="Transmutation" subschooltext="" descriptortext="" savetext="Harmless, Will negates" resisttext="Yes" spontaneous="yes">
			// <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">

			for (const spell of toArray(nodes)) {
				const lowername = spell.name.toLowerCase();
				const shortpos = lowername.indexOf(' (');
				const shortname = (shortpos > 0) ? lowername.slice(0,shortpos) : lowername;
					
				const entry = spell_pack.index.find(e => e.name.toLowerCase() == shortname);
				let itemdata;
				if (entry)
					itemdata = (await spell_pack.getDocument(entry._id)).data.toObject();
				else {
					// Manually create a spell item
					try {
						itemdata = {
							name: spell.shortname ?? spell.name,
							type: 'spell',
							data: {
								uses: {}
							},
						};
						if (spell.type == 'Extraordinary Ability') {
							itemdata.data.abilityType = 'ex';
						}
						itemdata.data.description = {
							value: spell.description['#text']
						};
							// spell not special
						if (spell.spellschool) {
							// There might be more than one spellschool child.
							let school = (spell.spellschool instanceof Array ? spell.spellschool[0] : spell.spellschool)['#text'];
							itemdata.data.level = +spell.level;
							itemdata.data.school = RWPF1Actor.spellschool_names[school.toLowerCase()] ?? school;
							itemdata.data.subschool = spell.subschool;
							if (spell.spelldescript) {
								itemdata.data.types = toArray(spell.spelldescript).map(el => el['#text']).join(';');
							}
							let comps = toArray(spell.spellcomp).map(el => el['#text']);
							let material = (spell.componenttext.indexOf('Material') >= 0);
							let sfocus = (spell.componenttext.indexOf('Divine Focus') >= 0);
							itemdata.data.components = {
								//value: spell.componenttext,
								verbal: comps.includes('Verbal'),
								somatic: comps.includes('Somatic'),
								material: comps.includes('Material'),
								"focus": comps.includes('Focus'),
								divineFocus: // 0=no, 1=DF, 2=M/DF, 3=F/DF
									comps.includes('Focus or Divine Focus') ? 3 :
									comps.includes('Material or Divine Focus') ? 2 :	
									comps.includes('Divine Focus') ? 1 :
									0,
							};
							itemdata.data.castTime = spell.casttime;
							itemdata.data.sr = (spell.resisttext == 'Yes');
							itemdata.data.spellDuration = spell.duration;
							itemdata.data.spellEffect = spell.effect;
							itemdata.data.spellArea = spell.area;
							//itemdata.data.materials.value/focus/gpValue
							// itemdata.data.preparation.preparedAmount/maxAmount/autoDeductCharges/spontaneousPrepared
							if (spell.spontaneous == 'Yes')
								itemdata.data.preparation = {
									spontaneousPrepared: true
								};
						}
					} catch (e) {
						console.log(`Failed to create custom version of '${spell.name}' for '${actor.name}' due to ${e}`);
						continue;
					}
				}
				itemdata.data.spellbook = book;
				if (memorized.includes(lowername)) itemdata.data.preparation = { preparedAmount : 1};
				if (shortpos >= 0) itemdata.name = spell.name;	// full name has extra details
				if (lowername.indexOf('at will)') >= 0) itemdata.data.atWill = true;
				if (lowername.endsWith('/day)')) {
					itemdata.data.uses.max   = parseInt(lowername.slice(-6));	// assume one digit
					itemdata.data.uses.value = itemdata.data.uses.max;
					itemdata.data.uses.per   = 'day';
				}
				//itemdata.data.learnedAt = { 'class': [  };
				actor.items.push(itemdata);
			}
			return true;
		}

		// Technically, we should process spellsmemorized to mark which spells in spellbook are prepared
		let spellbooks = [ 'primary', 'secondary', 'tertiary' ];
		let memorized = [];
		if (character.spellsmemorized.spell) {
			for (const spell of toArray(character.spellsmemorized.spell)) {
				memorized.push(spell.name.toLowerCase());
			}
		}
		if (await addSpells(character.spellbook.spell, spellbooks[0], memorized)) spellbooks.shift();
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
