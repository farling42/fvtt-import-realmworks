export default class RWCoC7Actor {

	static statnames = [ "str", "con", "siz", "dex", "app", "int", "pow", "edu" ];
	
	static knownskills;
	static knownweapons;
	
	static async initModule() {
		console.debug('RWCoC7Actor.initModule invoked');

		// Search the world entries.
		RWCoC7Actor.knownskills  = new Map();
		RWCoC7Actor.knownweapons = new Map();
		// Search all the packs.
		//for (let pack in game.packs) {
		async function checkset(pack, map, entry, strip=false) {
			let basename = entry.name;
			// For weapons, strip off anything in parentheses
			let names = [];
			if (strip) {
				let pos = basename.indexOf(" (");
				if (pos>0) {
					names = basename.slice(pos+2,-1).split(", ");
					basename = basename.slice(0,pos);
				}
			}
			names.push(basename);
			
			let exist = map.has(basename);
			if (!exist || !pack || pack.metadata.package !== "CoC7") {
				// Assume non-system packs contain better information than those supplied in the system.
				for (const name of names) {
					map.set(name.toLowerCase(), pack ? await pack.getDocument(entry._id) : entry);
					//console.log(`Added '${basename}' to map as\n${JSON.stringify(map.get(basename),null,2)}`);
				}
			}
		}
		
		// This little loop takes over 1.4 seconds to process all the packs
		for (const pack of game.packs) {
			if (pack.metadata.type === "Item") {
				//console.log(`pack ${pack.name} contains ${JSON.stringify(pack.metadata,null,2)}`);
				for (const entry of pack.index) {
					if (entry.type === "weapon")
						await checkset(pack, RWCoC7Actor.knownweapons, entry, /*strip*/true);
					else if (entry.type === "skill")
						await checkset(pack, RWCoC7Actor.knownskills, entry);
				}
			}
		}
		
		// Local world versions supercede compendium versions
		game.items.forEach(async(item) => {
			if (item.type === "skill")
				await checkset(undefined, RWCoC7Actor.knownskills,  item);
			else if (item.type === "weapon")
				await checkset(undefined, RWCoC7Actor.knownweapons, item, true);
		});
		console.log(`RWCoC7Actor working with ${RWCoC7Actor.knownskills.size} skills and ${RWCoC7Actor.knownweapons.size} weapons`);
	}
	
	//const GS_MODULE_NAME = "realm-works-import";

	static async parseStatblock(statblock) {
		//console.log(`RWCoC7Actor.parseStatblock with:\n${statblock}`);

/*
		const GS_MODULE_NAME = "realm-works-import";
		const GS_ACTOR_TYPE = "actorType";
		if (!this.handler) {
			await import("./coc7-actor-importerw.js")
				.then(module => this.handler = new module.CoC7ActorImporter)
				.catch(e => `coc7-actor-importer.js is not available: ${e}`)
			//this.handler = new CoC7ActorImporter;
		}
		if (this.handler) {
			this.handler.createActor({
				entity: game.settings.get(GS_MODULE_NAME, GS_ACTOR_TYPE),
				convertFrom6E: 'coc-guess', 	// if any STAT > 30 then it assumes 7th edition
				lang: game.i18n.lang,
				text: statblock + "."
			});
			return undefined;
		}
*/

		let actordata = {
			// TEMPLATE characteristics
			// each has { value: null, tempValue : null, short: "CHARAC.STR", label: "CHARAC.Strength", formula: null }
			// for each of: str, con, siz, dex, app, int, pow, edu
			characteristics : {},
			
			// TEMPLATE attribs
			attribs: {
/*				hp:  { value: null, max: null, "short": "HP", label: "Hit points",     auto: true },
				mp:  { value: null, max: null, "short": "MP", label: "Magic points",   auto: true },
				lck: { value: null, max: 99,   "short": "LCK", label: "Luck",          auto: true },
				san: { value: null, max: 99,   "short": "SAN", label: "Sanity",        auto: true, dailyLoss: 0, oneFifthSanity: " / 0" },
				mov: { value: null, max: null, "short": "MOV", label: "Movement rate", auto: true },
				db:  { value: null, "short": "DB", label: "Damage bonus", auto: true },
				build: { current: null, value: null, "short": "BLD", label: "Build", auto: true },
				armor: { value: null, localized: false, locations: [], auto: false },*/
			},
			// TEMPLATE status
			"status": {
/*				criticalWounds: { type: "Boolean", value: false },
				unconscious:    { type: "Boolean", value: false },
				dying:          { type: "Boolean", value: false },
				dead:           { type: "Boolean", value: false },
				prone:          { type: "Boolean", value: false },
				tempoInsane:    { type: "Boolean", value: false },
				indefInsane:    { type: "Boolean", value: false },*/
			},
			// TEMPLATE biography (not "character")
			biography: [{
					title: "Statblock",
					value: statblock
				}
			],
			// type === "npc"
			infos: {
/*				occupation: "",
				age: "",
				sex: "",
				// type === "creature"
				type: null,*/
			},
			// type === "creature"
			special: {
/*				attribs: {
					move: {
						primary:   { enabled: false, value: null, type: null },
						secondary: { enabled: false, value: null, type: null },
					}
				},
				sanLoss: {
					checkPassed: null,
					checkFailled: null,
				},*/
			},
			// items will be transferred UP TO main actor record elsewhere
			items: []
		};

		function addSkill(percentage, skillname, push=true, fighting=undefined) {
			// The compendium will use the FULL name of a skill with specialization,
			// but the Actor will show the REDUCED name in the title of the skill.
			// Examples include:
			//     Fighting (Brawl)
			//     Language: French
			let part = skillname.indexOf(" (");
			let specname = (part > 0) ? skillname.slice(part+2,-1) : skillname;
			let basename = (part > 0) ? skillname.slice(0,part): undefined;
			
			let skill = RWCoC7Actor.knownskills.get(skillname.toLowerCase());
			// Check for generic specialization
			if (!skill && part>0) {			
				skill = RWCoC7Actor.knownskills.get(skillname.replace(specname, "Any").toLowerCase());
				if (!skill) {
					skill = RWCoC7Actor.knownskills.get(skillname.replace(specname, "Specialization").toLowerCase());
				}
			}
			
			if (!skill) {
				console.debug(`Creating custom skill '${skillname}'`);
				skill = {
					type: "skill",
					name: skillname,
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
						skillName: specname,
						value: percentage,
						properties: {
							special: false,
							rarity:  false,
							push:    push,
							combat:  false,
						},
						description: {
							value: `Manually created when importing statblock.`,
						}
					}
				};
				if (fighting !== undefined) {
					skill.system.properties.combat = true;
					skill.system.properties.fighting = fighting;
					skill.system.properties.firearm  = !fighting;
				}
				if (part>0) {
					skill.system.specialization = basename;
					skill.system.properties.special = true;
				}
			} else {				
				console.log(`Using existing skill '${skill.name}' for '${skillname}'`);
				skill = duplicate(skill);
				// Reduce LONG name of specialization skills in compendium to short name expected in Actor
				if (part>0) skill.name = skillname;
				skill.system.skillName = specname;
				skill.system.value = percentage;
				// Maybe need to force it into being a combat skill
				if (!skill.system.properties.combat && fighting !== undefined) {
					// This is needed for things like Blasting Cap which use
					// Electrical Repair or Artillery as COMBAT skills.
					skill.system.properties.combat = true;
					skill.system.properties.fighting = fighting;
					skill.system.properties.firearm  = !fighting;
				}
			}
			//console.log(`ADDING ${JSON.stringify(skill,null,2)}`);
			// We are NOT passing skill.id into this.
			actordata.items.push({
				type: "skill",
				name:   skill.name,
				system: skill.system});
		}
		
		function addWeapon(score, skillname, damage) {
			let fighting;
			
			// The weapon name is hidden inside the skill speciality
			let part = skillname.indexOf(" (");
			let weaponname = (part > 0) ? skillname.slice(part+2,-1) : skillname;
			let weapon = RWCoC7Actor.knownweapons.get(weaponname.toLowerCase());
			
			if (!weapon) {
				console.debug(`Creating custom weapon '${weaponname}'`);
				// GUESS: if damage ends with "+<DB>" then we'll assume melee
				if (actordata.attribs.db) {
					let dbstr = `+${actordata.attribs.db.value}`;
					//fighting = damage.endsWith(dbstr);
					if (damage.endsWith(dbstr)) damage = damage.slice(0,-dbstr.length);  // strip "+DB" from damage.
				}
				fighting = skillname.startsWith("Fighting");

				// Now set up the weapon.
				weapon = {
					type: "weapon",
					name: weaponname,
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
						skill: {
							main : { name : skillname },	// maybe need ID here too?
						},
						range: {
							normal : { damage : damage },
						},
						properties: {
							addb:   fighting,	// add DB (usually true for melee weapons)
							ahdb:   false,		// add 1/2 DB
							melee:  fighting,	// or "rngd"
							rngd:   !fighting,	// or "melee"
							shotgun:false,		// shotgun (damage reduces with range)
							brst:   false,		// burst
							auto:   false,		// full-auto
							dbrl:   false,		// double-barrel
							spcl:   true,
						},
						description: {
							special: `<p>Manually created when importing statblock.</p>`,
						}
					}
				};
			} else {
				weapon = duplicate(weapon);
				fighting  = weapon.system.properties.melee;
				skillname = weapon.system.skill.main.name;
				console.log(`Using existing weapon: '${weaponname}' that uses the skill '${skillname}'`);
			}
			//console.log(`Adding weapon '${weaponname}' = ${JSON.stringify(weapon,null,2)}`);
			// We are NOT passing weapon.id into this.
			actordata.items.push({
				type: "weapon",
				name: weaponname,		// weapon.name might have some parenthetical extras in it.
				system: weapon.system});
			
			// Now add the relevant weapon skill too.
			addSkill(score, skillname, /*push*/false, fighting);
		}

		let lines = statblock.split('\n');
		// first line has NAME, Age X, occupation
		let line1 = lines[0];
		const AGE_MARKER = ", Age ";
		let agepos = line1.indexOf(AGE_MARKER);
		if (agepos > 0)
		{
			agepos += line1.indexOf(AGE_MARKER);
			let occpos = line1.indexOf(", ", agepos);
			if (occpos < 0)
				actordata.infos.age = +(line1.slice(agepos))
			else {
				actordata.infos.age = +(line1.slice(agepos, occpos));
				actordata.infos.occupation = line1.slice(occpos+2);
			}
		}
		// Now search the rest of the lines
		let maybeweapon=true;
		for (const line of lines) {
			let ll = line.toLowerCase();
			// Lines with stat blocks
			if (ll.startsWith('str') || ll.startsWith('dex') || ll.startsWith('int')) {
				let words = ll.split(/\s+/);
				for (let i=0; i<words.length-1; i+=2) {
					if (words[i] === "hp") {
						actordata.attribs.hp = {value: +words[i+1] };
					} else if (words[i] === "san") {
						actordata.attribs.san = { value: +words[i+1] };
					} else if (words[i] === "Move") {
						actordata.attribs.mov = { value : +words[i+1], auto: false };
					} else {
						actordata.characteristics[words[i]] = { value: +words[i+1] };
					}
				}
			}
			else if (ll.startsWith("damage bonus:")) {
				actordata.attribs.db = { value: +ll.slice(14) };
			}
			else if (ll.startsWith("sanity loss:")) {
				let words=ll.slice(13).split('/');
				actordata.special = { sanLoss : { checkPassed: words[0], checkFailled: words[1] }};
			}
			else if (ll.startsWith("armor: ")) {
				maybeweapon = false;
				let pos = ll.search(/\d/);
				actordata.attribs.armor = { value : parseInt(ll.slice(pos)) };
			}
			else if (ll.startsWith("skills: ") || ll.startsWith("languages: ")) {
				maybeweapon = false;
				for (const skill of line.slice(8).split(", ")) {
					let pos = skill.lastIndexOf(' ');
					let skillname  = skill.slice(0,pos);
					let percentage = +skill.slice(pos+1,-1);
					//console.debug(`add skill '${skillname}' = ${percentage} %`);
					
					let specpos = skillname.indexOf(":");
					if (specpos > 0) {
						// Change something like "Language: Arabic" to "Language (Arabic)"
						let spec = skillname.slice(0,specpos);
						let name = skillname.slice(specpos+2);
						addSkill(percentage, `${spec} (${name})`);
						continue;
					}
					// No specialization
					addSkill(percentage, skillname, undefined);
				}
			}
			else if (ll.startsWith("spells: ")) {
				maybeweapon = false;
				for (const name of line.slice(8).split(", ")) {
					//console.debug(`add spell '${name}'`);
					actordata.items.push({
						type: "spell",
						name: name,
						});
				}
			}
			else if (line.startsWith("Hero Lab and the Hero Lab logo")) {
				// We've reached the end of this statblock.
				break;
			}
			else if (line.startsWith("HP ")) {
				// hp:  { value: null, max: null, "short": "HP", label: "Hit points",     auto: true },
				let hp = +line.slice(3);
				actordata.attribs.hp = { value : hp, max: hp, auto: false };
			}
			else if (line.startsWith("Build: ")) {
				//build: { current: null, value: null, "short": "BLD", label: "Build", auto: true },
				actordata.attribs.build = { value: +line.slice(7), auto: false };
			}
			else if (line.startsWith("Move: ")) {
				//mov: { value: null, max: null, "short": "MOV", label: "Movement rate", auto: true },
				actordata.attribs.mov = { value : +line.slice(6), auto: false };
			}
			else if (line.startsWith("Magic Points: ")) {
				//mov: { value: null, max: null, "short": "MOV", label: "Movement rate", auto: true },
				let mp = +line.slice(14);
				actordata.attribs.mp = { value : mp, max: mp, auto: false };
			}
			else if (line.startsWith("ATTACKS")) {
				// nothing to add
			}
			else if (line.startsWith("Attacks per round:")) {
				// TODO - where to put this?
			}
			// other line possibilities:
			// line1 = name + age + occupation
			// ATTACKS
			// Attacks per round: 1
			// 
			else if (line.startsWith("Dodge ")) {
				addSkill(parseInt(line.slice(6)), "Dodge", undefined);
			}
			else if (maybeweapon && line.length > 0) {
				let attack = line;
				// Maybe 6th edition character
				if (attack.startsWith("Weapons: ")) attack = attack.slice(9);
				if (attack.indexOf("-none-") > 0) continue;
				
				// Assume it is a weapon
				let scorepos = attack.search(/\d+%/);
				let percentpos = attack.indexOf("%",scorepos);
				let damagepos = attack.indexOf(", damage ");
				//console.log(`ATTACK: '${attack}' has scorepos ${scorepos}`);
				if (scorepos == -1) {
					console.info(`Not an attack: '${line}'`);
					continue;
				}
				let skillname = attack.slice(0,scorepos-1);
				let score = parseInt(attack.slice(scorepos));
				let remain = (percentpos>0) ? attack.slice(percentpos+2) : "";
				let damage = (damagepos>0) ? attack.slice(damagepos+9) : "";
				//console.log(`ATTACK: '${skillname}' = '${score}' = '${damage}'`);
				
				// Add the weapon to the combat and skill sections
				addWeapon(score, skillname, damage);
			}
		}
		
		actordata.description = { keeper: `<pre>${statblock}</pre>` };
		//console.log("parseStatblock = " + JSON.stringify(actordata));
		
		return actordata;
		
