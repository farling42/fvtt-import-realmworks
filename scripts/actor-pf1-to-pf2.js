/**
 * 
 * @param {*} packs     An array of packs to check
 * @param {*} typematch array of strings that must match the 'type' of the Item's to be passed to testfunc
 * @param {*} testfunc  A function to check the name supplied as the only parameter
 * @returns {*} A copy of the data from the pack, or null
 */
async function searchPacks(packs, typematch, testfunc) {
  for (const pack of packs) {
    const entry = pack.index.find(item => typematch.includes(item.type) && testfunc(item.name.toLowerCase()));
    if (entry) {
      let result = (await pack.getDocument(entry._id)).toObject();
      delete result._id;
      return result;
    }
  }
  return null;
}

function toArray(thing) {
  return !thing ? [] : Array.isArray(thing) ? thing : [thing];
}

function noType(name) {
  if (name.endsWith(' (Ex)') ||
    name.endsWith(' (Su)') ||
    name.endsWith(' (Sp)')) {
    return name.slice(0, -5);
  }
  return name;
}

const FEAT_IGNORE = [   // partial strings
  "Armor Proficiency",
  "Skill Focus",
  "Weapon Proficiency"
]
function ignoredFeat(feat) {
  for (const entry of FEAT_IGNORE)
    if (feat.includes(entry)) return true;
  return false;
}

// The types of Item which appear on the Inventory tab of Actors
const ITEM_TYPES = [
  //'attack',
  //'buff',
  //'class',
  //'feat', (feature)
  //'implant'
  //'race'
  //'spell',
  'consumable',
  'backpack',
  'equipment',
  'treasure',
  'weapon'
];

const REMASTERED_LANGUAGES = {
  ["abyssal"]: "chthonian",
  ["aquan"]: "thalassic",
  ["auran"]: "sussuran",
  ["celestial"]: "empyrean",
  ["druidic"]: "wildsong",
  ["gnoll"]: "kholo",
  ["grippli"]: "tripkee",
  ["ignan"]: "pyric",
  ["infernal"]: "diabolic",
  ["sylvan"]: "fey",
  ["terran"]: "petran",
  ["undercommon"]: "sakvroth",
  // Primordial? which is a group of languages
}

const REMASTERED_FEATURES = {
  ["Alertness"]: "Perception Expertise",
  ["Ash"]: "Ashes",
  ["Attack of Opportunity"]: "Reactive Strike",
  ["Druidic Language"]: "Wildsong",
  ["Great Fortitude"]: "Fortitude Expertise",
  ["Incredible Senses"]: "Perception Legend",
  ["Iron Will"]: "Will Expertise",
  ["Lightning Reflexes"]: "Reflex Expertise",
  ["Slippery Mind"]: "Agile Mind",
  ["Second Skin"]: "Medium Amor Mastery",
  ["Trackless Step"]: "Trackless Journey",
  ["Vigilant Senses"]: "Perception Mastery",
  ["Weapon Mastery"]: "Martial Weapon Mastery",
  ["Wild Empathy"]: "Voice of Nature",
  ["Wild Order"]: "Untamed Order",
  ["Wild Stride"]: "Unimpeded Journey",
}

const REMASTERED_SPELLS = {
  ["Abundant Step"]: "Shrink the Span",
  ["Abyssal Wrath"]: "Chthonian Wrath",
  ["Animate Dead"]: "Summon Undead",
  ["Augment Summoning"]: "Fortify Summoning",
  ["Baleful Polymorph"]: "Cursed Metamorphosis",
  ["Barkskin"]: "Oaken Resilience",
  ["Bind Soul"]: "Seize Soul",
  ["Blind Ambition"]: "Ignite Ambition",
  ["Blink"]: "Flicker",
  ["Burning Hands"]: "Breathe Fire",
  ["Calm Emotions"]: "Calm",
  ["Charming Words"]: "Charming Push",
  ["Chill Touch"]: "Void Warp",
  ["Cloudkill"]: "Toxic Cloud",
  ["Color Spray"]: "Dizzying Colors",
  ["Commune with Nature"]: "Commune",
  ["Comprehend Language"]: "Translate",
  ["Continual Flame"]: "Everlight",
  ["Crushing Despair"]: "Wave of Despair",
  ["Dancing Lights"]: "Light",
  ["Dimension Door"]: "Translocate",
  ["Dimensional Anchor"]: "Planar Tether",
  ["Dimensional Lock"]: "Planar Seal",
  ["Discern Location"]: "Pinpoint",
  ["Disrupt Undead"]: "Vitality Lash",
  ["Disrupting Weapon"]: "Infuse Vitality",
  ["Dragon Claws"]: "Flurry of Claws",
  ["Efficient Apport"]: "Reclined Apport",
  ["Empty Body"]: "Embrace Nothingness",
  ["Endure Elements"]: "Environmental Endurance",
  ["Entangle"]: "Entangling Flora",
  ["Faerie Fire"]: "Revealing Light",
  ["False Life"]: "False Vitality",
  ["Feather Fall"]: "Gentle Landing",
  ["Feeblemind"]: "Never Mind",
  ["Finger of Death"]: "Execute",
  ["Flaming Sphere"]: "Floating Flame",
  ["Flesh To Stone"]: "Petrify",
  ["Floating Disk"]: "Carryall",
  ["Force Cage"]: "Lifewood Cage",
  ["Freedom of Movement"]: "Unfettered Movement",
  ["Gaseous Form"]: "Vapor Form",
  ["Gentle Repose"]: "Peaceful Rest",
  ["Glibness"]: "Honeyed Words",
  ["Glitterdust"]: "Revealing Light",
  ["Globe of Invulnerability"]: "Dispelling Globe",
  ["Glutton's Jaw"]: "Glutton's Jaws",
  ["Glyph of Warding"]: "Rune Trap",
  ["Goodberry"]: "Cornucopia",
  ["Hallucinatory Terrain"]: "Mirage",
  ["Heroes' Feast"]: "Fortifying Brew",
  ["Hideous Laughter"]: "Laughing Fit",
  ["Horrid Wilting"]: "Desiccate",
  ["Hyperfocus"]: "Clouded Focus",
  ["Hypnotic Pattern"]: "Hypnotize",
  ["Inspire Competence"]: "Uplifting Overture",
  ["Inspire Courage"]: "Courageous Anthem",
  ["Inspire Defense"]: "Rallying Anthem",
  ["Inspire Heroics"]: "Fortissimo Composition",
  ["Invisibility Sphere"]: "Shared Invisibility",
  ["Ki Strike"]: "Inner Upheaval",
  ["Ki Blast"]: "Qi Blast",
  ["Ki Form"]: "Qi Form",
  ["Ki Rush"]: "Qi Rush",
  ["Know Direction"]: "Know the Way",
  ["Legend Lore"]: "Collective Memories",
  ["Longstrider"]: "Tailwind",
  ["Mage Armor"]: "Mystic Armor",
  ["Mage Hand"]: "Telekinetic Hand",
  ["Magic Aura"]: "Disguise Magic",
  ["Magic Fang"]: "Runic Body",
  ["Magic Missile"]: "Force Barrage",
  ["Magic Mouth"]: "Embed Message",
  ["Magic Weapon"]: "Runic Weapon",
  ["Magnificent Mansion"]: "Planar Palace",
  ["Maze"]: "Quandary",
  ["Meld into Stone"]: "One with Stone",
  ["Meteor Swarm"]: "Falling Stars",
  ["Mind Blank"]: "Hidden Mind",
  ["Misdirection"]: "Disguise Magic",
  ["Modify Memory"]: "Rewrite Memory",
  ["Neutralize Poison"]: "Cleanse Affliction",
  ["Nondetection"]: "Veil of Privacy",
  ["Obscuring Mist"]: "Mist",
  ["Pass Without Trace"]: "Vanishing Tracks",
  ["Passwall"]: "Magic Passage",
  ["Phantom Mount"]: "Marvelous Mount",
  ["Planar Binding"]: "Planar Servitor",
  ["Plane Shift"]: "Interplanar Teleport",
  ["Positive Luminance"]: "Vital Luminance",
  ["Private Sanctum"]: "Peaceful Bubble",
  ["Prying Eye"]: "Scouting Eye",
  ["Pulse of the City"]: "Pulse of Civilization",
  ["Purify Food And Drink"]: "Cleanse Cuisine",
  ["Quivering Palm"]: "Touch of Death",
  ["Ray of Enfeeblement"]: "Enfeeble",
  ["Remove Curse"]: "Cleanse Affliction",
  ["Remove Diease"]: "Cleanse Affliction",
  ["Remove Fear"]: "Clear Mind",
  ["Remove Paralysis"]: "Sure Footing",
  ["Resilient Sphere"]: "Containment",
  ["Restore Senses"]: "Sound Body",
  ["Righteous Might"]: "Sacred Form",
  ["Roar of the Wyrm"]: "Roar of the Dragon",
  ["Scorching Ray"]: "Blazing Bolt",
  ["Searing Light"]: "Holy Light",
  ["Scintillating Pattern"]: "Confusing Colors",
  ["See Invisibility"]: "See the Unseen",
  ["Shadow Walk"]: "Umbral Journey",
  ["Shapechange"]: "Metamorphosis",
  ["Shield Other"]: "Share Life",
  ["Simulacrum"]: "Shadow Double",
  ["Sound Burst"]: "Noise Blast",
  ["Spectral Hand"]: "Ghostly Carrier",
  ["Spider Climb"]: "Gecko Grip",
  ["Splash of Art"]: "Creative Splash",
  ["Stone Tell"]: "Speak with Stones",
  ["Stoneskin"]: "Mountain Resilience",
  ["Tanglefoot"]: "Tangle Vine",
  ["Time Stop"]: "Freeze Time",
  ["Tongues"]: "Truespeech",
  ["Touch of Corruption"]: "Touch of the Void",
  ["Touch of Idiocy"]: "Stupefy",
  ["Tree Shape"]: "One with Plants",
  ["Tree Stride"]: "Nature's Pathway",
  ["Trueseeing"]: "Truesight",
  ["True Strike"]: "Sure Strike",
  ["Unseen Custodians"]: "Phantasmal Custodians",
  ["Unseen Servant"]: "Phantasmal Minion",
  ["Vampiric Touch"]: "Vampiric Feast",
  ["Veil"]: "Illusory Disguise",
  ["Vigilant Eye"]: "Rune of Observation",
  ["Wail of the Banshee"]: "Wails of the Damned",
  ["Wind Walk"]: "Migration",
  ["Wholeness of Body"]: "Harmonize Self",
  ["Word of Recall"]: "Gathering Call",
  ["Zone of Truth"]: "Ring of Truth",
};

