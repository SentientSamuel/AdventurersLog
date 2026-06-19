import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import {
  fetchWikiSyncProfile,
  mergeWikiSyncProgress,
  formatWikiSyncTimestamp,
  WIKISYNC_SETUP_STEPS,
  WIKISYNC_STORAGE_KEYS,
  type WikiSyncSyncResult,
} from '../constants/wikisync-api';
import { migrateQuestCompletionSet, migrateStoredQuestCompletions } from '../constants/quest-migrations';

const CHARACTERS_KEY = WIKISYNC_STORAGE_KEYS.characters;
const QUESTS_KEY = WIKISYNC_STORAGE_KEYS.quests;
const DIARIES_KEY = WIKISYNC_STORAGE_KEYS.diaries;
const WIKISYNC_META_KEY = WIKISYNC_STORAGE_KEYS.meta;

type SavedCharacter = { id: string; username: string };

export type WikiSyncPanelProps = {
  /** Quest names from the local quest list — used to map WikiSync names. */
  questNames: string[];
  /** Which progress to apply after a successful sync. */
  syncTargets: ('quests' | 'diaries')[];
  /** Optional fixed username (e.g. active Adventurer's Log character). */
  fixedUsername?: string;
  /** Hide username picker when fixedUsername is set. */
  hideUsernameInput?: boolean;
  compact?: boolean;
  onSynced?: (result: WikiSyncSyncResult & { username: string }) => void;
};