/*		
		let actordata = {
			// template: common
			attributes: {},
			stats: {},
			details: {},
			powerpoints: {},
			fatigue: {},
			wounds: {},
			advances: {},
			bennies: {},
			"status": {},
			initiative: {},
			additionalStats: {},
			wildcard: true,
		};
		
		// No items[] array accessible :-(
		
		return actor;
*/
	}
	
	
	static async tidyupActors(actors) {
		for (let actor of actors) {
			if (!actor) continue;
			
			// Get all skill ids
			const SKILL_SEP = ":";
			let skills = new Map();
			for (let item of actor.items) {
				if (item.type === "skill") {
					skills.set( item.system.skillName + SKILL_SEP + item.system.specialization, item.id);
				}
			}

			for (let weapon of actor.items) {
				if (weapon.type === "weapon") {
					//console.debug(`tidyupActors: weapon = ${JSON.stringify(weapon, null, 4)}`);
					// Patch link to skill to be used for this weapon.
					let skillname = weapon.system.skill.main.name;
					let pos = skillname.indexOf(" (");
					let basename = (pos>0) ? skillname.slice(pos+2,-1) : skillname;
					let specname = (pos>0) ? skillname.slice(0,pos) : "";
					//console.log(`Weapon '${weapon.name}' = skill '${skillname}', = basename '${basename}', specname '${specname}'`);
					
					let id = skills.get( basename + SKILL_SEP + specname );
					if (id) {			
						//console.log(`Setting weapon '${weapon.name}' to use ${id}`);
						await actor.updateEmbeddedDocuments("Item", [{
							_id : weapon.id,
							"system.skill.main.id" : id,
						}]);
					} else {
						console.warn(`'${actor.name}': Failed to link weapon '${weapon.name}' to the skill '${weapon.system.skill.main.name}'`);
						console.log(`basename '${basename}', specname '${specname}'`);
					}
				}
			}
			//actor.update(actor);
		}		
	}
}