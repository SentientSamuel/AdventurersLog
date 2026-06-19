/**
 * Per-character quest and diary completion storage.
 * Each Adventurer's Log character has its own progress — switching or syncing
 * replaces that character's data instead of merging across accounts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  extractCompletedQuests,
  extractCompletedDiaryTiers,
  type WikiSyncPlayerData,
  type WikiSyncSyncResult,
} from './wikisync-api';
import { migrateQuestCompletionSet } from './quest-migrations';

export const PROGRESS_STORAGE_KEYS = {
  activeCharacterId: 'active_character_id',
  questsByCharacter: 'quests_completed_by_character',
  diariesByCharacter: 'achievement_diaries_by_character',
  syncMetaByCharacter: 'wikisync_meta_by_character',
  migrated: 'character_progress_migrated_v1',
} as const;

/** @deprecated Global keys — migrated into per-character maps. */
const LEGACY_QUESTS_KEY = 'quests_completed';
const LEGACY_DIARIES_KEY = 'achievement_diaries_completed';
const LEGACY_SYNC_META_KEY = 'wikisync_last_sync';

export type SavedCharacterRef = { id: string; username: string };

export type CharacterSyncMeta = { username: string; at: string };

type ProgressMap = Record<string, string[]>;
type SyncMetaMap = Record<string, CharacterSyncMeta>;

async function readJsonMap<T extends Record<string, unknown>>(key: string): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

async function writeJsonMap(key: string, map: Record<string, unknown>): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(map));
}

export async function loadSavedCharacters(): Promise<SavedCharacterRef[]> {
  const raw = await AsyncStorage.getItem('adventurers_log_characters');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedCharacterRef[];
  } catch {
    return [];
  }
}

/** Resolve a stable storage key — prefer character id, fall back to username slug. */
export function resolveProgressKey(
  username: string,
  characters: SavedCharacterRef[],
): string {
  const trimmed = username.trim();
  const match = characters.find((c) => c.username === trimmed);
  return match?.id ?? `uname:${trimmed}`;
}

export async function getActiveProgressKey(): Promise<string | null> {
  return AsyncStorage.getItem(PROGRESS_STORAGE_KEYS.activeCharacterId);
}

export async function setActiveProgressKey(key: string): Promise<void> {
  await AsyncStorage.setItem(PROGRESS_STORAGE_KEYS.activeCharacterId, key);
}

export async function setActiveCharacterByUsername(username: string): Promise<string> {
  const characters = await loadSavedCharacters();
  const key = resolveProgressKey(username, characters);
  await setActiveProgressKey(key);
  return key;
}

export async function getActiveCharacterUsername(): Promise<string | null> {
  const key = await getActiveProgressKey();
  if (!key) return null;

  const characters = await loadSavedCharacters();
  const byId = characters.find((c) => c.id === key);
  if (byId) return byId.username;

  if (key.startsWith('uname:')) return key.slice('uname:'.length);
  return null;
}

export async function loadQuestCompletions(progressKey: string): Promise<Set<string>> {
  const map = await readJsonMap<ProgressMap>(PROGRESS_STORAGE_KEYS.questsByCharacter);
  const raw = map[progressKey] ?? [];
  return migrateQuestCompletionSet(raw);
}

export async function saveQuestCompletions(
  progressKey: string,
  completed: Set<string>,
): Promise<void> {
  const map = await readJsonMap<ProgressMap>(PROGRESS_STORAGE_KEYS.questsByCharacter);
  map[progressKey] = [...completed];
  await writeJsonMap(PROGRESS_STORAGE_KEYS.questsByCharacter, map);
}

export async function loadDiaryCompletions(progressKey: string): Promise<Set<string>> {
  const map = await readJsonMap<ProgressMap>(PROGRESS_STORAGE_KEYS.diariesByCharacter);
  return new Set(map[progressKey] ?? []);
}

export async function saveDiaryCompletions(
  progressKey: string,
  completed: Set<string>,
): Promise<void> {
  const map = await readJsonMap<ProgressMap>(PROGRESS_STORAGE_KEYS.diariesByCharacter);
  map[progressKey] = [...completed];
  await writeJsonMap(PROGRESS_STORAGE_KEYS.diariesByCharacter, map);
}

export async function loadSyncMeta(progressKey: string): Promise<CharacterSyncMeta | null> {
  const map = await readJsonMap<SyncMetaMap>(PROGRESS_STORAGE_KEYS.syncMetaByCharacter);
  return map[progressKey] ?? null;
}

export async function saveSyncMeta(
  progressKey: string,
  meta: CharacterSyncMeta,
): Promise<void> {
  const map = await readJsonMap<SyncMetaMap>(PROGRESS_STORAGE_KEYS.syncMetaByCharacter);
  map[progressKey] = meta;
  await writeJsonMap(PROGRESS_STORAGE_KEYS.syncMetaByCharacter, map);
}

export async function deleteCharacterProgress(progressKey: string): Promise<void> {
  const [quests, diaries, meta] = await Promise.all([
    readJsonMap<ProgressMap>(PROGRESS_STORAGE_KEYS.questsByCharacter),
    readJsonMap<ProgressMap>(PROGRESS_STORAGE_KEYS.diariesByCharacter),
    readJsonMap<SyncMetaMap>(PROGRESS_STORAGE_KEYS.syncMetaByCharacter),
  ]);

  delete quests[progressKey];
  delete diaries[progressKey];
  delete meta[progressKey];

  await Promise.all([
    writeJsonMap(PROGRESS_STORAGE_KEYS.questsByCharacter, quests),
    writeJsonMap(PROGRESS_STORAGE_KEYS.diariesByCharacter, diaries),
    writeJsonMap(PROGRESS_STORAGE_KEYS.syncMetaByCharacter, meta),
  ]);

  const activeKey = await getActiveProgressKey();
  if (activeKey === progressKey) {
    await AsyncStorage.removeItem(PROGRESS_STORAGE_KEYS.activeCharacterId);
  }
}

