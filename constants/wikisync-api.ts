/**
 * OSRS Wiki WikiSync client.
 * @see https://oldschool.runescape.wiki/w/RuneScape:WikiSync
 *
 * Requires the player to have the WikiSync RuneLite plugin enabled and to have
 * logged in at least once so data is uploaded to sync.runescape.wiki.
 */

export const WIKISYNC_BASE_URL = 'https://sync.runescape.wiki/runelite';
export const WIKISYNC_UA = 'AdventurersLog-App/1.0';

export type WikiSyncProfile = 'STANDARD' | 'DEMONIC_PACTS_LEAGUE';

export enum QuestCompletionState {
  NOT_STARTED = 0,
  IN_PROGRESS = 1,
  FINISHED = 2,
}

export type WikiSyncDiaryTier = {
  complete: boolean;
  tasks: boolean[];
};

export type WikiSyncDiaryRegion = {
  Easy?: WikiSyncDiaryTier;
  Medium?: WikiSyncDiaryTier;
  Hard?: WikiSyncDiaryTier;
  Elite?: WikiSyncDiaryTier;
};

export type WikiSyncPlayerData = {
  username: string;
  timestamp: string;
  quests: Record<string, QuestCompletionState | number>;
  achievement_diaries: Record<string, WikiSyncDiaryRegion>;
  levels: Record<string, number>;
};

export type WikiSyncFetchResult =
  | { ok: true; data: WikiSyncPlayerData }
  | { ok: false; code: 'NO_USER_DATA' | 'NOT_FOUND' | 'NETWORK' | 'UNKNOWN'; message: string };

export type WikiSyncSyncResult = {
  questsAdded: number;
  diaryTiersAdded: number;
  questTotal: number;
  diaryTierTotal: number;
};

/** WikiSync quest names that differ from Adventurer's Log quest list. */
export const WIKISYNC_QUEST_ALIASES: Record<string, string> = {
  'Fairytale I - Growing Pains': 'Fairy Tale I',
  'Fairytale II - Cure a Queen': 'Fairy Tale II',
  'Fairytale III - Battle at Orks Rift': 'Fairy Tale III',
  'Desert Treasure II - The Fallen Empire': 'Desert Treasure II',
  'Recipe for Disaster - Another Cook\'s Quest': 'Recipe for Disaster',
  'Recipe for Disaster - Culinaromancer': 'Recipe for Disaster',
  'Recipe for Disaster - Evil Dave': 'Recipe for Disaster',
  'Recipe for Disaster - King Awowogei': 'Recipe for Disaster',
  'Recipe for Disaster - Lumbridge Guide': 'Recipe for Disaster',
  'Recipe for Disaster - Mountain Dwarf': 'Recipe for Disaster',
  'Recipe for Disaster - Pirate Pete': 'Recipe for Disaster',
  'Recipe for Disaster - Sir Amik Varze': 'Recipe for Disaster',
  'Recipe for Disaster - Skrach Uglogwee': 'Recipe for Disaster',
  'Recipe for Disaster - Wartface & Bentnoze': 'Recipe for Disaster',
};

/** Maps WikiSync diary region keys to Adventurer's Log diary names. */
export const WIKISYNC_DIARY_REGION_MAP: Record<string, string> = {
  Ardougne: 'Ardougne Diary',
  Desert: 'Desert Diary',
  Falador: 'Falador Diary',
  Fremennik: 'Fremennik Diary',
  Kandarin: 'Kandarin Diary',
  Karamja: 'Karamja Diary',
  'Kourend & Kebos': 'Kourend & Kebos Diary',
  'Lumbridge & Draynor': 'Lumbridge & Draynor Diary',
  Morytania: 'Morytania Diary',
  Varrock: 'Varrock Diary',
  'Western Provinces': 'Western Provinces Diary',
  Wilderness: 'Wilderness Diary',
};

export const WIKISYNC_SETUP_STEPS = [
  'Install RuneLite and open the Plugin Hub.',
  'Search for "WikiSync", install it, and make sure it is turned on.',
  'Log in to OSRS on a standard world — your data uploads automatically.',
] as const;

