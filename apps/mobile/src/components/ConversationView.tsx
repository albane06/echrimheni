/**
 * P6.2-A/P7.10 — Conversation liée à un booking (participants vérifiés
 * serveur). Lecture/écriture via RPC : sender toujours dérivé de la session.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import {
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  type ConversationMessage,
} from '@echrimheni/database';
import { classifySupabaseError } from '@echrimheni/database';
import { colors } from '../theme/tokens';
import { useLanguage } from '../i18n';
import { formatUserErrorMessage } from '../utils/errors';

export function ConversationView({ bookingId }: { bookingId: string }) {
  const { t, lang } = useLanguage();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (err: unknown) => {
    setError(formatUserErrorMessage(t, err));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const conv = await getOrCreateConversation(bookingId);
      setConversationId(conv.id);
      setMessages((await getConversationMessages(conv.id)) || []);
    } catch (err: unknown) {
      fail(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSend = async () => {
    if (!conversationId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(conversationId, draft);
      setDraft('');
      setMessages((await getConversationMessages(conversationId)) || []);
    } catch (err: unknown) {
      fail(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <ActivityIndicator color={colors.primary[600]} />;
  if (error) return <Text style={styles.errorText}>{error}</Text>;

  return (
    <View style={styles.box}>
      {messages.length === 0 ? (
        <Text style={styles.emptyText}>{t('conversation.empty')}</Text>
      ) : (
        messages.map(m => (
          <View key={m.id} style={styles.msg}>
            <Text style={styles.msgBody}>{m.body}</Text>
            <Text style={styles.msgMeta}>
              {new Date(m.created_at).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR')}
            </Text>
          </View>
        ))
      )}
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginEnd: 8 }]}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('conversation.placeholder')}
          placeholderTextColor={colors.text.muted}
          accessibilityLabel={t('conversation.placeholder')}
          maxLength={2000}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={() => void handleSend()}
          disabled={sending || !draft.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('conversation.send')}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>{t('conversation.send')}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 8, padding: 10, backgroundColor: colors.bg.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default },
  msg: { marginBottom: 8, padding: 8, backgroundColor: colors.bg.app, borderRadius: 6 },
  msgBody: { color: colors.text.primary, fontSize: 12 },
  msgMeta: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  input: { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.default, borderRadius: 12, padding: 10, color: colors.text.primary, fontSize: 12, minHeight: 44 },
  sendBtn: { backgroundColor: colors.secondary[600], borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  sendText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  errorText: { color: colors.danger.main, fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: colors.text.muted, fontSize: 12, fontStyle: 'italic' },
});