/**
 * Replace (not merge) quest/diary progress for one character from WikiSync data.
 */
export async function replaceProgressFromWikiSync(
  progressKey: string,
  username: string,
  wikiData: WikiSyncPlayerData,
  questNames: string[],
  syncTargets: ('quests' | 'diaries')[],
): Promise<WikiSyncSyncResult & { previousQuestCount: number; previousDiaryCount: number }> {
  const syncQuests = syncTargets.includes('quests');
  const syncDiaries = syncTargets.includes('diaries');

  const previousQuests = syncQuests ? await loadQuestCompletions(progressKey) : new Set<string>();
  const previousDiaries = syncDiaries ? await loadDiaryCompletions(progressKey) : new Set<string>();

  const wikiQuests = syncQuests
    ? extractCompletedQuests(wikiData, questNames)
    : previousQuests;
  const wikiDiaries = syncDiaries
    ? extractCompletedDiaryTiers(wikiData)
    : previousDiaries;

  if (syncQuests) {
    await saveQuestCompletions(progressKey, wikiQuests);
  }
  if (syncDiaries) {
    await saveDiaryCompletions(progressKey, wikiDiaries);
  }

  await saveSyncMeta(progressKey, { username, at: wikiData.timestamp });
  await setActiveProgressKey(progressKey);

  let questsAdded = 0;
  wikiQuests.forEach((q) => {
    if (!previousQuests.has(q)) questsAdded++;
  });

  let diaryTiersAdded = 0;
  wikiDiaries.forEach((t) => {
    if (!previousDiaries.has(t)) diaryTiersAdded++;
  });

  return {
    questsAdded,
    diaryTiersAdded,
    questTotal: wikiQuests.size,
    diaryTierTotal: wikiDiaries.size,
    previousQuestCount: previousQuests.size,
    previousDiaryCount: previousDiaries.size,
  };
}

/** One-time migration from global quest/diary keys to per-character maps. */
export async function migrateToPerCharacterProgress(): Promise<void> {
  const done = await AsyncStorage.getItem(PROGRESS_STORAGE_KEYS.migrated);
  if (done) return;

  const characters = await loadSavedCharacters();
  const [legacyQuestsRaw, legacyDiariesRaw, legacyMetaRaw, selectedUsername] = await Promise.all([
    AsyncStorage.getItem(LEGACY_QUESTS_KEY),
    AsyncStorage.getItem(LEGACY_DIARIES_KEY),
    AsyncStorage.getItem(LEGACY_SYNC_META_KEY),
    AsyncStorage.getItem('wikisync_selected_username'),
  ]);

  let targetKey: string | null = null;

  if (legacyMetaRaw) {
    try {
      const meta = JSON.parse(legacyMetaRaw) as CharacterSyncMeta;
      targetKey = characters.find((c) => c.username === meta.username)?.id ?? null;
    } catch { /* ignore */ }
  }

  if (!targetKey && selectedUsername) {
    targetKey = characters.find((c) => c.username === selectedUsername)?.id ?? null;
  }

  // Only fall back to the sole saved character when we cannot identify the source account.
  if (!targetKey && characters.length === 1) {
    targetKey = characters[0].id;
  }

  if (targetKey) {
    const questsMap = await readJsonMap<ProgressMap>(PROGRESS_STORAGE_KEYS.questsByCharacter);
    const diariesMap = await readJsonMap<ProgressMap>(PROGRESS_STORAGE_KEYS.diariesByCharacter);
    const metaMap = await readJsonMap<SyncMetaMap>(PROGRESS_STORAGE_KEYS.syncMetaByCharacter);

    if (legacyQuestsRaw && !questsMap[targetKey]) {
      try {
        questsMap[targetKey] = [...migrateQuestCompletionSet(JSON.parse(legacyQuestsRaw))];
      } catch { /* ignore */ }
    }

    if (legacyDiariesRaw && !diariesMap[targetKey]) {
      try {
        diariesMap[targetKey] = JSON.parse(legacyDiariesRaw) as string[];
      } catch { /* ignore */ }
    }

    if (legacyMetaRaw && !metaMap[targetKey]) {
      try {
        metaMap[targetKey] = JSON.parse(legacyMetaRaw) as CharacterSyncMeta;
      } catch { /* ignore */ }
    }

    await Promise.all([
      writeJsonMap(PROGRESS_STORAGE_KEYS.questsByCharacter, questsMap),
      writeJsonMap(PROGRESS_STORAGE_KEYS.diariesByCharacter, diariesMap),
      writeJsonMap(PROGRESS_STORAGE_KEYS.syncMetaByCharacter, metaMap),
      setActiveProgressKey(targetKey),
    ]);
  }

  await Promise.all([
    AsyncStorage.removeItem(LEGACY_QUESTS_KEY),
    AsyncStorage.removeItem(LEGACY_DIARIES_KEY),
    AsyncStorage.removeItem(LEGACY_SYNC_META_KEY),
    AsyncStorage.setItem(PROGRESS_STORAGE_KEYS.migrated, '1'),
  ]);
}
