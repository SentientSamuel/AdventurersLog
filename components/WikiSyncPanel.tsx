import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  extractCompletedQuests,
  formatWikiSyncTimestamp,
  WIKISYNC_SETUP_STEPS,
  WIKISYNC_STORAGE_KEYS,
  type WikiSyncSyncResult,
} from '../constants/wikisync-api';
import {
  loadSavedCharacters,
  loadSyncMeta,
  migrateToPerCharacterProgress,
  replaceProgressFromWikiSync,
  resolveProgressKey,
  setActiveCharacterByUsername,
  getActiveProgressKey,
} from '../constants/character-progress';
import { countsTowardQuestCape, QUESTS } from '../constants/quest-data';

const CHARACTERS_KEY = WIKISYNC_STORAGE_KEYS.characters;
const SELECTED_USERNAME_KEY = WIKISYNC_STORAGE_KEYS.selectedUsername;

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
  /** Called when the active character selection changes (before or without sync). */
  onCharacterChange?: (username: string) => void;
};

function pickDefaultUsername(
  characters: SavedCharacter[],
  savedSelection: string | null,
  lastSyncUsername: string | null,
): string {
  const saved = new Set(characters.map((c) => c.username));

  if (savedSelection && saved.has(savedSelection)) return savedSelection;
  if (lastSyncUsername && saved.has(lastSyncUsername)) return lastSyncUsername;
  if (characters.length === 1) return characters[0].username;
  return '';
}

