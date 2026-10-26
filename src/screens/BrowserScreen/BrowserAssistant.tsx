import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {toJS} from 'mobx';
import {observer} from 'mobx-react';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {IconButton} from 'react-native-paper';

import {useTheme} from '../../hooks';
import {modelStore} from '../../store';
import type {GenerationLease} from '../../store/generationLease';
import {stopQuietly} from '../../utils/stopQuietly';

import {createStyles} from './styles';
import {
  buildSystemPrompt,
  computeBudget,
  DEFAULT_SYSTEM_PROMPT,
  isContextFullError,
  PageSnapshot,
  trimHistory,
} from './browserUtils';
import type {BrowserStrings} from './strings';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface Props {
  strings: BrowserStrings;
  /** True when the active tab shows a real web page. */
  hasPage: boolean;
  /** Reads the active page (text + selection). Resolves null if unavailable. */
  getPage: () => Promise<PageSnapshot | null>;
  onClose: () => void;
}

export const BrowserAssistant: React.FC<Props> = observer(
  ({strings, hasPage, getPage, onClose}) => {
    const theme = useTheme();
    const styles = createStyles(theme);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [usePage, setUsePage] = useState(true);
    const [notice, setNotice] = useState<string | null>(null);

    const leaseRef = useRef<GenerationLease | null>(null);
    const busyRef = useRef(false);
    const scrollRef = useRef<ScrollView | null>(null);

    // Leaving the screen must not leave the model generating for nobody.
    useEffect(
      () => () => {
        leaseRef.current?.abort();
      },
      [],
    );

    const patchLast = useCallback((patch: Partial<ChatMessage>) => {
      setMessages(prev => {
        if (prev.length === 0) {
          return prev;
        }
        const copy = prev.slice();
        copy[copy.length - 1] = {...copy[copy.length - 1], ...patch};
        return copy;
      });
    }, []);

    const send = useCallback(
      async (raw: string) => {
        const question = raw.trim();
        if (!question || busyRef.current) {
          return;
        }
        const lease = modelStore.tryAcquireGeneration();
        if (!lease) {
          setNotice(
            modelStore.isGenerationBusy ? strings.busy : strings.noModel,
          );
          return;
        }

        busyRef.current = true;
        leaseRef.current = lease;
        setBusy(true);
        setNotice(null);

        const budget = computeBudget(modelStore.contextInitParams.n_ctx);
        const prior = trimHistory(
          messages
            .filter(m => !m.isError && m.content.trim().length > 0)
            .map(m => ({role: m.role, content: m.content})),
          budget.historyChars,
        );
        setMessages(prev => [
          ...prev,
          {role: 'user', content: question},
          {role: 'assistant', content: ''},
        ]);

        const onAbort = () => stopQuietly(() => lease.engine.stopCompletion());
        lease.signal.addEventListener('abort', onAbort, {once: true});

        try {
          const page = usePage && hasPage ? await getPage() : null;
          const system = buildSystemPrompt(
            DEFAULT_SYSTEM_PROMPT,
            page,
            budget.pageChars,
          );

          let acc = '';
          const result = await lease.engine.completion(
            {
              messages: [
                {role: 'system', content: system},
                ...prior,
                {role: 'user', content: question},
              ],
              temperature: 0.7,
              n_predict: budget.nPredict,
              stop: toJS(modelStore.activeModel?.stopWords),
              enable_thinking: false,
            },
            data => {
              if (data.content) {
                acc += data.content;
                patchLast({content: acc});
              }
            },
          );
          if (!acc) {
            patchLast({content: (result.content ?? result.text ?? '').trim()});
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          patchLast({
            content: isContextFullError(message)
              ? strings.contextFull
              : `${strings.error} ${message}`,
            isError: true,
          });
        } finally {
          lease.signal.removeEventListener('abort', onAbort);
          lease.end();
          leaseRef.current = null;
          busyRef.current = false;
          setBusy(false);
        }
      },
      [messages, usePage, hasPage, getPage, patchLast, strings],
    );

    const onSend = () => {
      if (busy) {
        leaseRef.current?.abort();
        return;
      }
      const text = input;
      setInput('');
      send(text);
    };

    const onChip = (prompt: string) => {
      if (!busy) {
        setUsePage(true);
        send(prompt);
      }
    };

    return (
      <KeyboardAvoidingView
        style={styles.assistant}
        behavior="padding">
        <View style={styles.assistantHeader}>
          <Text style={styles.assistantTitle}>{strings.assistant}</Text>
          <View style={styles.row}>
            <IconButton
              icon="delete-outline"
              size={20}
              accessibilityLabel={strings.clear}
              onPress={() => {
                leaseRef.current?.abort();
                setMessages([]);
                setNotice(null);
              }}
            />
            <IconButton
              icon="close"
              size={20}
              accessibilityLabel={strings.close}
              onPress={onClose}
            />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({animated: true})
          }>
          {messages.length === 0 ? (
            <Text style={styles.emptyHint}>{strings.emptyHint}</Text>
          ) : (
            messages.map((m, i) => (
              <View
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                style={m.role === 'user' ? styles.userBubble : styles.botBubble}>
                <Text
                  selectable
                  style={[styles.messageText, m.isError && styles.errorText]}>
                  {m.content || (busy && i === messages.length - 1 ? '…' : '')}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}>
          {strings.chips.map(chip => (
            <TouchableOpacity
              key={chip.label}
              style={styles.chip}
              disabled={busy}
              onPress={() => onChip(chip.prompt)}>
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.contextRow}
          onPress={() => setUsePage(v => !v)}>
          <Text style={styles.contextText}>
            {usePage ? '☑' : '☐'} {strings.usePage}
          </Text>
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={strings.inputPlaceholder}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            editable={!busy}
          />
          <TouchableOpacity
            style={[styles.sendButton, busy && styles.stopButton]}
            onPress={onSend}>
            <Text style={styles.sendText}>
              {busy ? strings.stop : strings.send}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  },
);
