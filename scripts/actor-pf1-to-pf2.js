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
  "Weapon Proficienc",  // proficiency or proficiencies
  "Shield Proficiency",
  "Toughness",
  "Will Expertise",
  "Reflex Expertise",
  "Fortitude Expertise",
]
function ignoredFeat(featname) {
  for (const entry of FEAT_IGNORE)
    if (featname.includes(entry)) return true;
  return false;
}

function trimParen(value) {
  const shortpos = value.indexOf(' (');
  return (shortpos > 0) ? value.slice(0, shortpos) : value;
}
function trimPerDay(value) {
  return value.replace(/ \(\d+\/day\)/, "");
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
  'armor',
  'book',
  'consumable',
  'backpack',
  'equipment',
  'shield',
  'treasure',
  'weapon',
];

const LEVEL_DC = [
  14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30,  // 0-12
  31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50,  // 13-25
]
const SPELL_DC = [
  0,
  15, 18, 20, 23, 26, 28, 31, 34, 36, 39, // 1-10
]

const CASTER_CLASS = {

  // Arcane spellcaster
  arcanist: { tradition: "arcane", ability: "int", prepared: "prepared" },
  alchemist: { tradition: "arcane", ability: "int", prepared: "prepared" },
  investigator: { tradition: "arcane", ability: "int", prepared: "prepared" },
  witch: { tradition: "arcane", ability: "int", prepared: "prepared" },

  bard: { tradition: "arcane", ability: "cha", prepared: "spontaneous" },
  sorcerer: { tradition: "arcane", ability: "cha", prepared: "spontaneous" },
  summoner: { tradition: "arcane", ability: "cha", prepared: "spontaneous" },
  bloodrager: { tradition: "arcane", ability: "cha", prepared: "spontaneous" },
  skald: { tradition: "arcane", ability: "int", prepared: "spontaneous" },

  // All various sub-classes of wizard too
  wizard: { tradition: "arcane", ability: "int", prepared: "prepared" },
  abjurer: { tradition: "arcane", ability: "int", prepared: "prepared" },
  conjurer: { tradition: "arcane", ability: "int", prepared: "prepared" },
  diviner: { tradition: "arcane", ability: "int", prepared: "prepared" },
  enchanter: { tradition: "arcane", ability: "int", prepared: "prepared" },
  evoker: { tradition: "arcane", ability: "int", prepared: "prepared" },
  illusionist: { tradition: "arcane", ability: "int", prepared: "prepared" },
  necromancer: { tradition: "arcane", ability: "int", prepared: "prepared" },
  transmuter: { tradition: "arcane", ability: "int", prepared: "prepared" },
  universalist: { tradition: "arcane", ability: "int", prepared: "prepared" },

  // Divine spellcasting
  cleric: { tradition: "divine", ability: "wis", prepared: "prepared" },
  paladin: { tradition: "divine", ability: "wis", prepared: "prepared" },
  shaman: { tradition: "divine", ability: "wis", prepared: "prepared" },
  inquisitor: { tradition: "divine", ability: "wis", prepared: "prepared" },
  warpriest: { tradition: "divine", ability: "wis", prepared: "prepared" },

  hunter: { tradition: "divine", ability: "wis", prepared: "spontaneous" },
  oracle: { tradition: "divine", ability: "wis", prepared: "spontaneous" },

  // Primal spellcasting
  druid: { tradition: "primal", ability: "wis", prepared: "prepared" },
  ranger: { tradition: "primal", ability: "wis", prepared: "prepared" },

  // kineticist, medium, mesmerist, occultist, psychic, spiritualist

  // Innate spells
  innate: { tradition: "arcane", ability: "cha", prepared: "innate" },
  spelllike: { tradition: "arcane", ability: "cha", prepared: "innate" },
}
function classTradition(cls) {
  const data = CASTER_CLASS[cls];
  if (data) return data.tradition;
  console.info(`No known spellcasting tradition for '${cls}'`)
  return "arcane";
}
function spellAbility(cls) {
  const data = CASTER_CLASS[cls];
  if (data) return data.ability;
  console.info(`No known spellcasting ability for '${cls}'`)
  return "cha";
}
function spellPrepared(cls) {
  const data = CASTER_CLASS[cls];
  if (data) return data.prepared;
  console.info(`No known spellcasting prepared for '${cls}'`)
  return "innate";
}

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
  ["abundant step"]: "shrink the span",
  ["abyssal wrath"]: "chthonian wrath",
  ["animate dead"]: "summon undead",
  ["augment summoning"]: "fortify summoning",
  ["baleful polymorph"]: "cursed metamorphosis",
  ["barkskin"]: "oaken resilience",
  ["bind soul"]: "seize soul",
  ["blind ambition"]: "ignite ambition",
  ["blink"]: "flicker",
  ["burning hands"]: "breathe fire",
  ["calm emotions"]: "calm",
  ["charming words"]: "charming push",
  ["chill touch"]: "void warp",
  ["cloudkill"]: "toxic cloud",
  ["color spray"]: "dizzying colors",
  ["commune with nature"]: "commune",
  ["comprehend language"]: "translate",
  ["continual flame"]: "everlight",
  ["crushing despair"]: "wave of despair",
  ["heal"]: "heal|6",                  // PF1 remap (poor choice)
  ["cure light wounds"]: "heal|1",     // PF1 remap
  ["cure moderate wounds"]: "heal|2",  // PF1 remap
  ["cure serious wounds"]: "heal|3",   // PF1 remap
  ["cure critical wounds"]: "heal|4",   // PF1 remap
  ["dancing lights"]: "light",
  ["daze monster"]: "daze",         // PF1 remap
  //["deep slumber"]: "sleep|4",   // PF1 remap (not exactly the same result)
  ["dimension door"]: "translocate",
  ["dimensional anchor"]: "planar tether",
  ["dimensional lock"]: "planar seal",
  ["discern location"]: "pinpoint",
  ["disrupt undead"]: "vitality lash",
  ["disrupting weapon"]: "infuse vitality",
  ["dragon claws"]: "flurry of claws",
  ["efficient apport"]: "reclined apport",
  ["empty body"]: "embrace nothingness",
  ["endure elements"]: "environmental endurance",
  ["entangle"]: "entangling flora",
  ["faerie fire"]: "revealing light",
  ["false life"]: "false vitality",
  ["feather fall"]: "gentle landing",
  ["feeblemind"]: "never mind",
  ["finger of death"]: "execute",
  ["flaming sphere"]: "floating flame",
  ["flesh to stone"]: "petrify",
  ["floating disk"]: "carryall",
  ["force cage"]: "lifewood cage",
  ["freedom of movement"]: "unfettered movement",
  ["gaseous form"]: "vapor form",
  ["gentle repose"]: "peaceful rest",
  ["glibness"]: "honeyed words",
  ["glitterdust"]: "revealing light",
  ["globe of invulnerability"]: "dispelling globe",
  ["glutton's jaw"]: "glutton's jaws",
  ["glyph of warding"]: "rune trap",
  ["goodberry"]: "cornucopia",
  ["hallucinatory terrain"]: "mirage",
  ["heroes' feast"]: "fortifying brew",
  ["hideous laughter"]: "laughing fit",
  ["horrid wilting"]: "desiccate",
  ["hyperfocus"]: "clouded focus",
  ["hypnotic pattern"]: "hypnotize",
  ["inflict light wounds"]: "harm|1",      // PF1 remap
  ["inflict moderate wounds"]: "harm|2",   // PF1 remap
  ["inflict critical wounds"]: "harm|4",   // PF1 remap
  ["inspire competence"]: "uplifting overture",
  ["inspire courage"]: "courageous anthem",
  ["inspire defense"]: "rallying anthem",
  ["inspire heroics"]: "fortissimo composition",
  ["invisibility sphere"]: "shared invisibility",
  ["ki strike"]: "inner upheaval",
  ["ki blast"]: "qi blast",
  ["ki form"]: "qi form",
  ["ki rush"]: "qi rush",
  ["know direction"]: "know the way",
  ["legend lore"]: "collective memories",
  ["longstrider"]: "tailwind",
  ["mage armor"]: "mystic armor",
  ["mage hand"]: "telekinetic hand",
  ["magic aura"]: "disguise magic",
  ["magic fang"]: "runic body",
  ["magic missile"]: "force barrage",
  ["magic mouth"]: "embed message",
  ["magic weapon"]: "runic weapon",
  ["magnificent mansion"]: "planar palace",
  ["maze"]: "quandary",
  ["meld into stone"]: "one with stone",
  ["meteor swarm"]: "falling stars",
  ["mind blank"]: "hidden mind",
  ["misdirection"]: "disguise magic",
  ["modify memory"]: "rewrite memory",
  ["neutralize poison"]: "cleanse affliction",
  ["nondetection"]: "veil of privacy",
  ["obscuring mist"]: "mist",
  ["pass without trace"]: "vanishing tracks",
  ["passwall"]: "magic passage",
  ["phantom mount"]: "marvelous mount",
  ["planar binding"]: "planar servitor",
  ["plane shift"]: "interplanar teleport",
  ["positive luminance"]: "vital luminance",
  ["private sanctum"]: "peaceful bubble",
  ["prying eye"]: "scouting eye",
  ["pulse of the city"]: "pulse of civilization",
  ["purify food and drink"]: "cleanse cuisine",
  ["quivering palm"]: "touch of death",
  ["ray of enfeeblement"]: "enfeeble",
  ["remove curse"]: "cleanse affliction",
  ["remove diease"]: "cleanse affliction",
  ["remove fear"]: "clear mind",
  ["remove paralysis"]: "sure footing",
  ["resilient sphere"]: "containment",
  ["restore senses"]: "sound body",
  ["righteous might"]: "sacred form",
  ["roar of the wyrm"]: "roar of the dragon",
  ["scorching ray"]: "blazing bolt",
  ["searing light"]: "holy light",
  ["scintillating pattern"]: "confusing colors",
  ["see invisibility"]: "see the unseen",
  ["shadow walk"]: "umbral journey",
  ["shapechange"]: "metamorphosis",
  ["shield other"]: "share life",
  ["simulacrum"]: "shadow double",
  ["sound burst"]: "noise blast",
  ["spectral hand"]: "ghostly carrier",
  ["spider climb"]: "gecko grip",
  ["splash of art"]: "creative splash",
  ["stone tell"]: "speak with stones",
  ["stoneskin"]: "mountain resilience",
  ["tanglefoot"]: "tangle vine",
  ["time stop"]: "freeze time",
  ["tongues"]: "truespeech",
  ["touch of corruption"]: "touch of the void",
  ["touch of idiocy"]: "stupefy",
  ["tree shape"]: "one with plants",
  ["tree stride"]: "nature's pathway",
  ["trueseeing"]: "truesight",
  ["true strike"]: "sure strike",
  ["unseen custodians"]: "phantasmal custodians",
  ["unseen servant"]: "phantasmal minion",
  ["vampiric touch"]: "vampiric feast",
  ["veil"]: "illusory disguise",
  ["vigilant eye"]: "rune of observation",
  ["wail of the banshee"]: "wails of the damned",
  ["wind walk"]: "migration",
  ["wholeness of body"]: "harmonize self",
  ["word of recall"]: "gathering call",
  ["zone of truth"]: "ring of truth",
};

