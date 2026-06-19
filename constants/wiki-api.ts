import { ItemStats, MonsterStats, SlotKey } from './equipment-slots';

const WIKI_API = 'https://oldschool.runescape.wiki/api.php';

// URL encoding helper
// React Native's fetch on iOS can double-encode percent characters, so
// avoid encodeURIComponent for wiki titles and use underscores instead. The
// OSRS Wiki treats "Bandos chestplate" and "Bandos_chestplate" as the same
// page, and underscores require no encoding at all.
function wikiTitle(name: string): string {
  return name.replace(/ /g, '_');
}

// Slot -> Wiki categories + search hints
const SLOT_CONFIG: Record<SlotKey, { categories: string[]; hint: string }> = {
  head:   { categories: ['Helmets', 'Headwear', 'Masks', 'Hats', 'Coifs'], hint: 'helm' },
  cape:   { categories: ['Capes'], hint: 'cape' },
  neck:   { categories: ['Amulets', 'Necklaces'], hint: 'amulet' },
  ammo:   { categories: ['Ammunition', 'Arrows', 'Bolts', 'Darts', 'Javelins', 'Throwing axes', 'Throwing knives', 'Chinchompas'], hint: 'bolts' },
  weapon: { categories: ['Weapons', 'Swords', 'Scimitars', 'Axes', 'Maces', 'Halberds', 'Spears', 'Bows', 'Crossbows', 'Staves', 'Wands', 'Daggers', 'Claws', 'Whips', 'Flails', 'Mauls', 'Hammers', 'Pickaxes', 'Hatchets', 'Two-handed swords', 'Longswords', 'Rapiers', 'Tridents'], hint: '' },
  body:   { categories: ['Body armour', 'Platebodies', 'Chainbodies', 'Robes'], hint: '' },
  shield: { categories: ['Shields', 'Defenders', 'Blessed coifs', 'Books'], hint: 'shield' },
  legs:   { categories: ['Leg armour', 'Platelegs', 'Plateskirts', 'Robe legs', 'Chaps'], hint: '' },
  gloves: { categories: ['Gloves', 'Gauntlets', 'Vambraces'], hint: 'gloves' },
  boots:  { categories: ['Boots'], hint: 'boots' },
  ring:   { categories: ['Rings'], hint: 'ring' },
};

// Image URL helpers

