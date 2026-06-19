import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUESTS_STORAGE_KEY = 'quests_completed';

/** Old display names → canonical names after quest list cleanup. */
export const QUEST_NAME_MIGRATIONS: Record<string, string> = {
  "Merlins's Crystal": "Merlin's Crystal",
  'Hand in the Sand': 'The Hand in the Sand',
  'How to Get Ahead': 'Getting Ahead',
  'The Tale of the Righteous': 'Tale of the Righteous',
  'Slug Menace': 'The Slug Menace',
  "Icthlarins' Little Helper": "Icthlarin's Little Helper",
};

/** Removed from the quest list — drop from saved completion data. */
export const REMOVED_QUEST_NAMES = new Set([
  'Welfare Queen',
  'Gunnarsgrunn',
  'The Maiden of Sugadinti',
  'Enrage of the Titans',
  'The Whispering of the Dark',
  'The World Wakes',
  'Ritual of the Mahjarrat',
]);

export function migrateQuestCompletionSet(names: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const name of names) {
    if (REMOVED_QUEST_NAMES.has(name)) continue;
    out.add(QUEST_NAME_MIGRATIONS[name] ?? name);
  }
  return out;
}

export async function migrateStoredQuestCompletions(): Promise<void> {
  const raw = await AsyncStorage.getItem(QUESTS_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as string[];
    const migrated = migrateQuestCompletionSet(parsed);
    await AsyncStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify([...migrated]));
  } catch { /* ignore corrupt storage */ }
}