export default class RWPF1to2Actor {

  // Do we need the translated name for these categories?
  // item.type = weapon | equipment | consumable | loot | class | spell | feat | buff | attack | race | container
  // This coarse list (based purely on topic category) will be refined by getItemType (which can look inside the topic structure)
  static CategoryItemTypes = new Map([
    ["Feat", "feat"],
    ["Archetype/Domain/Etc.", "feat"],
    ["Trait/Drawback", "feat"],
    ["Skill", "feat"],
    ["Magic Item", "equipment"],
    ["Mundane Weapon", "weapon"],
    ["Mundane Item", "equipment"],
    ["Mundane Armor/Shield", "equipment"],
    ["Named Object", "equipment"],
    ["Named Equipment", "equipment"],
    ["Race", "ancestry"],
    ["Class", "class"],
    ["Spell", "spell"],
  ]);

  // Items whose name doesn't fit into one of the pattern matches.
  static item_name_mapping = new Map([
    ["thieves' tools", "tools, thieves' (common)"],
    ["thieves' tools, masterwork", "tools, thieves' (masterwork)"],
    ["thieves' tools, concealable", "tools, thieves' (concealable)"],
    ["pot", "pot, cooking (iron)"],
    ["feed", "feed, animal"],
    ["riding saddle", "saddle (riding)"],
    ["military saddle", "saddle (military)"],
    ["exotic saddle", "saddle (exotic)"],
  ]);

  static feat_name_mapping = new Map([
    ["Armor Proficiency (Light)", "Armor Proficiency, Light"],
    ["Armor Proficiency (Medium)", "Armor Proficiency, Medium"],
    ["Armor Proficiency (Heavy)", "Armor Proficiency, Heavy"],
  ]);

  static once;
  static skill_mapping = {};
  static ability_names = {}

  static wizard_subclasses = ['Abjurer', 'Conjurer', 'Diviner', 'Enchanter', 'Evoker', 'Illusionist', 'Necromancer', 'Transmuter', 'Universalist'];

  static item_packs;
  static feat_packs;
  static classability_packs;
  static bestiary_packs;
  static parser;