export async function fetchWikiSyncProfile(
  username: string,
  profile: WikiSyncProfile = 'STANDARD',
): Promise<WikiSyncFetchResult> {
  const trimmed = username.trim();
  if (!trimmed) {
    return { ok: false, code: 'UNKNOWN', message: 'Enter a username first.' };
  }

  const url = `${WIKISYNC_BASE_URL}/player/${encodeURIComponent(trimmed)}/${profile}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': WIKISYNC_UA } });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      if (body?.code === 'NO_USER_DATA') {
        return {
          ok: false,
          code: 'NO_USER_DATA',
          message: 'No WikiSync data found for this account. Enable the WikiSync plugin in RuneLite and log in to the game first.',
        };
      }
      if (body?.error?.includes('world type')) {
        return {
          ok: false,
          code: 'UNKNOWN',
          message: 'Could not load data for this account type. Only standard accounts are supported right now.',
        };
      }
      return {
        ok: false,
        code: 'NOT_FOUND',
        message: body?.error ?? 'Could not load WikiSync data for this player.',
      };
    }

    return { ok: true, data: body as WikiSyncPlayerData };
  } catch {
    return { ok: false, code: 'NETWORK', message: 'Network error while contacting WikiSync. Check your connection and try again.' };
  }
}

function resolveQuestName(wikiQuestName: string, appQuestNames: Set<string>): string | null {
  if (appQuestNames.has(wikiQuestName)) return wikiQuestName;

  const alias = WIKISYNC_QUEST_ALIASES[wikiQuestName];
  if (alias && appQuestNames.has(alias)) return alias;

  return null;
}

export function extractCompletedQuests(
  wikiData: WikiSyncPlayerData,
  appQuestNames: string[],
): Set<string> {
  const appSet = new Set(appQuestNames);
  const completed = new Set<string>();

  for (const [wikiName, state] of Object.entries(wikiData.quests)) {
    if (wikiName === '.' || state !== QuestCompletionState.FINISHED) continue;
    const appName = resolveQuestName(wikiName, appSet);
    if (appName) completed.add(appName);
  }

  return completed;
}

export function extractCompletedDiaryTiers(
  wikiData: WikiSyncPlayerData,
): Set<string> {
  const completed = new Set<string>();
  const tiers = ['Easy', 'Medium', 'Hard', 'Elite'] as const;

  for (const [region, diaryData] of Object.entries(wikiData.achievement_diaries)) {
    const diaryName = WIKISYNC_DIARY_REGION_MAP[region];
    if (!diaryName) continue;

    for (const tier of tiers) {
      const tierData = diaryData[tier];
      if (tierData?.complete) {
        completed.add(`${diaryName}|${tier}`);
      }
    }
  }

  return completed;
}

export function mergeWikiSyncProgress(
  existingQuests: Set<string>,
  existingDiaries: Set<string>,
  wikiData: WikiSyncPlayerData,
  appQuestNames: string[],
): WikiSyncSyncResult {
  const wikiQuests = extractCompletedQuests(wikiData, appQuestNames);
  const wikiDiaries = extractCompletedDiaryTiers(wikiData);

  let questsAdded = 0;
  wikiQuests.forEach((q) => {
    if (!existingQuests.has(q)) questsAdded++;
    existingQuests.add(q);
  });

  let diaryTiersAdded = 0;
  wikiDiaries.forEach((t) => {
    if (!existingDiaries.has(t)) diaryTiersAdded++;
    existingDiaries.add(t);
  });

  return {
    questsAdded,
    diaryTiersAdded,
    questTotal: wikiQuests.size,
    diaryTierTotal: wikiDiaries.size,
  };
}

export function formatWikiSyncTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const WIKISYNC_STORAGE_KEYS = {
  characters: 'adventurers_log_characters',
  quests: 'quests_completed',
  diaries: 'achievement_diaries_completed',
  meta: 'wikisync_last_sync',
} as const;

export type WikiSyncAutoSyncResult = {
  characters: number;
  synced: number;
  failed: number;
};

/**
 * Silently sync WikiSync progress for every saved Adventurer's Log character.
 * Merges quest and diary completion into local storage.
 */
export async function autoSyncWikiSyncForSavedCharacters(
  questNames: string[],
): Promise<WikiSyncAutoSyncResult> {
  const { migrateStoredQuestCompletions, migrateQuestCompletionSet } =
    await import('./quest-migrations');
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

  await migrateStoredQuestCompletions();

  const charsRaw = await AsyncStorage.getItem(WIKISYNC_STORAGE_KEYS.characters);
  if (!charsRaw) return { characters: 0, synced: 0, failed: 0 };

  let characters: { username: string }[] = [];
  try {
    characters = JSON.parse(charsRaw);
  } catch {
    return { characters: 0, synced: 0, failed: 0 };
  }

  const usernames = [...new Set(
    characters.map((c) => c.username?.trim()).filter((u): u is string => Boolean(u)),
  )];
  if (usernames.length === 0) return { characters: 0, synced: 0, failed: 0 };

  let questSet = new Set<string>();
  const questsRaw = await AsyncStorage.getItem(WIKISYNC_STORAGE_KEYS.quests);
  if (questsRaw) {
    try {
      questSet = migrateQuestCompletionSet(JSON.parse(questsRaw) as string[]);
    } catch { /* ignore */ }
  }

  let diarySet = new Set<string>();
  const diariesRaw = await AsyncStorage.getItem(WIKISYNC_STORAGE_KEYS.diaries);
  if (diariesRaw) {
    try {
      diarySet = new Set(JSON.parse(diariesRaw) as string[]);
    } catch { /* ignore */ }
  }

  let synced = 0;
  let failed = 0;
  let latestMeta: { username: string; at: string } | null = null;

  for (const username of usernames) {
    const result = await fetchWikiSyncProfile(username);
    if (!result.ok) {
      failed++;
      continue;
    }
    mergeWikiSyncProgress(questSet, diarySet, result.data, questNames);
    synced++;
    if (!latestMeta || result.data.timestamp > latestMeta.at) {
      latestMeta = { username, at: result.data.timestamp };
    }
  }

  await AsyncStorage.setItem(WIKISYNC_STORAGE_KEYS.quests, JSON.stringify([...questSet]));
  await AsyncStorage.setItem(WIKISYNC_STORAGE_KEYS.diaries, JSON.stringify([...diarySet]));
  if (latestMeta) {
    await AsyncStorage.setItem(WIKISYNC_STORAGE_KEYS.meta, JSON.stringify(latestMeta));
  }

  return { characters: usernames.length, synced, failed };
}