export function WikiSyncPanel({
  questNames,
  syncTargets,
  fixedUsername,
  hideUsernameInput = false,
  compact = false,
  onSynced,
  onCharacterChange,
}: WikiSyncPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [showSetup, setShowSetup] = useState(false);
  const [username, setUsername] = useState(fixedUsername ?? '');
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ username: string; at: string } | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (fixedUsername) setUsername(fixedUsername);
  }, [fixedUsername]);

  const loadPanelState = useCallback(async () => {
    await migrateToPerCharacterProgress();

    const [charsRaw, selectedRaw, activeKey] = await Promise.all([
      AsyncStorage.getItem(CHARACTERS_KEY),
      AsyncStorage.getItem(SELECTED_USERNAME_KEY),
      getActiveProgressKey(),
    ]);

    let parsed: SavedCharacter[] = [];
    if (charsRaw) {
      try { parsed = JSON.parse(charsRaw) as SavedCharacter[]; } catch { /* ignore */ }
    }
    setCharacters(parsed);

    if (activeKey) {
      const meta = await loadSyncMeta(activeKey);
      if (meta) setLastSync(meta);
    }

    if (fixedUsername) {
      setUsername(fixedUsername);
      initializedRef.current = true;
      return;
    }

    if (!initializedRef.current) {
      const activeChar = activeKey
        ? parsed.find((c) => c.id === activeKey)
        : undefined;
      const selectedChar = selectedRaw
        ? parsed.find((c) => c.username === selectedRaw)
        : undefined;

      const initial = activeChar?.username
        ?? selectedChar?.username
        ?? pickDefaultUsername(parsed, selectedRaw, null);

      setUsername(initial);
      initializedRef.current = true;
    }
  }, [fixedUsername]);

  useEffect(() => {
    loadPanelState();
  }, [loadPanelState]);

  useEffect(() => {
    if (compact && expanded) loadPanelState();
  }, [compact, expanded, loadPanelState]);

  const persistSelection = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      await AsyncStorage.setItem(SELECTED_USERNAME_KEY, trimmed);
    } else {
      await AsyncStorage.removeItem(SELECTED_USERNAME_KEY);
    }
  }, []);

  const activateCharacter = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    await persistSelection(trimmed);
    await setActiveCharacterByUsername(trimmed);
    const chars = characters.length > 0 ? characters : await loadSavedCharacters();
    const key = resolveProgressKey(trimmed, chars);
    const meta = await loadSyncMeta(key);
    setLastSync(meta);
    onCharacterChange?.(trimmed);
  }, [characters, persistSelection, onCharacterChange]);

  const selectCharacter = useCallback((name: string) => {
    activateCharacter(name);
  }, [activateCharacter]);

  const handleUsernameChange = useCallback((text: string) => {
    setUsername(text);
    persistSelection(text);
  }, [persistSelection]);

  const handleCharacterChipPress = useCallback((charUsername: string) => {
    if (username === charUsername) {
      setUsername('');
      persistSelection('');
      return;
    }
    selectCharacter(charUsername);
  }, [username, selectCharacter, persistSelection]);

  const handleSync = useCallback(async () => {
    const targetUser = (fixedUsername ?? username).trim();
    if (!targetUser) {
      Alert.alert(
        'Select a character',
        characters.length > 0
          ? 'Pick one of your saved characters above, or enter an OSRS username manually.'
          : 'Enter your OSRS username or add a character in Adventurer\'s Log.',
      );
      return;
    }

    setSyncing(true);
    await migrateToPerCharacterProgress();

    const result = await fetchWikiSyncProfile(targetUser);
    setSyncing(false);

    if (!result.ok) {
      Alert.alert('WikiSync unavailable', result.message);
      return;
    }

    const chars = characters.length > 0 ? characters : await loadSavedCharacters();
    const progressKey = resolveProgressKey(targetUser, chars);

    const mergeResult = await replaceProgressFromWikiSync(
      progressKey,
      targetUser,
      result.data,
      questNames,
      syncTargets,
    );

    await persistSelection(targetUser);
    const meta = { username: targetUser, at: result.data.timestamp };
    setLastSync(meta);
    onCharacterChange?.(targetUser);

    const wikiQuests = extractCompletedQuests(result.data, questNames);
    const capeCompleted = [...wikiQuests].filter((name) => {
      const q = QUESTS.find((entry) => entry.name === name);
      return q && countsTowardQuestCape(q);
    }).length;

    const parts: string[] = [];
    if (syncTargets.includes('quests')) {
      parts.push(`${capeCompleted}/180 quests (${mergeResult.questsAdded} changed)`);
    }
    if (syncTargets.includes('diaries')) {
      parts.push(`${mergeResult.diaryTierTotal} diary tiers (${mergeResult.diaryTiersAdded} changed)`);
    }

    Alert.alert(
      'WikiSync complete',
      `Synced ${targetUser}:\n${parts.join('\n')}\n\nData from ${formatWikiSyncTimestamp(result.data.timestamp)}.\n\nProgress is saved per character — other accounts are unaffected.`,
    );

    onSynced?.({ ...mergeResult, username: targetUser });
  }, [fixedUsername, username, characters, syncTargets, questNames, onSynced, onCharacterChange, persistSelection]);

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
            <View style={styles.characterSection}>
              <Text style={styles.characterLabel}>
                {characters.length === 1 ? 'Saved character' : 'Select character'}
              </Text>
              <View style={styles.chipRow}>
                {characters.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, username === c.username && styles.chipActive]}
                    onPress={() => handleCharacterChipPress(c.username)}
                  >
                    <Text style={[styles.chipText, username === c.username && styles.chipTextActive]}>
                      {c.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {characters.length > 1 && (
                <Text style={styles.characterHint}>Tap a character to sync. Tap again to deselect.</Text>
              )}
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder={characters.length > 0 ? 'Or enter another OSRS username' : 'OSRS username'}
            placeholderTextColor={theme.colors.textMuted}
            value={username}
            onChangeText={handleUsernameChange}
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
  characterSection: {
    gap: 6,
  },
  characterLabel: {
    fontFamily: theme.fonts.display,
    fontSize: 14,
    color: theme.colors.gold,
    letterSpacing: 0.5,
  },
  characterHint: {
    fontFamily: theme.fonts.display,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
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