  static async initModule() {
    // Delete any previous stored data first.
    RWPF1to2Actor.item_packs = [];
    RWPF1to2Actor.feat_packs = [];
    RWPF1to2Actor.classability_packs = [];
    RWPF1to2Actor.bestiary_packs = [];

    const bestiary = game.modules.find(m => m.id === 'statblock-library');

    // Get a list of the compendiums to search,
    // using compendiums in the two support modules first (if loaded)
    let items = { core: [], modules: [] };
    let feats = { core: [], modules: [] };
    let classfeats = { core: [], modules: [] };
    let worldpacks = [];
    for (const pack of game.packs) {
      if (pack.metadata.type === 'Item') {
        // 'type' of 'Item' documents are:
        // attack
        // buff
        // class (racial hd, mythic path, etc.)
        // consumable
        // equipment (magic item, etc)
        // feat (class feature, talent, etc)
        // loot
        // spell
        // weapon
        // race (ItemRacePF)
        // ?container (ItemContainerPF)
        let stuff = items;
        if (pack.metadata.name.includes('feats') || pack.metadata.name.includes('traits'))
          stuff = feats;
        else if (pack.metadata.name.includes('class-abilities'))
          stuff = classfeats;

        if (pack.metadata.packageType === 'world') {
          // We can't be sure what is actually in a WORLD compendium, so use the pack for all three types of things.
          worldpacks.push(pack);
        } else if (pack.metadata.packageType === 'system')
          stuff.core.push(pack);
        else if (
          pack.metadata.packageName === 'pf-content' ||
          pack.metadata.packageName === 'pf1-archetypes')
          stuff.modules.push(pack);
      } else if (pack.metadata.type === 'Actor') {
        RWPF1to2Actor.bestiary_packs.push(pack);
      }
    }
    // Core packs have better modifiers in them, so use them first.
    // Always put the core packs last - i.e. prefer contents from modules before core
    // so that the module compendiums are searched first.

    // WORLD compendiums first, then SYSTEM compendiums, then MODULE compendiums
    RWPF1to2Actor.item_packs = [].concat(worldpacks, items.core, items.modules);
    RWPF1to2Actor.feat_packs = [].concat(worldpacks, feats.core, feats.modules);
    RWPF1to2Actor.classability_packs = [].concat(worldpacks, classfeats.core, classfeats.modules);

    if (RWPF1to2Actor.once) return;
    RWPF1to2Actor.once = true;

    RWPF1to2Actor.skill_mapping = new Map();
    for (const [key, value] of Object.entries(CONFIG.PF2E.skills)) {
      RWPF1to2Actor.skill_mapping[game.i18n.localize(value.label).toLowerCase()] = key;
      RWPF1to2Actor.skill_mapping[value.attribute] = key;
    }
    // both "strength" and "str" are stored with "str" as the value
    for (const [key, value] of Object.entries(CONFIG.PF2E.abilities)) {
      RWPF1to2Actor.ability_names[game.i18n.localize(value).toLowerCase()] = key;
      RWPF1to2Actor.ability_names[key] = key;
    }
  }

  // See PF1E: ItemSheetPF._createSpellbook (on class sheet)
  //   await this.item.actor.createSpellbook({ ...this.item.system.casting, class: this.item.system.tag });

  static create_spellbook(actordata, classitem) {
    // TODO
    //return pf1.documents.actor.ActorPF.prototype.createSpellbook.call(actordata, 
    //  { ...classitem.system.casting, class: classitem.system.tag }, 
    //  { commit: false })
  }

  static async parseStatblock(html) {
    // Ideally we would see if SBC can parse the statblock.

    // Look for bestiary entries for each creature in the statblock:
    // Each creature name line is of the form:
    //   the creature name CR x
    if (RWPF1to2Actor.bestiary_packs) {
      if (!RWPF1to2Actor.parser) RWPF1to2Actor.parser = new DOMParser();
      const doc = RWPF1to2Actor.parser.parseFromString(html, "text/xml");
      const htmltext = doc.body?.querySelector('p')?.innerText;
      const match = htmltext?.match(/(.+?) CR \d+/);
      if (match) {
        // strip leading "<p>"
        const name = match[1].trim();
        const lowername = name.toLowerCase();
        for (const pack of RWPF1to2Actor.bestiary_packs) {
          const found = pack.index.find(doc => doc.name.toLowerCase().startsWith(lowername));
          if (found) {
            html = html.replace(name, `@UUID[${found.uuid}]{${name}}`)
            break;
          }
        }
      }
    }

    return { details: { notes: { value: html } } }
  };

  static async createActorData(character) {
    // The main character
    let result = [await RWPF1to2Actor.createOneActorData(character)];
    // The minions (if any)
    for (const minion of toArray(character.minions.character)) {
      result.push(await RWPF1to2Actor.createOneActorData(minion));
    }
    return result;
  }