const wizard_subclasses = ['Abjurer', 'Conjurer', 'Diviner', 'Enchanter', 'Evoker', 'Illusionist', 'Necromancer', 'Transmuter', 'Universalist'];

//import { createConsumableFromSpell } from "../../../systems/pf2e/pf2e.mjs";

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
  // Mithral => Dawnsilver
  static item_name_mapping = new Map([
    ["thieves' tools", "thieves' toolkit"],
    ["thieves' tools, masterwork", "thieves' toolkit (infiltrator)"],
    ["thieves' tools, concealable", "thieves' tools (concealable)"],
    ["pot", "pot, cooking (iron)"],
    ["feed", "feed, animal"],
    ["riding saddle", "saddle (riding)"],
    ["military saddle", "saddle (military)"],
    ["exotic saddle", "saddle (exotic)"],
    ["potion of cure light wounds", "healing potion (minor)"],
    ["potion of cure moderate wounds", "healing potion (lesser)"],
    ["potion of cure serious wounds", "healing potion (moderate)"],
    ["potion of cure critical wounds", "healing potion (greater)"],   // one dice difference!
    ["chainmail", "chain mail"],
    ["studded leather", "studded leather armor"],
    ["short sword", "shortsword"],
    ["battleaxe", "battle axe"],
    ["half-plate", "half plate"],
    ["alchemist's fire", "alchemist's fire (lesser)"],
    ["crossbow bolts", "bolts"],
    ["quarterstaff", "staff"],
    ["light crossbow", "crossbow"],
    ["light steel shield", "steel shield"],
    ["heavy steel shield", "steel shield"],
    ["light wooden shield", "wooden shield"],
    ["heavy wooden shield", "wooden shield"],
    ["pistol", "flintlock pistol"],
    ["musket", "flintlock musket"],
    ["hand axe", "hatchet"],
    ["throwing axe", "hatchet"],
    ["tanglefoot bag", "glue bomb"],
    ["bag of holding", "spacious pouch"],
    ["bracers of armor", "bands of force"],
    ["broom of flying", "flying broomstick"],
    ["goggles of night", "obsidian goggles"],
    ["hat of disguise", "masquerade scarf"],
    ["holy avenger", "chalice of justice"],
    ["potion of expeditious retreat", "potion of emergency escape"],
    ["purple worm venom", "cave worm venom"],
    ["smokestick", "smoke ball (lesser)"],
    ["staff of abjuration", "staff of protection"],
    ["staff of conjuration", "staff of summoning"],
    ["staff of divination", "staff od the unblinking eye"],
    ["staff of enchantment", "staff of control"],
    ["staff of evocation", "staff of elemental power"],
    ["staff of illusion", "staff of phantasms"],
    ["staff of necromancy", "staff of the dead"],
    ["staff of transmutation", "fluid form staff"],
    ["sunrod", "glow rod"],
    ["thunderstone", "blasting stone"],
    ["tindertwig", "matchstick"],
    ["universal solvent", "absolute solvent"],
    ["winged boots", "winged sandals"],
    ["feather token (chest)", "marvelous miniature (chest)"],
    ["feather token (ladder)", "marvelous miniature (ladder)"],
    ["feather token (swan boat)", "marvelous miniature (boat)"],
    ["potion of barkskin", "oak potion"],
    ["elixir of swimming", "potion of swimming (greater)"],
    ["cutlass", "scimitar"],    // since Cutlass doesn't exist in PF2, and PF1 says cutlass==scimitar
    ["mithral shirt", "duskwood chain shirt"],
    ["dwarven plate", "adamantine full plate"],
    ["holy symbol, silver", "religious symbol (silver)"],
    ["ioun stone", "aeon stone"],
    ["climber's kit", "climbing kit"],
    ["manacles", "manacles (simple)"],
    
  ]);

  static once;
  static skill_mapping = {};
  static ability_names = {}

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
    if (character.settings.summary) actor.system.details.publication = { title: character.settings.summary };

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

    // gender race subrace class level
    let blurb = [];
    if (character.gender) blurb.push(character.gender);
    if (character.race.name) blurb.push(character.race.name);
    if (character.race.ethnicity) blurb.push(character.race.ethnicity);
    for (const cls of toArray(character.classes)) blurb.push(cls.summary);
    actor.system.details.blurb = blurb.join(" ");

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

    for (const attack of toArray(character.melee?.weapon).concat(toArray(character.ranged?.weapon))) {
      console.debug(`ATTACK: ${character.name} - ${attack.name} - ${attack.typetext}`)

      let damageType = "bludgeoning"; // convert 'B/P/S' to array of damage types
      for (const part of attack.typetext.split('/')) {
        switch (part) {
          case 'B': damageType = 'bludgeoning'; break;
          case 'P': damageType = 'piercing'; break;
          case 'S': damageType = 'slashing'; break;
        }
      }

      let dmgtraits = [];
      let damageRolls = {};
      if (attack.damage) {
        // possible: 1d6+2 plus 1d6 fire and grab
        let dmgparts = attack.damage.split(" plus ").map(p => p.split(" and ")).flat();
        for (const ipart of dmgparts) {
          const part = ipart.trim().replaceAll(/  +/g, " ").toLowerCase();  // remove multiple spaces
          if (CONFIG.PF2E.attackEffects[part]) {
            dmgtraits.push(part);
          } else {
            let words = part.split(' ');
            if (words.length > 1) {
              let tag = words[1];
              if (CONFIG.PF2E.damageTypes[tag])
                damageType = tag;
              else
                console.warn(`${character.name}: Unknown damage modifier "${tag}" in "${attack.damage}"`)
            }
            // Convert 1d3 to 1d4 (since 1d3 isn't a valid dice type for PF2e)
            let damage = words[0].replace("1d3", "1d4");
            damageRolls[foundry.utils.randomID()] = {
              category: null,
              damage,
              damageType
            }
          }
        }
      }

      let itemdata = {
        // item
        name: attack.name,
        type: "melee",
        img: 'systems/pf2e/icons/default-icons/melee.svg',
        system: {  // MeleeSystemData
          attackEffects: { value: dmgtraits },
          bonus: { value: parseInt(attack.attack) },
          damageRolls,
          description: { value: attack.description["#text"] },
          //material: {},
          //publication: {},
          //rules: [],
          //runes: [],
          //slug: [],
          traits: { value: [] },
        }
      }

      if (attack.rangedattack && !Number.isNaN()) {
        let range = parseInt(attack.rangedattack.rangeinctext);
        if (Number.isInteger(range))
          itemdata.system.traits.value.push(`range-increment-${parseInt(attack.rangedattack.rangeinctext)}`);
      }

      actor.items.push(itemdata);
    }

    // character.attack.special are more feat entries, not actual attacks
    for (const attack of toArray(character.attack.special)) {
      let itemdata = {
        name: REMASTERED_FEATURES[attack.name] || attack.name,
        type: 'action',
        img: 'systems/pf2e/icons/default-icons/action.svg',   // make it clear that we created it manually
        system: {
          //featType: (attack.categorytext == 'Racial') ? 'racial' : 'trait',	// attack, classFeat, trait, racial, misc, template
          actionType: { value: "passive" },
          // actions:
          category: "interaction",
          // deathNote: false
          description: {
            // addenda: [],
            // gm: [],
            value: addParas(attack.description['#text'])
          }
          // publication:
          // selfEffect: null
          // slug: null
          // traits:
        }
      }
      actor.items.push(itemdata);
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


    // Item:Gear
    //  type: "equipment"    // Object.keys(CONFIG.PF2E.Item.documentClasses)
    //  system:
    //    bulk: { heldOrStowed: 0.1, value: 0.1, per: 1} 
    //    containerId: null
    //    description: { value : }
    //    equipped: { carryType: "worn", invested:null, handsHeld: 0}
    //    hardness: 0
    //    hp: { value: 0, max: 0, brokenThreshold: 0 }
    //    identification: { status: "identified" }
    //    level: { value : 0 }
    //    material: { type: null|"dawnsilver"|CONFIG.PF2E.preciousMetals, grade: null|"low"|"standard"|"high", effects: [] }
    //    price: { value: { cp: 0, gp: 0, pp: 0, sp: 0 }, per: 1, sizeSensitive: true }
    //    publication: { title: "" }
    //    quantity: 1
    //    size: "med"
    //    slug: null
    //    traits: { value: [], rarity: "common" }  // CONFIG.PF2E.equipmentTraits
    //    usage: { value: "held-in-one-hand"|CONFIG.PF2E.usages, type: "held", hands: 1 }

    // gear.[item.name/quantity/weight/cost/description
    for (const item of toArray(character.gear?.item).concat(toArray(character.magicitems?.item))) {
      // Get all forms of item's name once, since we search each pack.
      let lower = noType(item.name).toLowerCase().replace("mithral", "dawnsilver").replace("cold iron", "cold-iron");
      let singular, reversed, pack, entry, noparen;
      // Firstly deal with masterwork and enhancement bonuses on weapons.
      let words = lower.replaceAll(/  +/g, " ").split(" ");
      let masterwork, enhance, material;
      if (words[0] === "masterwork") {
        masterwork = true;
        words.shift();
      }
      // Maybe an enhancement bonus
      if (words[0].startsWith("+")) {
        enhance = parseInt(words[0]);
        if (enhance === 5) enhance = 4;
        words.shift();
      }
      // Maybe a material next
      if (Object.keys(CONFIG.PF2E.preciousMaterials).includes(words[0])) {
        material = words[0];
        words.shift();
      }
      lower = words.join(" ");

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
      const rwords = lower.split(' ');
      if (rwords.length == 2) reversed = rwords[1] + ', ' + rwords[0];

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
        if (lower.startsWith('potion of '))   // No Potions of spells in PF2E
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
            const remastered = REMASTERED_SPELLS[spellname];
            const checkname = remastered ? remastered.split("|")[0] : spellname;
            if (remastered) lower = lower.replace(spellname, checkname);
            let spelldata = await searchPacks(RWPF1to2Actor.item_packs, ['spell'], itemname => itemname == checkname);
            if (!spelldata) {
              console.warn(`Failed to find spell '${spellname}' [${checkname}] for item '${item.name}'`)
              continue;
            }
            let itemdata /*= await createConsumableFromSpell (spelldata, { // from PF2E game system
              type: lower.startsWith(scroll) ? "scroll" : lower.startWith("wand") ? "wand" : "potion",  // "scroll" | "wand"
              //heightenedLevel: currentSource.system.spell.system.location.heightenedLevel,
            });*/
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

      if (!itemdata) {
        let slot = item.itemslot?.['#text'];
        itemdata = {
          name: item.name,
          type: item.name.includes(' lbs)') ? 'backpack' : (slot === 'Armor') ? 'armor' : 'equipment',   // type: "backpack" ==> Container
          img: 'systems/pf2e/icons/default-icons/equipment.svg',   // make it clear that we created it manually
          system: {
            //weight: { value: +item.weight.value },
            price: {
              value: {
                gp: +item.cost.value,
              }
            },
            description: {
              value: addParas(item.description['#text'])
            },
            //identification: { status: "identified" },
            //carried: true,
          },
        };
      }

      // Common stuff about the item
      itemdata.system.quantity = +item.quantity;
      // if (masterwork) itemdata.system.masterwork = true;
      if (enhance) itemdata.system.runes = { potency: enhance };
      if (material) itemdata.system.material = { type: material, grade: "standard" }

      if (enhance || material) {
        console.info(`${character.name} has a ${item.name}`);
        //itemdata.name = item.name;
      }
      actor.items.push(itemdata);
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
        base: Number(skill.value),
        // breakdown:
        // dc:
        // itemId:
        // label: "Deception"
        // lore: false
        mod: Number(skill.value),
        // modifiers: []
        // slug: "deception"
        // special: []
        // totalModifier: number
        value: Number(skill.value),
        // visible: true
      };
    }


    //
    // FEATURES tab
    //

    // system.items (includes feats) - must be done AFTER skills

    for (const feat of toArray(character.feats?.feat)) {
      if (ignoredFeat(feat.name)) continue;
      let itemdata = await searchPacks(RWPF1to2Actor.item_packs, ['feat'], itemname => itemname == feat.name);

      if (!itemdata) {
        itemdata = {
          name: REMASTERED_FEATURES[feat.name] || feat.name,
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
      }
      // maybe handle itemdata.system.uses?.max
      actor.items.push(itemdata);
    }

    // Traits (on FEATURES tab)
    // <trait name="Dangerously Curious" categorytext="Magic">
    for (const trait of toArray(character.traits?.trait)) {
      if (ignoredFeat(trait.name)) continue;

      let itemdata = await searchPacks(RWPF1to2Actor.item_packs, ['feat'], itemname => itemname == trait.name);
      if (!itemdata) {
        itemdata = {
          name: trait.name,
          type: 'action',
          img: 'systems/pf2e/icons/default-icons/action.svg',   // make it clear that we created it manually
          system: {
            //featType: (trait.categorytext == 'Racial') ? 'racial' : 'trait',	// feat, classFeat, trait, racial, misc, template
            actionType: { value: "passive" },
            // actions:
            category: "offensive",
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

      let itemdata = await searchPacks(RWPF1to2Actor.item_packs, ['feat'], itemname => itemname == special.name);
      if (!itemdata) {
        itemdata = {
          name: special.name,
          type: 'action',
          img: 'systems/pf2e/icons/default-icons/action.svg',   // make it clear that we created it manually
          system: {
            //featType: (special.categorytext == 'Racial') ? 'racial' : 'trait',	// feat, classFeat, trait, racial, misc, template
            actionType: { value: "passive" },
            // actions:
            category: "defensive",
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
    let spells = [];
    let spellcasting = new Map();

    function addSpellcasting(spellclass, slots = {}, memorized = undefined) {
      const lowersc = spellclass.toLowerCase();

      spellcasting.set(lowersc, {
        _id: foundry.utils.randomID(),
        type: "spellcastingEntry",
        name: spellclass,
        img: "systems/pf2e/icons/default-icons/spellcastingEntry.svg",
        system: {
          prepared: {   // Spellcasting Type
            value: memorized ?? spellPrepared(lowersc),
            flexible: false,
          },
          slots: slots,
          showSlotlessLevels: { value: false },
          tradition: { value: classTradition(lowersc) }, // Magic Tradition
          ability: { value: spellAbility(lowersc) }, // Key Attribute
          //autoHeightenLevel : { value : null }, // Auto Heighten Rank [null = default]
        }
      });
    }

    async function addSpells(nodes, memorized = undefined, spellbook = undefined) {
      if (!nodes) return false; // TODO

      // <spell name="Eagle's Splendor" level="2" class="Sorcerer" casttime="1 action" range="touch" target="creature touched" area="" effect="" duration="1 min./level" 
      //		save="Will negates (harmless)" resist="yes" dc="18" casterlevel="7" componenttext="Verbal, Somatic, Material or Divine Focus"
      //		schooltext="Transmutation" subschooltext="" descriptortext="" savetext="Harmless, Will negates" resisttext="Yes" spontaneous="yes">
      // <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">
      for (const spell of toArray(nodes)) {
        // Retain any parentheses in spell name (but strip a "/day" usage information)
        let spellname = trimPerDay(spell.name);
        let remastered = REMASTERED_SPELLS[trimParen(spellname).toLowerCase()];
        let remlevel;
        if (remastered) {
          const part = remastered.split("|");
          spellname = part[0];
          if (part.length > 1) remlevel = +part[1];
        }
        const shortname = trimParen(spellname.toLowerCase());

        // SPELLCASTING ENTRY
        let spellclass = spell['class'] || spellbook || "Innate";   // class is a JS reserved word
        let lowersc = spellclass.toLowerCase();
        // Handle the wizard spellbooks sometimes being named by the subtype of wizard
        let book = spellcasting.get(lowersc);
        if (!book && lowersc === "wizard") {
          for (const subwiz of wizard_subclasses) {
            book = spellcasting.get(subwiz.toLowerCase());
            if (book) break;
          }
        }
        if (!book) {
          //console.info(`${character.name}: Creating spellbook "${spellclass}" for "${spell.name}"`)
          addSpellcasting(spellclass)
          book = spellcasting.get(lowersc);
        }

        let itemdata = await searchPacks(RWPF1to2Actor.item_packs, ['spell'], itemname => itemname == shortname);
        if (!itemdata) {
          // Manually create a spell item
          console.debug(`Manually creating spell '${shortname}'`);
          try {
            itemdata = {
              name: spellname,
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
              if (comps.includes('Material') || comps.includes("Divine Focus")) itemdata.system.traits.value.push("manipulate");

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
        } else {
          // Maybe Remaster conversion has a specific level for the spell
          if (remlevel) itemdata.system.level.value = remlevel;
        }

        itemdata.name = spellname;  // Retain any parentheses on remastered/found spells
        itemdata.system.location = { value: book._id };

        if (memorized && book.system.prepared.value === "prepared") {
          // memorized map contains original spell name, not remapped
          const origshortname = trimParen(spell.name.toLowerCase());
          if (memorized.has(origshortname)) {
            //console.info(`${character.name} has PREPARED spell: level ${itemdata.system.level.value}, "${itemdata.name}"`);
            // We need an ID for the spell NOW
            if (!itemdata._id) itemdata._id = foundry.utils.randomID();
            if (!book.system.slots) book.system.slots = {};
            const slotname = `slot${itemdata.system.level.value}`;
            if (!book.system.slots[slotname]) book.system.slots[slotname] = { prepared: [] };
            // Maybe memorized more than once
            let count = memorized.get(origshortname);
            while (count-- > 0) {
              book.system.slots[slotname].prepared.push({
                id: itemdata._id,
                expended: false
              })
            }
          }
        }

        itemdata.slug = itemdata.name.slugify();
        //if (spell.name.indexOf('at will)') >= 0) itemdata.system.atWill = true;
        const perday = spell.name.match(/([\d]+)\/day/);
        if (perday) {
          let uses = +perday[1];
          itemdata.system.location.uses = { max: uses, value: uses };
        }
        //itemdata.system.learnedAt = { 'class': [  };
        spells.push(itemdata);
      }
      return true;
    }

    // One spellbook available with known slots per level
    const caster = character.spellclasses.spellclass;
    if (caster?.spelllevel) {
      // Collect slot information
      //  slots: { slot0: { prepared: array (spells), value: 0, max: 5 } }
      let slots = {};
      for (const level of caster.spelllevel) {
        slots[`slot${level.level}`] = { value: Number(level.maxcasts), max: Number(level.maxcasts), prepared: [] }
      }
      // Remove any trailing subtype from the spellcasting name
      // caster.spells = Spontaneous | Memorized | Spellbook
      addSpellcasting(trimParen(caster.name), slots, (["Memorized", "Spellbook"].includes(caster.spells)) ? "prepared" : "spontaneous");
    }

    // Collect any possible list of spells which have been memorized from the spellbook
    let memorized;
    for (const spell of toArray(character.spellsmemorized?.spell)) {
      const lowername = spell.name.toLowerCase();
      const shortpos = lowername.indexOf(' (');
      let count = 1;
      if (shortpos > 0 && shortpos + 4 < lowername.length && lowername.at(shortpos + 2) == 'x') {
        // need to store the (x2) to know how many times it was memorized
        let matches = lowername.slice(shortpos).match(numberpattern);
        if (matches) count = +matches[0] - 1;
      }
      // Maybe a count already exists in the memorized map for this spell
      const key = trimParen(lowername);
      if (!memorized) memorized = new Map();
      if (memorized.has(key)) count += memorized.get(key);
      memorized.set(key, count);
    }

    if (character.spellbook.spell) {
      await addSpells(character.spellbook.spell, memorized);		// e.g. Wizard (spellsmemorized contains spells actually prepared from the spellbook)

    } else if (character.spellsmemorized.spell)
      await addSpells(character.spellsmemorized.spell, memorized);  			// e.g. Cleric, Ranger

    if (character.spellsknown.spell)
      await addSpells(character.spellsknown.spell); 				// e.g. Bard, Summoner

    // <special name="Disguise Self (humanoid form only, At will)" shortname="Disguise Self">
    // <special name="Blur (1/day)" shortname="Blur">
    // <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">
    if (character.spelllike.special)
      await addSpells(character.spelllike.special, undefined, "spelllike");  // force into the book 'spelllike'

    if (spellcasting.size) actor.items.push(...spellcasting.values());
    if (spells.length) actor.items.push(...spells);

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