export function WikiSyncPanel({
  questNames,
  syncTargets,
  fixedUsername,
  hideUsernameInput = false,
  compact = false,
  onSynced,
}: WikiSyncPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [showSetup, setShowSetup] = useState(false);
  const [username, setUsername] = useState(fixedUsername ?? '');
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ username: string; at: string } | null>(null);

  useEffect(() => {
    if (fixedUsername) setUsername(fixedUsername);
  }, [fixedUsername]);

  useEffect(() => {
    AsyncStorage.getItem(CHARACTERS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as SavedCharacter[];
        setCharacters(parsed);
        if (!fixedUsername && !username && parsed.length === 1) {
          setUsername(parsed[0].username);
        }
      } catch { /* ignore */ }
    });
    AsyncStorage.getItem(WIKISYNC_META_KEY).then((raw) => {
      if (!raw) return;
      try { setLastSync(JSON.parse(raw)); } catch { /* ignore */ }
    });
  }, [fixedUsername, username]);

  const handleSync = useCallback(async () => {
    const targetUser = (fixedUsername ?? username).trim();
    if (!targetUser) {
      Alert.alert('Username required', 'Enter your OSRS username or add a character in Adventurer\'s Log.');
      return;
    }

    setSyncing(true);
    await migrateStoredQuestCompletions();

    const result = await fetchWikiSyncProfile(targetUser);
    setSyncing(false);

    if (!result.ok) {
      Alert.alert('WikiSync unavailable', result.message);
      return;
    }

    const syncQuests = syncTargets.includes('quests');
    const syncDiaries = syncTargets.includes('diaries');

    let questSet = new Set<string>();
    let diarySet = new Set<string>();

    if (syncQuests) {
      const raw = await AsyncStorage.getItem(QUESTS_KEY);
      if (raw) {
        try { questSet = migrateQuestCompletionSet(JSON.parse(raw)); } catch { /* ignore */ }
      }
    }

    if (syncDiaries) {
      const raw = await AsyncStorage.getItem(DIARIES_KEY);
      if (raw) {
        try { diarySet = new Set(JSON.parse(raw)); } catch { /* ignore */ }
      }
    }

    const mergeResult = mergeWikiSyncProgress(
      questSet,
      diarySet,
      result.data,
      questNames,
    );

    if (syncQuests) {
      await AsyncStorage.setItem(QUESTS_KEY, JSON.stringify([...questSet]));
    }
    if (syncDiaries) {
      await AsyncStorage.setItem(DIARIES_KEY, JSON.stringify([...diarySet]));
    }

    const meta = { username: targetUser, at: result.data.timestamp };
    await AsyncStorage.setItem(WIKISYNC_META_KEY, JSON.stringify(meta));
    setLastSync(meta);

    const parts: string[] = [];
    if (syncQuests) {
      parts.push(`${mergeResult.questTotal} quests (${mergeResult.questsAdded} newly marked)`);
    }
    if (syncDiaries) {
      parts.push(`${mergeResult.diaryTierTotal} diary tiers (${mergeResult.diaryTiersAdded} newly marked)`);
    }

    Alert.alert(
      'WikiSync complete',
      `Synced ${targetUser}:\n${parts.join('\n')}\n\nData from ${formatWikiSyncTimestamp(result.data.timestamp)}.`,
    );

    onSynced?.({ ...mergeResult, username: targetUser });
  }, [fixedUsername, username, syncTargets, questNames, onSynced]);

  const panelBody = (
    <View style={styles.body}>
      <Text style={styles.description}>
        Import quest and diary progress from the OSRS Wiki WikiSync service. You need the WikiSync plugin enabled in RuneLite and must have logged in recently.
      </Text>

      <TouchableOpacity style={styles.setupToggle} onPress={() => setShowSetup((v) => !v)}>
        <Text style={styles.setupToggleText}>{showSetup ? '▾ Hide setup guide' : '▸ How to enable WikiSync'}</Text>
      </TouchableOpacity>

      {showSetup && (
        <View style={styles.setupBox}>
          {WIKISYNC_SETUP_STEPS.map((step, i) => (
            <Text key={step} style={styles.setupStep}>{i + 1}. {step}</Text>
          ))}
          <TouchableOpacity onPress={() => Linking.openURL('https://oldschool.runescape.wiki/w/RuneScape:WikiSync')}>
            <Text style={styles.setupLink}>Read more on the OSRS Wiki →</Text>
          </TouchableOpacity>
        </View>
      )}

      {!hideUsernameInput && (
        <>
          {characters.length > 0 && (
            <View style={styles.chipRow}>
              {characters.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, username === c.username && styles.chipActive]}
                  onPress={() => setUsername(c.username)}
                >
                  <Text style={[styles.chipText, username === c.username && styles.chipTextActive]}>{c.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="OSRS username"
            placeholderTextColor={theme.colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      )}

      {lastSync && (
        <Text style={styles.lastSync}>
          Last sync: {lastSync.username} · {formatWikiSyncTimestamp(lastSync.at)}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={syncing}
      >
        {syncing
          ? <ActivityIndicator color={theme.colors.background} size="small" />
          : <Text style={styles.syncButtonText}>Sync from WikiSync</Text>}
      </TouchableOpacity>

      <Text style={styles.note}>
        WikiSync data is public, like hiscores. Sync merges new completions without removing manual checkmarks.
      </Text>
    </View>
  );

  if (compact) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.header} onPress={() => setExpanded((v) => !v)}>
          <Text style={styles.headerTitle}>WikiSync</Text>
          <Text style={styles.headerChevron}>{expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        {expanded && panelBody}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerStatic}>
        <Text style={styles.headerTitle}>WikiSync</Text>
      </View>
      {panelBody}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    borderRadius: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerStatic: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontFamily: theme.fonts.display,
    fontSize: 18,
    color: theme.colors.goldLight,
    letterSpacing: 1,
  },
  headerChevron: {
    fontFamily: theme.fonts.display,
    fontSize: 16,
    color: theme.colors.gold,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  description: {
    fontFamily: theme.fonts.display,
    fontSize: 15,
    color: theme.colors.parchmentDim,
    lineHeight: 21,
  },
  setupToggle: {
    alignSelf: 'flex-start',
  },
  setupToggleText: {
    fontFamily: theme.fonts.display,
    fontSize: 15,
    color: theme.colors.gold,
  },
  setupBox: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 3,
    padding: 12,
    gap: 6,
  },
  setupStep: {
    fontFamily: theme.fonts.display,
    fontSize: 14,
    color: theme.colors.parchmentDim,
    lineHeight: 20,
  },
  setupLink: {
    fontFamily: theme.fonts.display,
    fontSize: 14,
    color: theme.colors.gold,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
  },
  chipActive: {
    borderColor: theme.colors.borderGold,
    backgroundColor: theme.colors.panelLight,
  },
  chipText: {
    fontFamily: theme.fonts.display,
    fontSize: 14,
    color: theme.colors.parchmentDim,
  },
  chipTextActive: {
    color: theme.colors.goldLight,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 3,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: theme.fonts.display,
    fontSize: 16,
    color: theme.colors.parchment,
  },
  lastSync: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  syncButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  syncButtonDisabled: {
    backgroundColor: theme.colors.goldDim,
  },
  syncButtonText: {
    fontFamily: theme.fonts.display,
    fontSize: 17,
    color: theme.colors.background,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  note: {
    fontFamily: theme.fonts.display,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
});