export async function fetchWikiImageUrl(title: string): Promise<string | null> {
  try {
    const detailTitle = `File:${wikiTitle(title)}_detail.png`;
    const plainTitle  = `File:${wikiTitle(title)}.png`;

    for (const fileTitle of [detailTitle, plainTitle]) {
      const url = `${WIKI_API}?action=query&titles=${fileTitle}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const res = await fetch(url);
      const data = await res.json();
      const pages = data?.query?.pages ?? {};
      const page = Object.values(pages)[0] as any;
      if (page && !page.missing) {
        const imgUrl = page?.imageinfo?.[0]?.url;
        if (imgUrl) return imgUrl;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function buildFallbackImageUrl(name: string): string {
  return `https://oldschool.runescape.wiki/images/${wikiTitle(name)}.png`;
}

// Item Detail Fetcher (Fixes "No content available")

export async function fetchItemDetails(itemName: string) {
  try {
    // action=parse resolves Scribunto/Lua templates into actual readable HTML
    const url = `${WIKI_API}?action=parse&page=${wikiTitle(itemName)}&prop=sections|text&format=json&origin=*&redirects=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) return null;

    const html = data.parse.text['*'];
    const sections = data.parse.sections;

    // Reject pages identified as Historical or Beta
    if (html.includes('Category:Historical_content') || itemName.toLowerCase().includes('(historical)')) {
      return null;
    }

    return {
      html,
      sections: sections.map((s: any) => ({
        index: s.index,
        title: s.line,
      }))
    };
  } catch {
    return null;
  }
}

//  Category check (used by item search to filter by slot)

async function itemMatchesSlot(title: string, slot: SlotKey): Promise<boolean | null> {
  try {
    const url = `${WIKI_API}?action=query&prop=categories&titles=${wikiTitle(title)}&format=json&origin=*&cllimit=50&redirects=1`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    if (!page || page.missing) return null;

    const pageCategories: string[] = (page.categories ?? []).map(
      (c: { title: string }) => c.title.replace('Category:', '')
    );

    // Guard against historical items in search results
    if (pageCategories.some(cat => cat.includes('Historical content'))) return false;

    const validCategories = SLOT_CONFIG[slot].categories;
    return validCategories.some((cat) =>
      pageCategories.some((pc) => pc.toLowerCase().includes(cat.toLowerCase()))
    );
  } catch {
    return null;
  }
}

// Item search with slot filtering

export interface WikiSearchResult {
  title: string;
  imageUrl: string;
}

export async function searchItems(query: string, slot?: SlotKey): Promise<WikiSearchResult[]> {
  try {
    let searchQuery = query;
    if (slot && SLOT_CONFIG[slot].hint && !query.toLowerCase().includes(SLOT_CONFIG[slot].hint)) {
      if (query.trim().length <= 4) {
        searchQuery = `${query} ${SLOT_CONFIG[slot].hint}`;
      }
    }

    // opensearch endpoint properly handles encoded queries — keep encodeURIComponent here
    const url = `${WIKI_API}?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=12&format=json&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const titles: string[] = data[1] ?? [];

    if (titles.length === 0) return [];

    const checked = await Promise.all(
      titles.map(async (title) => {
        const [matchResult, imageUrl] = await Promise.all([
          slot ? itemMatchesSlot(title, slot) : Promise.resolve(true),
          fetchWikiImageUrl(title),
        ]);
        return {
          title,
          imageUrl: imageUrl ?? buildFallbackImageUrl(title),
          valid: matchResult,
        };
      })
    );

    const filtered = checked.filter((r) => r.valid !== false);
    const results = filtered.length > 0 ? filtered : checked;

    return results.map(({ title, imageUrl }) => ({ title, imageUrl }));
  } catch {
    return [];
  }
}

export async function searchMonsters(query: string): Promise<WikiSearchResult[]> {
  try {
    const url = `${WIKI_API}?action=opensearch&search=${encodeURIComponent(query)}&limit=8&format=json&origin=*&namespace=0`;
    const res = await fetch(url);
    const data = await res.json();
    const titles: string[] = data[1] ?? [];
    return titles.map((title) => ({
      title,
      imageUrl: buildFallbackImageUrl(title),
    }));
  } catch {
    return [];
  }
}

// Fetch item stats from wiki

function parseInfoboxValue(wikitext: string, key: string): number {
  // 'i' flag for case-insensitive matching
  const regex = new RegExp(`\\|\\s*${key}\\s*=\\s*([+-]?\\d+)`, 'i');
  const match = wikitext.match(regex);
  return match ? parseInt(match[1]) : 0;
}

// Derive slot from wiki categories (reliable across all item versions)
// The OSRS Wiki auto-categorises every equippable item by slot via its Lua module.
// Parsing |slot= from wikitext is unreliable because of versioned infoboxes (slot1, slot2, etc.) and items where the field is missing.
function deriveSlotFromCategories(categories: string[]): string {
  const lower = categories.map(c => c.toLowerCase());
  if (lower.some(c => c.includes('head slot items')))       return 'head';
  if (lower.some(c => c.includes('cape slot items')))       return 'cape';
  if (lower.some(c => c.includes('neck slot items')))       return 'neck';
  if (lower.some(c => c.includes('ammunition slot items'))) return 'ammo';
  if (lower.some(c => c.includes('two-handed slot items'))) return '2h';
  if (lower.some(c => c.includes('weapon slot items')))     return 'weapon';
  if (lower.some(c => c.includes('body slot items')))       return 'body';
  if (lower.some(c => c.includes('shield slot items')))     return 'shield';
  if (lower.some(c => c.includes('legs slot items')))       return 'legs';
  if (lower.some(c => c.includes('hands slot items')))      return 'gloves';
  if (lower.some(c => c.includes('feet slot items')))       return 'boots';
  if (lower.some(c => c.includes('ring slot items')))       return 'ring';
  return '';
}

export async function fetchItemStats(itemName: string, slot: SlotKey): Promise<ItemStats | null> {
  try {
    // &redirects=1 follows wiki redirects (many OSRS item pages redirect to canonical names). &cllimit=50 returns all categories for slot detection.
    const [wikitextRes, imageUrl] = await Promise.all([
      fetch(`${WIKI_API}?action=query&prop=revisions|categories&rvprop=content&titles=${wikiTitle(itemName)}&format=json&origin=*&redirects=1&cllimit=50`),
      fetchWikiImageUrl(itemName),
    ]);

    const data = await wikitextRes.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    if (!page || page.missing) return null;

    const wikitext: string = page.revisions?.[0]?.['*'] ?? '';
    if (!wikitext) return null;

    // Derive slot from categories rather than parsing |slot= from wikitext
    const categories: string[] = (page.categories ?? []).map(
      (c: { title: string }) => c.title.replace('Category:', '')
    );
    const slotFromCategories = deriveSlotFromCategories(categories);

    return {
      name: itemName,
      slot: slotFromCategories,
      attackStab:     parseInfoboxValue(wikitext, 'astab'),
      attackSlash:    parseInfoboxValue(wikitext, 'aslash'),
      attackCrush:    parseInfoboxValue(wikitext, 'acrush'),
      attackMagic:    parseInfoboxValue(wikitext, 'amagic'),
      attackRanged:   parseInfoboxValue(wikitext, 'arange'),
      defenceStab:    parseInfoboxValue(wikitext, 'dstab'),
      defenceSlash:   parseInfoboxValue(wikitext, 'dslash'),
      defenceCrush:   parseInfoboxValue(wikitext, 'dcrush'),
      defenceMagic:   parseInfoboxValue(wikitext, 'dmagic'),
      defenceRanged:  parseInfoboxValue(wikitext, 'drange'),
      meleeStrength:  parseInfoboxValue(wikitext, 'str'),
      rangedStrength: parseInfoboxValue(wikitext, 'rstr'),
      magicDamage:    parseInfoboxValue(wikitext, 'mdmg'),
      prayer:         parseInfoboxValue(wikitext, 'prayer'),
      attackSpeed:    parseInfoboxValue(wikitext, 'aspeed') || 4,
      imageUrl: imageUrl ?? buildFallbackImageUrl(itemName),
    };
  } catch {
    return null;
  }
}

// Fetch monster stats

export async function fetchMonsterStats(monsterName: string): Promise<MonsterStats | null> {
  try {
    const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&titles=${wikiTitle(monsterName)}&format=json&origin=*&redirects=1`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    if (!page || page.missing) return null;

    const wikitext: string = page.revisions?.[0]?.['*'] ?? '';
    if (!wikitext) return null;

    return {
      name: monsterName,
      defenceLevel:  parseInfoboxValue(wikitext, 'def level') || parseInfoboxValue(wikitext, 'defence level') || 1,
      defenceStab:   parseInfoboxValue(wikitext, 'dstab'),
      defenceSlash:  parseInfoboxValue(wikitext, 'dslash'),
      defenceCrush:  parseInfoboxValue(wikitext, 'dcrush'),
      defenceMagic:  parseInfoboxValue(wikitext, 'dmagic'),
      defenceRanged: parseInfoboxValue(wikitext, 'drange'),
      hitpoints:     parseInfoboxValue(wikitext, 'hitpoints') || parseInfoboxValue(wikitext, 'hp') || 100,
    };
  } catch {
    return null;
  }
}

export const COMMON_MONSTERS: MonsterStats[] = [
  { name: 'Training Dummy',    defenceLevel: 1,   defenceStab: 0,   defenceSlash: 0,   defenceCrush: 0,   defenceMagic: 0,   defenceRanged: 0,   hitpoints: 100  },
  { name: 'Corporeal Beast',   defenceLevel: 310, defenceStab: 310, defenceSlash: 310, defenceCrush: 310, defenceMagic: 310, defenceRanged: 310, hitpoints: 2000 },
  { name: 'Vorkath',           defenceLevel: 214, defenceStab: 214, defenceSlash: 214, defenceCrush: 214, defenceMagic: 214, defenceRanged: 214, hitpoints: 750  },
  { name: 'Zulrah',            defenceLevel: 200, defenceStab: 0,   defenceSlash: 0,   defenceCrush: 0,   defenceMagic: 0,   defenceRanged: 0,   hitpoints: 500  },
  { name: 'General Graardor',  defenceLevel: 350, defenceStab: 350, defenceSlash: 350, defenceCrush: 350, defenceMagic: 350, defenceRanged: 350, hitpoints: 255  },
  { name: 'Commander Zilyana', defenceLevel: 370, defenceStab: 370, defenceSlash: 370, defenceCrush: 370, defenceMagic: 370, defenceRanged: 370, hitpoints: 255  },
  { name: 'K\'ril Tsutsaroth', defenceLevel: 350, defenceStab: 350, defenceSlash: 350, defenceCrush: 350, defenceMagic: 350, defenceRanged: 350, hitpoints: 255  },
  { name: 'Kree\'arra',        defenceLevel: 370, defenceStab: 370, defenceSlash: 370, defenceCrush: 370, defenceMagic: 370, defenceRanged: 370, hitpoints: 255  },
  { name: 'Cerberus',          defenceLevel: 150, defenceStab: 150, defenceSlash: 150, defenceCrush: 150, defenceMagic: 150, defenceRanged: 150, hitpoints: 600  },
  { name: 'Alchemical Hydra',  defenceLevel: 200, defenceStab: 200, defenceSlash: 200, defenceCrush: 200, defenceMagic: 200, defenceRanged: 200, hitpoints: 1100 },
  { name: 'Phantom Muspah',    defenceLevel: 200, defenceStab: 200, defenceSlash: 200, defenceCrush: 200, defenceMagic: 200, defenceRanged: 200, hitpoints: 700  },
  { name: 'Nex',               defenceLevel: 350, defenceStab: 350, defenceSlash: 350, defenceCrush: 350, defenceMagic: 350, defenceRanged: 350, hitpoints: 1200 },
  { name: 'Nightmare',         defenceLevel: 400, defenceStab: 400, defenceSlash: 400, defenceCrush: 400, defenceMagic: 400, defenceRanged: 400, hitpoints: 1000 },
];