  static async createOneActorData(character) {

    //console.debug(`Parsing ${character.name}`);
    const numberpattern = /[\d]+/;

    function addParas(string) {
      if (!string) return "";
      return `<p>${string.replace(/\n/g, '</p><p>')}</p>`;
    }

    // role="pc" is set on any character's in a PC's portfolio, including sidekicks and mounts.
    // A better test is to check for type="Hero" to detect a proper PC.
    let actor = {
      name: character.name,
      type: 'npc',
      relationship: character.relationship,
      system: {
        attributes: {},
        initiative: {},
        details: {},
        resources: {},
        abilities: {},
        perception: {},
        saves: {},
        skills: {},
        traits: {
          value: [],
          size: {}
        },
        spellcasting: {},
      },
      items: []		// add items with :   items.push(new Item(itemdata).system)
    };
    if (character.settings.summary) actor.system.details.publication = character.settings.summary;

    // system.traits.size - fine|dim|tiny|med|lg|huge|grg|col
    switch (character.size.name) {
      case 'Fine': actor.system.traits.size.value = 'fine'; break;
      case 'Diminutive': actor.system.traits.size.value = 'dim'; break;
      case 'Tiny': actor.system.traits.size.value = 'tiny'; break;
      case 'Small': actor.system.traits.size.value = 'sm'; break;
      case 'Medium': actor.system.traits.size.value = 'med'; break;
      case 'Large': actor.system.traits.size.value = 'lg'; break;
      case 'Huge': actor.system.traits.size.value = 'huge'; break;
      case 'Gargantuan': actor.system.traits.size.value = 'grg'; break;
      case 'Colossal': actor.system.traits.size.value = 'col'; break;
      default:
        console.warn(`Unknown actor size ${character.size.name}`);
    }

    //let hp = +character.health.hitpoints;
    actor.system.attributes.hp = {
      value: +character.health.currenthp,
      max: +character.health.hitpoints
    };

    // system.details.cr.base/total
    const cr = +character.challengerating.value;
    actor.system.details.level = { value: (cr < 1) ? Math.floor(cr * 2 - 1) : cr };

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
    let classnames = [];
    let classbab = 0;
    let spellmaps = new Map();
    actor.system.attributes.spells = {
      spellbooks: {
        primary: { label: game.i18n.localize("PF1.SpellBookPrimary") },
        secondary: { label: game.i18n.localize("PF1.SpellBookSecondary") },
        tertiary: { label: game.i18n.localize("PF1.SpellBookTertiary") },
        spelllike: { label: game.i18n.localize("PF1.SpellBookSpelllike") },
      }
    };

    // <types><type name="Humanoid" active="yes"/>
    // <subtypes><subtype name="Human"/>
    if (character.types.type) {
      actor.system.traits.value.push(character.types.type.name.toLowerCase());
      for (const st of toArray(character.subtypes?.subtype)) {
        actor.system.traits.value.push(st.name.toLowerCase());
      }
    }
    //
    // ATTRIBUTES tab
    //
    // attrvalue.base is unmodified by magical items, but INCLUDES racial bonus!
    // attrvalue.modified includes bonuses
    for (const attr of character.attributes.attribute) {
      actor.system.abilities[RWPF1to2Actor.ability_names[attr.name.toLowerCase()]] = {
        mod: (attr.attrbonus.text == '-') ? -5 : +attr.attrbonus.modified,
      }
    }

    actor.system.saves = {};
    for (const child of character.saves.save) {
      if (child.abbr == "Fort") {
        actor.system.saves.fortitude = {
          value: +child.save
        };
      } else if (child.abbr == "Ref") {
        actor.system.saves.reflex = {
          value: +child.save
        };
      } else if (child.abbr == "Will") {
        actor.system.saves.will = {
          value: +child.save
        };
      }
    };

    actor.system.attributes.speed = {
      value: +character.movement.basespeed.value,
      // otherSpeeds: []
      // details: ""
    }
    const bio = character.personal.description['#text'];
    if (bio) actor.system.details.publicNotes = addParas(bio);

    // AC will be calculated automatically
    actor.system.attributes.ac = {
      value: +character.armorclass.ac,
      //details: ""
    };

    //
    // COMBAT tab
    //
    // (Items in the Inventory will be added later by postCreateActors)
    //

    if (false)
      for (const attack of toArray(character.melee?.weapon).concat(toArray(character.ranged?.weapon))) {
        if (attack?.useradded === "no") {
          // decode crit: either "x2" or "17-20/x2"
          let x = attack.crit.indexOf("×");
          let critrange = (x === 0) ? 20 : parseInt(attack.crit);
          let critmult = +attack.crit.slice(x + 1);
          let primaryAttack = parseInt(attack.attack) >= (attack.rangedattack ? attackrange : attackmelee);

          console.debug(`ATTACK: ${character.name} - ${attack.name} - ${attack.typetext}`)
          let itemdata = {
            // item
            name: attack.name,
            type: "weapon",
            //subType: "weapon",
            hasAttack: true,
            img: 'systems/pf2e/icons/default-icons/weapon.svg',   // make it clear that we created it manually
            system: {
              // TEMPLATE: itemDescription
              description: { value: attack.description["#text"], chat: "", unidentified: "" },
              attackNotes: (attack.damage.indexOf(" ") > 0) ? [attack.damage] : [],
              subType: "natural",		// or weapon?
              primaryAttack: primaryAttack,	// TODO : very coarse (if false, then -5 to attack)
            }
          }
          if (attack.rangedattack) {
            itemdata.system.range = {
              value: attack.rangedattack.rangeinctext,
              units: "ft",
              maxIncrements: 1,
              //minValue: null,
              //minUnits: "",
            };
          } else {
            itemdata.system.range = {
              //value: null,
              units: "melee",
              //maxIncrements: 1,
              //minValue: null,
              //minUnits: "",
            };
          }

          // Build the actual attack action
          let atkdata = {};
          atkdata.activation = { cost: 1, type: "weapon" };
          atkdata.duration = { value: null, units: "inst" };
          atkdata.attackName = game.i18n.localize("PF1.Attack");
          atkdata.actionType = (attack.rangedattack ? "rwak" : "mwak");		// eg "rwak" or "mwak"
          atkdata.attackBonus = (parseInt(attack.attack) - +character.attack.baseattack).toString();		// use FIRST number, remove BAB (since FVTT-PF1 will add it)
          let dmgparts = []; // convert 'B/P/S' to array of damage types
          for (const part of attack.typetext.split('/')) {
            switch (part) {
              case 'B': dmgparts.push('bludgeoning'); break;
              case 'P': dmgparts.push('piercing'); break;
              case 'S': dmgparts.push('slashing'); break;
            }
          }
          if (attack.typetext) dmgparts.push(attack.typetext);
          atkdata.damage = {
            parts: [{  // array of DamagePartModel
              formula: attack.damage.split(' ')[0],
              types: dmgparts,
              type: {
                custom: "",
                values: dmgparts
              }
            }]
          };			//   [ [ "sizeRoll(1, 4, @size)", "B" ] ]
          atkdata.enh = { override: false, value: 0 };
          atkdata.attackName = 'Attack';
          atkdata.ability = {
            // attackBonus and damage already include attackBonus/damage.parts above, so don't let FVTT-PF1 add it again
            //attack: (attack.rangedattack ? "dex" : "str"),		// "str" or "dex"
            //damage: (attack.rangedattack ? null  : "str"),		// "str" or "dex" or null (ranged weapons might always have null)
            attack: '',  // don't apply stat
            damage: '',  // don't apply stat
            // max: '',
            damageMult: 1,
            critRange: critrange,
            critMult: critmult,
          };
          atkdata.attackNotes = (attack.damage.indexOf(" ") > 0) ? [attack.damage] : [];
          if (!atkdata.range) atkdata.range = {};
          atkdata.range = {
            units: attack.categorytext.includes('Reach Weapon') ? 'reach' : 'melee'
          };
          atkdata.attackType = "natural";		// or weapon?
          atkdata.nonlethal = (attack.damage.indexOf("nonlethal") != -1);

          /*atkdata.save = {
            dc: "25",
            description: "",
            harmless: false,
            type: "fort"
          }*/
          // TODO
          //itemdata.system.actions = [ new pf1.components.ItemAction(atkdata).toObject() ];

          actor.items.push(itemdata);
        }
      }
    // COMBAT - MISCELLANEOUS
    if (false)
      for (const miscatk of toArray(character.attack.special)) {
        let atkdata = {
          name: "Special Attack: " + miscatk.name,
          type: "weapon",
          //subType: "misc",  // ability, item, misc, natural, racialAbility, weapon
          img: "systems/pf2e/icons/default-icons/weapon.svg",
          system: {
            description: {
              value: miscatk.description["#text"],
              chat: "",
              unidentified: ""
            },
            subType: "misc",
          },
        };
        actor.items.push(atkdata);
      }

    //
    // INVENTORY tab
    //

    // system.currency.pp/gp/sp/cp
    actor.system.currency = {
      pp: +character.money.pp,
      gp: +character.money.gp,
      sp: +character.money.sp,
      cp: +character.money.cp,
    }
    // system.altCurrency.pp/gp/sp/cp  (weightless coins) - count as weightless

    // gear.[item.name/quantity/weight/cost/description
    if (false)  // TODO
      for (const item of toArray(character.gear?.item).concat(toArray(character.magicitems?.item))) {
        // Get all forms of item's name once, since we search each pack.
        let lower = noType(item.name).toLowerCase();
        let singular, reversed, pack, entry, noparen;
        // Firstly deal with masterwork and enhancement bonuses on weapons.
        let masterwork, enh;
        if (lower.startsWith("masterwork ")) {
          masterwork = true;
          lower = lower.slice(11);
        }
        if (lower.length > 3 && lower[0] === "+" && lower[2] === " ") {
          enh = parseInt(lower[1]);
          if (!isNaN(enh)) lower = lower.slice(3);
        }
        // Handle "Something (else)" -> "Something, else"
        if (lower.endsWith(')')) {
          let pos = lower.lastIndexOf(' (');
          noparen = lower.slice(0, pos) + ', ' + lower.slice(pos + 2, -1);
          //console.error(`'${item.name}' has noparen = '${noparen}'`)
        }
        // Remove container "(x @ y lbs)"
        //if (lower.endsWith(')') && (lower.endsWith('lbs)') || lower.endsWith('empty)') || lower.endsWith('per day)') || lower.endsWith('/day)')))
        if (lower.endsWith(')'))
          lower = lower.slice(0, lower.lastIndexOf(' ('));
        // Remove plurals
        if (lower.endsWith('s')) singular = lower.slice(0, -1);
        // Handle names like "bear trap" => "trap, bear"
        const words = lower.split(' ');
        if (words.length == 2) reversed = words[1] + ', ' + words[0];

        // Finally, some name changes aren't simple re-mappings
        if (RWPF1to2Actor.item_name_mapping.has(lower)) lower = RWPF1to2Actor.item_name_mapping.get(lower);

        // Match items of any type
        let itemdata = await searchPacks(RWPF1to2Actor.item_packs, ITEM_TYPES, itemname =>
          itemname === lower ||
          (singular && itemname === singular) ||
          (reversed && itemname === reversed) ||
          (noparen && itemname === noparen))

        // Potions, Scrolls and Wands
        if (!itemdata) {
          let type;
          if (lower.startsWith('potion of '))
            type = 'potion';
          else if (lower.startsWith('scroll of '))
            type = 'scroll';
          else if (lower.startsWith('wand of '))
            type = 'wand';
          if (type) {
            let found;
            let pos = lower.indexOf(' of ');
            let spells = lower.slice(pos + 4).split(', ');
            for (const spellname of spells) {
              let spelldata = await searchPacks(RWPF1to2Actor.item_packs, ['spell'], itemname => itemname == spellname);
              if (!spelldata) {
                console.warn(`Failed to find spell '${spellname}' for item '${item.name}'`)
                continue;
              }
              let itemdata = await CONFIG.Item.documentClasses.spell.toConsumable(spelldata, type);
              if (itemdata) {
                // Check uses
                for (const tracked of toArray(character.trackedresources?.trackedresource)) {
                  if (tracked.name.toLowerCase().startsWith(lower)) {
                    const left = +tracked.left;
                    if (type === 'wand')
                      itemdata.system.uses.value = +tracked.left;
                    if (!left) itemdata.system.quantity = +tracked.left;
                  }
                }
                actor.items.push(itemdata);
                // Abort the rest of creation for this item
                found = true;
              }
              else
                console.error(`Failed to create ${type} for '${item.name}'`);
            }
            if (found) continue;
          }
        }
        if (!itemdata) {
          // Maybe this item contains a longer description, so look for an item whose name
          // appears at the end of this item's name
          itemdata = await searchPacks(RWPF1to2Actor.item_packs, ITEM_TYPES, itemname =>
            lower.endsWith(itemname) ||
            (singular && singular.endsWith(itemname)) ||
            (reversed && reversed.endsWith(itemname)) ||
            (noparen && noparen.endsWith(itemname)))
          if (itemdata)
            console.log(`Found item (${itemdata.name}) which ENDS with the creature's item name (${item.name})`)
        }

        if (itemdata) {
          itemdata.system.quantity = +item.quantity;
          if (masterwork) itemdata.system.masterwork = true;
          if (enh) {
            if (itemdata.system.armor)
              itemdata.system.armor.enh = enh;
            else
              itemdata.system.enh = enh;
          }
          // Restore original POR name if there is information in brackets at the end of the name
          if (masterwork || enh || item.name.endsWith(')')) {
            itemdata.name = item.name;
            itemdata.system.identifiedName = item.name;
          }
          // Special modifier for armor
          if (itemdata.type === 'equipment' &&
            itemdata.system.equipmentType === 'armor') {
            if (lower.includes('mithral ')) {
              // armor check penalty reduced by 3
              // max dex increased by 2
              // weight set to 50%
              itemdata.system.armor.acp = (itemdata.system.armor.acp < 3) ? 0 : (itemdata.system.armor.acp - 3);
              itemdata.system.armor.dex += 2;
              itemdata.system.weight.value /= 2;
            }
          }
          actor.items.push(itemdata);
        } else {

          // TODO: Consumable items which contain a spell..
          //if (item.name.startsWith('Potion of'))
          //if (item.name.startsWith('Scroll of'))
          //if (item.name.startsWith('Wand of'))

          // Create our own placemarker item.
          const itemdata = {
            name: item.name,
            type: item.name.includes(' lbs)') ? 'container' : 'loot',
            img: 'systems/pf2e/icons/default-icons/weapon.svg',   // make it clear that we created it manually
            system: {
              quantity: +item.quantity,
              weight: { value: +item.weight.value },
              price: +item.cost.value,
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

    //
    // SKILLS tab
    //
    for (const skill of character.skills.skill) {
      if (skill.name === "Perception") {
        actor.system.perception = { mod: +skill.value }
        continue;
      }

      if (skill.ranks === 0) continue;

      // <skill name="Acrobatics" ranks="5" attrbonus="5" attrname="DEX" value="10" armorcheck="yes" classskill="yes" trainedonly="yes" usable="no" tools="uses|needs">
      let baseskill = this.skill_mapping[skill.name.toLowerCase()];
      actor.system.skills[baseskill] = {
        attribute: RWPF1to2Actor.ability_names[skill.attrname.toLowerCase()],  // "cha"
        base: +skill.value,
        // breakdown:
        // dc:
        // itemId:
        // label: "Deception"
        // lore: false
        mod: +skill.value,
        // modifiers: []
        // slug: "deception"
        // special: []
        // totalModifier: number
        value: +skill.value,
        // visible: true
      };
    }


    //
    // FEATURES tab
    //

    // system.items (includes feats) - must be done AFTER skills

    for (const feat of toArray(character.feats?.feat)) {
      if (ignoredFeat(feat.name)) continue;

      let itemdata = {
        name: feat.name,
        type: 'action',
        img: 'systems/pf2e/icons/default-icons/action.svg',   // make it clear that we created it manually
        system: {
          //featType: (feat.categorytext == 'Racial') ? 'racial' : 'trait',	// feat, classFeat, trait, racial, misc, template
          actionType: { value: "passive" },
          // actions:
          category: "interaction",
          // deathNote: false
          description: {
            // addenda: [],
            // gm: [],
            value: addParas(feat.description['#text'])
          }
          // publication:
          // selfEffect: null
          // slug: null
          // traits:
        }
      }
      // maybe handle itemdata.system.uses?.max
      actor.items.push(itemdata);
    }

    // Traits (on FEATURES tab)
    // <trait name="Dangerously Curious" categorytext="Magic">
    for (const trait of toArray(character.traits?.trait)) {
      if (ignoredFeat(trait.name)) continue;

      let itemdata = {
        name: trait.name,
        type: 'action',
        img: 'systems/pf2e/icons/default-icons/action.svg',   // make it clear that we created it manually
        system: {
          //featType: (trait.categorytext == 'Racial') ? 'racial' : 'trait',	// feat, classFeat, trait, racial, misc, template
          actionType: { value: "passive" },
          // actions:
          category: "interaction",
          // deathNote: false
          description: {
            // addenda: [],
            // gm: [],
            value: addParas(trait.description['#text'])
          }
          // publication:
          // selfEffect: null
          // slug: null
          // traits:
        }
      }
      // maybe handle itemdata.system.uses?.max
      actor.items.push(itemdata);
    }
    // and otherspecials.special with sourcetext attribute set to one of the classes
    // find items in "class-abilities"


    // defensive.[special.shortname]  from 'class abilities'
    for (const special of toArray(character.defensive.special).concat(toArray(character.otherspecials.special))) {
      // Special abilities such as class abilities have a type of 'feat'
      // Ignore anything in parentheses
      if (ignoredFeat(special.name)) continue;

      let itemdata = {
        name: special.name,
        type: 'action',
        img: 'systems/pf2e/icons/default-icons/action.svg',   // make it clear that we created it manually
        system: {
          //featType: (special.categorytext == 'Racial') ? 'racial' : 'trait',	// feat, classFeat, trait, racial, misc, template
          actionType: { value: "passive" },
          // actions:
          category: "interaction",
          // deathNote: false
          description: {
            // addenda: [],
            // gm: [],
            value: addParas(special.description['#text'])
          }
          // publication:
          // selfEffect: null
          // slug: null
          // traits:
        }
      }
      // maybe handle itemdata.system.uses?.max
      actor.items.push(itemdata);

      /*
      let lowername = special.shortname.toLowerCase();
      let shortname;
      if (lowername.endsWith(')')) shortname = lowername.slice(0, lowername.lastIndexOf(' ('));

      // Ignore abilities which were auto-entered by the class processing above,
      // or which were added from a magic item.
      let found=false;
      for (const item of actor.items) {
        let itemname = item.name.toLowerCase();
        if (itemname == lowername || (shortname && itemname == shortname)) {
          found=true;
          break;
        }
      }
      if (found) {
        console.log(`ignoring ${special.name} since it already exists in items[]`);
        continue;
      }

      let specname = special.name;
      let itemdata = await searchPacks(classnames.includes(special?.sourcetext) ? RWPF1to2Actor.classability_packs : RWPF1to2Actor.feat_packs, ['feat'], 
        itemname => itemname == lowername || (shortname && itemname == shortname));
      if (!itemdata) {
        itemdata = {
          type: 'feat',
          img:  'systems/pf2e/icons/default-icons/weapon.svg',   // make it clear that we created it manually
          system: {
            featType: (special?.sourcetext == 'Trait') ? 'trait' : (classnames.includes(special?.sourcetext)) ? 'classFeat' : 
              actor.type === 'racial'
          }
        }
        if (special.sourcetext) itemdata.system.associations = {classes: [[special.sourcetext]]};
        // maybe add uses
        let uses = specname.match(/ \((\d+)\/([\w]+)\)/);
        if (uses) {
          itemdata.system.uses = { max : +uses[1], per: uses[2], value: 0}
          specname = specname.slice(0,uses.index);
        }
      }
      itemdata.name = noType(specname);
      //itemdata.system.featType = 'racial';
      itemdata.system.description = { value: addParas(special.description['#text'])};
      if (special.type) itemdata.system.abilityType = special.type.slice(0,2).toLowerCase();
      actor.items.push(itemdata);
      */
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
    // system.attributes.spells.spellbooks.primary/secondary/tertiary/spelllike
    //
    // system.attributes.spellbooks.usedSpellbooks: [ 'primary', 'tertiary', 'spelllike' ]
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

    // Add SpellcastingEntryPF2e for each spellbook
    //    type: "spellcastingEntry"
    //    name: string
    //    prepared: { felxible: boolean, value: "innate" }  - Spellcasting Type
    //    tradition: { value : "occult" } - Magic Tradition
    //    ability: { value: "cha" }  - Key Attribute
    //    autoHeightenLevel : { value : null } - Auto Heighten Rank [null = default]
    //    description: { value: "" }
    //    proficiency: { value: 1 }
    //    slots: { slot0: { prepared: array (spells), value: 0, max: 5 } }
    //    spelldc: { dc : 19, mod: 0, value: 11 }
    //
    // Add SpellPF2e for each spell
    //    location: { value : "uuid-of-spellcastingentry" }

    async function addSpells(nodes, memorized = undefined) {
      if (!nodes) return false; // TODO

      // <spell name="Eagle's Splendor" level="2" class="Sorcerer" casttime="1 action" range="touch" target="creature touched" area="" effect="" duration="1 min./level" 
      //		save="Will negates (harmless)" resist="yes" dc="18" casterlevel="7" componenttext="Verbal, Somatic, Material or Divine Focus"
      //		schooltext="Transmutation" subschooltext="" descriptortext="" savetext="Harmless, Will negates" resisttext="Yes" spontaneous="yes">
      // <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">
      for (const spell of toArray(nodes)) {
        const spellname = REMASTERED_SPELLS[spell.name] || spell.name;
        const lowername = spellname.toLowerCase();
        const shortpos = lowername.indexOf(' (');
        const shortname = (shortpos > 0) ? lowername.slice(0, shortpos) : lowername;

        // Manage spellbooks
        let spellclass = spell['class'] || "memorized";   // class is a JS reserved word
        let lowersc = spellclass.toLowerCase();
        if (!spellmaps.has(lowersc)) {
          // Get the next available spellbook for the Actor
          let bookid = foundry.utils.randomID();

          actor.items.push({
            _id: bookid,
            type: "spellcastingEntry",
            name: spellclass,
            img: "systems/pf2e/icons/default-icons/spellcastingEntry.svg",
            // prepared.flexible ?
            prepared: { flexible: false, value: (typeof memorized === 'string') ? "prepared" : "innate" },  // Spellcasting Type
            //tradition: { value : "occult" }, // Magic Tradition
            //ability: { value: "cha" }, // Key Attribute
            //autoHeightenLevel : { value : null }, // Auto Heighten Rank [null = default]
          });
          spellmaps.set(lowersc, bookid);
        }
        const bookid = spellmaps.get(lowersc);

        let itemdata = await searchPacks(RWPF1to2Actor.item_packs, ['spell'], itemname => itemname == shortname);
        if (!itemdata) {
          // Manually create a spell item
          console.debug(`Manually creating spell '${shortname}'`);
          try {
            itemdata = {
              name: spell.shortname ?? spellname,
              type: 'spell',
              img: 'systems/pf2e/icons/default-icons/spell.svg',   // make it clear that we created it manually
              system: {
                //area: null,
                description: { value: spell.description['#text'] },
                level: { value: +spell.level },
                range: { value: spell.range },
                traits: { value: [] },
                defense: {}
              },
            };
            //if (spell.type == 'Extraordinary Ability') {
            //  itemdata.system.abilityType = 'ex';
            //}
            // spell not special
            if (spell.spellschool) {
              // There might be more than one spellschool child.
              let school = (spell.spellschool instanceof Array ? spell.spellschool[0] : spell.spellschool)['#text'];
              if (spell.spelldescript) {
                itemdata.system.types = toArray(spell.spelldescript).map(el => el['#text']).join(';');
              }
              let comps = toArray(spell.spellcomp).map(el => el['#text']);
              itemdata.system.traits.value.push("concentrate");
              //if (comps.includes('Verbal')) itemdata.system.traits.value.push("audible");
              if (comps.includes('Somatic')) itemdata.system.traits.value.push("concentrate");
              if (comps.includes('Material')) itemdata.system.traits.value.push("manipulate");

              itemdata.system.time = { value: spell.casttime };
              itemdata.system.target = { value: spell.effect };
              itemdata.system.area = { value: spell.area };
              itemdata.system.duration = (spell.duration === "Concentration") ?
                { value: "sustained", sustained: true } : { value: spell.duration };

              /*if (spell.spontaneous == 'Yes')
                itemdata.system.preparation = {
                  spontaneousPrepared: true
                };*/
            }
            if (spell.save) {
              if (spell.save.startsWith("Will negates"))
                itemdata.system.defense.save = { basic: true, statistic: "will" };
              else if (spell.save.startsWith("Fortitude negates"))
                itemdata.system.defense.save = { basic: true, statistic: "fortitude" };
              else if (spell.save.startsWith("Reflex negates"))
                itemdata.system.defense.save = { basic: true, statistic: "reflex" };
            }
          } catch (e) {
            console.error(`Failed to create custom version of '${spellname}' for '${actor.name}' due to ${e}`);
            continue;
          }
        }
        itemdata.system.location = { value: bookid };
        /*
        if (memorized && memorized.has(shortname)) {
          itemdata.system.preparation = {
            maxAmount: memorized.get(shortname),
            preparedAmount: spell.castsleft || 1,
            spontaneousPrepared: false
          };
        }*/
        if (shortpos >= 0) itemdata.name = spellname;	// full name has extra details
        itemdata.slug = itemdata.name.slugify();
        //if (lowername.indexOf('at will)') >= 0) itemdata.system.atWill = true;
        const perday = lowername.match(/([\d]+)\/day/);
        if (perday) {
          let uses = +perday[1];
          // TODO - setting uses doesn't do anything
          itemdata.system.location.uses = { max: uses, value: uses };

          //itemdata.system.preparation = {
          //  preparedAmount: uses,
          //  maxAmount: uses,
          //}
        }
        //itemdata.system.learnedAt = { 'class': [  };
        actor.items.push(itemdata);
      }
      return true;
    }

    // Technically, we should process spellsmemorized to mark which spells in spellbook are prepared
    let memorized;
    for (const spell of toArray(character.spellsmemorized?.spell)) {
      const lowername = spell.name.toLowerCase();
      const shortpos = lowername.indexOf(' (');
      const shortname = (shortpos > 0) ? lowername.slice(0, shortpos) : lowername;
      let count = 1;
      if (shortpos > 0 && shortpos + 4 < lowername.length && lowername.at(shortpos + 2) == 'x') {
        let matches = lowername.slice(shortpos).match(numberpattern);
        if (matches) count = +matches[0];
      }
      // need to store the (x2) to know how many times it was memorized
      if (!memorized) memorized = new Map();
      memorized.set(shortname, count);
    }
    await addSpells(character.spellbook.spell, memorized);		// e.g. Wizard (spellsmemorized contains spells actually prepared from the spellbook)
    await addSpells(character.spellsknown.spell); 				// e.g. Bard, Summoner
    if (!character.spellbook.spell)
      await addSpells(character.spellsmemorized.spell);  			// e.g. Ranger

    // <special name="Disguise Self (humanoid form only, At will)" shortname="Disguise Self">
    // <special name="Blur (1/day)" shortname="Blur">
    // <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">
    await addSpells(character.spelllike.special, "spelllike");  // force into the book 'spelllike'

    //
    // NOTES tab
    //


    //
    // SETTINGS tab
    //


    //
    // STUFF TO BE PUT INTO THE CORRECT PLACE
    //

    // system.traits.senses { dv, ts, bs, bse, ll { enabled, multiplier { dim, bright}}, sid, tr, si, sc, custom }
    // -> system.perception.details: ""
    // -> system.perception.senses:  []  { type: "darkvision" }
    actor.system.perception.senses = [];
    if (character.senses.special) {
      function senseNumber(mysenses, sensename, sensetag) {
        if (!mysenses) return 0;
        for (const sense of mysenses) {
          if (sense.name.startsWith(sensename)) {
            let matches = sense.name.match(numberpattern);
            if (matches) {
              actor.system.perception.senses.push({ type: sensetag, range: +matches[0] })
              return;
            }
          }
        }
      }
      function sensePresent(mysenses, sensename, sensetag) {
        if (!mysenses) return false;
        for (const sense of mysenses) {
          if (sense.name.startsWith(sensename)) {
            actor.system.perception.senses.push({ type: sensetag })
            return;
          }
        }
      }

      let mysenses = toArray(character.senses.special);
      let myspellike = toArray(character.spelllike.special);
      // CONFIG.PF2E.senses
      //senseNumber(mysenses, 'Blindsight', 'blindsight');
      //senseNumber(mysenses, 'Blindsense', );
      senseNumber(mysenses, 'Darkvision', 'darkvision');
      senseNumber(mysenses, 'Tremorsense', 'tremorsense');
      sensePresent(mysenses, 'Scent', 'scent');
      sensePresent(mysenses, 'See in Darkness', 'greater-darkvision');
      sensePresent(mysenses, "Low-Light Vision", "low-light-vision");
      sensePresent(myspellike, 'See Invisibility (Constant)', 'see-invisibility');
      sensePresent(myspellike, 'True Seeing (Constant)', 'truesight');
      // echolocation, infrared-vision, lifesense, magicsense, motion-sense
      // spiritsense, thoughtsense, 
    }

    if (false) {
      function shrinktrait(string) {
        if (string === 'electricity') return 'electric';
        return string;
      }
      function trait(trait, string) {
        // try to find number at end of string:
        // RW "electricity" | PF1 "electric"
        let match = string.match(/(.*?) (\d+)/);
        if (match?.length == 3)
          trait.value.push({ amount: +match[2], operator: true, types: [shrinktrait(match[1]), ""] });
        else {
          if (Array.isArray(trait.custom))
            trait.custom.push(string);
          else {
            if (trait.custom.length > 0) trait.custom += ';';
            trait.custom += string;
          }
        }
      }

      actor.system.attributes.immunities = { value: [], custom: [] };
      actor.system.attributes.resistances = { value: [], custom: [] };
      actor.system.attributes.weaknesses = { value: [], custom: [] };

      if (character.damagereduction.special) {
        for (const item of toArray(character.damagereduction.special)) {
          trait(actor.system.attributes.resistances, item.shortname);
        }
      }
      if (character.resistances.special) {
        let cset = [];
        let spellres;
        for (const item of toArray(character.resistances.special)) {
          if (item.name.startsWith('Energy Resistance')) {
            trait(actor.system.traits.eres, item.shortname);
          } else if (item.name.startsWith('Spell Resistance')) {
            let match = item.shortname.match(numberpattern);
            if (match) spellres = match[0];  // need string version for sr.formula
          } else
            cset.push(item.shortname);
        }
        //actor.system.traits.cres = cset.join(';');
        //if (spellres) actor.system.attributes.sr = { formula: spellres, total: +spellres };
      }

      if (character.immunities.special) {
        for (const item of toArray(character.immunities.special)) {
          let name = item.shortname;
          //if (pf1.registry.damageTypes.get(name))
          //	actor.system.attributes.immunities.value.push(name);
          //else if (pf1.config.conditionTypes[name])
          //	actor.system.attributes.immunities.value.push(name);
          //else
          // actor.system.attributes.immunities.custom.push(name);
        }
      }
    }

    // LANGUAGES
    let extralang = [];
    actor.system.details.languages = { value: [] };
    for (const lang of toArray(character.languages.language)) {
      let name = lang.name.toLowerCase();
      name = REMASTERED_LANGUAGES[name] ?? name;
      if (CONFIG.PF2E.languages[name])
        actor.system.details.languages.value.push(name);
      else
        extralang.push(lang.name);
    }
    for (const lang of toArray(character.languages.special)) {
      extralang.push(lang.name);
    }
    if (extralang.length)
      actor.system.details.languages.details = extralang.join("; ");

    return actor;
  }

  //
  // Determine the ITEM type of the given node:
  // if it can't be determined only by CategoryItemTypes (at top).
  // item.type = weapon | equipment | consumable | loot | class | spell | feat | buff | attack | race | container
  //
  static async getItemType(structure, topic, initial_type) {
    for (const tag of topic.getElementsByTagName('tag_assign')) {
      const tag_id = tag.getAttribute('tag_id');
      const tag_name = structure.tags.get(tag.getAttribute('tag_id'));
      if (!tag_name) continue;

      switch (tag_name) {
        case "Weapon":
        case "Light Melee Weapons":
        case "One-Handed Melee Weapons":
        case "Two-Handed Melee Weapons":
        case "Ranged Weapons":
          return 'weapon';

        case "Rod":
        case "Spellbook":
        case "Wondrous Item":
        case "Light Armor":
        case "Medium Armor":
        case "Heavy Armor":
        case "Shield":
          return 'equipment';

        case "Potion":
        case "Scroll":
        case "Staff":
        case "Wand":
          return 'consumable';

        //case "":
        //return 'loot';
        //case "":
        //return 'class';
        //case "":
        //return 'spell';
        case "Archetype":
        case "Trait":
          return 'feat';
        //case "":
        //return 'buff';
        //case "":
        //return 'attack';
        //case "":
        //return 'race';
        //case "":
        //return 'container';
      }
    }

    // No more-specific item type detected, so use the provided default
    return initial_type;
  }

  //
  // Create the ITEM data
  //
  static async createItemData(structure, topic, itemtype, content, category) {
    // item.type = weapon | equipment | consumable | loot | class | spell | feat | buff | attack | race | container

    let item = {
      // "type" will be promoted outside of the item.system object
      description: {
        value: content,
      }
    }
    console.debug(`PF1.createItemData: '${topic.getAttribute('public_name')}'`);

    if (itemtype === 'feat') item.featType = 'feat';

    item.equipmentType = 'misc';
    item.equipmentSubtype = 'other';

    // Tag determines itemtype
    for (const tag of topic.getElementsByTagName('tag_assign')) {
      const tag_id = tag.getAttribute('tag_id');
      const tag_name = structure.tags.get(tag.getAttribute('tag_id'));
      if (!tag_name) continue;
      //console.debug(`    Checking tag '${tag_name}'`);

      switch (tag_name) {
        case 'Archetype':
          item.featType = 'classFeature';
          break;

        case 'Trait':
          item.featType = 'trait';
          break;
        // Domain tags for "Magic Item type"
        case 'Armor/Shield':
          item.equipmentType = 'armor';
          item.equipmentSubtype = 'lightArmor'; // 'mediumArmor' // 'heavyArmor'
          break;
        case 'Shield':
          item.equipmentType = 'shield';
          item.equipmentSubtype = 'lightShield'; // 'heavyShield' // 'towerShield' // 'other'
          break;
        case 'Weapon':
          item.weaponType = 'simple';		// simple|martial|exotic|misc
          item.weaponSubtype = 'light';	// light|1h|2h|ranged  (for weaponType=="misc" it is splash|other)
          break;
        case 'Wondrous Item':
          item.equipmentType = 'misc';
          item.equipmentSubtype = 'wondrous';
          break;

        case 'Construct Modification':
          break;

        case 'Potion':
          item.consumableType = 'potion';
          break;
        case 'Scroll':
          item.consumableType = 'scroll';
          break;
        case 'Staff':
          item.consumableType = 'staff';
          break;
        case 'Wand':
          item.consumableType = 'wand';
          break;


        //case 'Ring' : 
        //case 'Rod': 
        //case 'Spellbook':
        //case 'Wondrous Item':

        // Domain tags for "Magic Item Slot"
        case "Armor":
          item.slot = 'armor';
          break;
        case "Shield":
          if (item.equipmentType === 'armor') item.equipmentType = 'shield';
          item.slot = 'shield';
          break;
        case "Belt": item.slot = 'belt'; break;
        case "Body": item.slot = 'body'; break;
        case "Chest": item.slot = 'chest'; break;
        case "Eyes": item.slot = 'eyes'; break;
        case "Feet": item.slot = 'feet'; break;
        case "Hands": item.slot = 'hands'; break;
        case "Head": item.slot = 'head'; break;
        case "Neck": item.slot = 'neck'; break;
        case "None": item.slot = 'slotless'; break;
        case "Ring": item.slot = 'ring'; break;
        case "Wrist": item.slot = 'wrists'; break;
        case "Headband": item.slot = 'headband'; break;
        case "Shoulders": item.slot = 'shoulders'; break;
        // Domain tags for "Special Item Type"
        //case 'Artifact':
        //case "Cursed Item":
        //case "Magic Item":
        //	item.equipmentType = 'misc';
        //	item.equipmentSubtype = 'wondrous';
        //	break;

        // Armour Types
        case 'Light Armor': item.equipmentType = 'armor'; item.equipmentSubtype = 'lightArmor'; break;
        case 'Medium Armor': item.equipmentType = 'armor'; item.equipmentSubtype = 'mediumArmor'; break;
        case 'Heavy Armor': item.equipmentType = 'armor'; item.equipmentSubtype = 'heavyArmor'; break;
        case "Shields": item.equipmentType = 'shield'; break;

        // Weapon Types
        case "Light Melee Weapons": item.weaponSubtype = 'light'; break;
        case "One-Handed Melee Weapons": item.weaponSubtype = '1h'; break;
        case "Two-Handed Melee Weapons": item.weaponSubtype = '2h'; break;
        case "Ranged Weapons": item.weaponSubtype = 'ranged'; break;
        //case "Ranged Siege Engines":
        //case "Close Assault Siege Engines" :
        case "Simple Weapons": item.weaponType = 'simple'; break;
        case "Martial Weapons": item.weaponType = 'martial'; break;
        case "Exotic Weapons": item.weaponType = 'exotic'; break;

        default:
          break;
      }
    }

    return item;
  }
}
