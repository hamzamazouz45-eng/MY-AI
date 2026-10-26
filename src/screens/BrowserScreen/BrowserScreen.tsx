import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  BackHandler,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {observer} from 'mobx-react';
import {IconButton, ProgressBar} from 'react-native-paper';
import {useIsFocused} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import type {WebViewMessageEvent} from 'react-native-webview';

import {useTheme} from '../../hooks';
import {uiStore} from '../../store';

import {BrowserAssistant} from './BrowserAssistant';
import {createStyles} from './styles';
import {getBrowserStrings} from './strings';
import {
  BrowserTab,
  createTab,
  isInternalScheme,
  isWebUrl,
  nextActiveAfterClose,
  PAGE_EXTRACT_JS,
  PageSnapshot,
  parsePageMessage,
  tabLabel,
  toUrl,
} from './browserUtils';

const PAGE_READ_TIMEOUT_MS = 4000;

export const BrowserScreen: React.FC = observer(() => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);
  const strings = getBrowserStrings(uiStore.language);
  const isFocused = useIsFocused();

  const nextId = useRef(2);
  const [tabs, setTabs] = useState<BrowserTab[]>([createTab(1)]);
  const [activeId, setActiveId] = useState(1);
  const [editing, setEditing] = useState(false);
  const [addressText, setAddressText] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);

  const webRefs = useRef<Record<number, WebView | null>>({});
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const pendingPage = useRef<((page: PageSnapshot | null) => void) | null>(
    null,
  );

  const active = tabs.find(t => t.id === activeId) ?? tabs[0];

  const updateTab = useCallback((id: number, patch: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => (t.id === id ? {...t, ...patch} : t)));
  }, []);

  const openTab = useCallback((uri: string = '') => {
    const id = nextId.current++;
    setTabs(prev => [...prev, createTab(id, uri)]);
    setActiveId(id);
    setEditing(false);
  }, []);

  const closeTab = useCallback(
    (id: number) => {
      delete webRefs.current[id];
      if (tabs.length <= 1) {
        const fresh = nextId.current++;
        setTabs([createTab(fresh)]);
        setActiveId(fresh);
        return;
      }
      setActiveId(nextActiveAfterClose(tabs, id, activeId));
      setTabs(tabs.filter(t => t.id !== id));
    },
    [tabs, activeId],
  );

  const navigate = useCallback(
    (text: string) => {
      const url = toUrl(text);
      if (!url) {
        return;
      }
      if (!active.uri) {
        // First load of a blank tab mounts its WebView.
        updateTab(active.id, {uri: url, url, loading: true, progress: 0});
      } else {
        webRefs.current[active.id]?.injectJavaScript(
          `window.location.href = ${JSON.stringify(url)}; true;`,
        );
      }
    },
    [active.id, active.uri, updateTab],
  );

  // Hardware back: close assistant, then go back in the page, then close tab.
  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (assistantOpen) {
        setAssistantOpen(false);
        return true;
      }
      if (active.canGoBack) {
        webRefs.current[active.id]?.goBack();
        return true;
      }
      if (tabs.length > 1) {
        closeTab(active.id);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isFocused, assistantOpen, active, tabs.length, closeTab]);

  const getPage = useCallback(
    () =>
      new Promise<PageSnapshot | null>(resolve => {
        const ref = webRefs.current[activeIdRef.current];
        if (!ref) {
          resolve(null);
          return;
        }
        const timer = setTimeout(() => {
          pendingPage.current = null;
          resolve(null);
        }, PAGE_READ_TIMEOUT_MS);
        pendingPage.current = page => {
          clearTimeout(timer);
          pendingPage.current = null;
          resolve(page);
        };
        ref.injectJavaScript(PAGE_EXTRACT_JS);
      }),
    [],
  );

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const page = parsePageMessage(event.nativeEvent.data);
    if (page && pendingPage.current) {
      pendingPage.current(page);
    }
  }, []);

  const shownAddress = editing ? addressText : active.url;

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}>
          {tabs.map(tab => {
            const isActive = tab.id === active.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => {
                  setActiveId(tab.id);
                  setEditing(false);
                }}>
                <Text
                  numberOfLines={1}
                  style={[styles.tabTitle, isActive && styles.tabTitleActive]}>
                  {tabLabel(tab, strings.newTab)}
                </Text>
                <IconButton
                  icon="close"
                  size={14}
                  style={styles.tabClose}
                  onPress={() => closeTab(tab.id)}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <IconButton
          icon="plus"
          size={20}
          accessibilityLabel={strings.newTab}
          onPress={() => openTab('')}
        />
      </View>

      {/* Navigation */}
      <View style={styles.navBar}>
        <IconButton
          icon="arrow-left"
          size={20}
          disabled={!active.canGoBack}
          onPress={() => webRefs.current[active.id]?.goBack()}
        />
        <IconButton
          icon="arrow-right"
          size={20}
          disabled={!active.canGoForward}
          onPress={() => webRefs.current[active.id]?.goForward()}
        />
        <IconButton
          icon={active.loading ? 'close' : 'reload'}
          size={20}
          disabled={!active.uri}
          onPress={() => {
            const ref = webRefs.current[active.id];
            if (active.loading) {
              ref?.stopLoading();
            } else {
              ref?.reload();
            }
          }}
        />
        <TextInput
          style={styles.address}
          value={shownAddress}
          placeholder={strings.addressPlaceholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          selectTextOnFocus
          onFocus={() => {
            setAddressText(active.url);
            setEditing(true);
          }}
          onChangeText={setAddressText}
          onSubmitEditing={() => {
            setEditing(false);
            navigate(addressText);
          }}
          onBlur={() => setEditing(false)}
        />
        <IconButton
          icon="star-four-points"
          size={20}
          iconColor={theme.colors.primary}
          accessibilityLabel={strings.assistant}
          onPress={() => setAssistantOpen(open => !open)}
        />
      </View>
      <ProgressBar
        progress={active.progress}
        visible={active.loading && active.progress < 1}
        style={styles.progress}
      />

      {/* Pages */}
      <View style={styles.webArea}>
        {tabs.map(tab =>
          tab.uri ? (
            <View
              key={tab.id}
              style={tab.id === active.id ? styles.webVisible : styles.webHidden}>
              <WebView
                ref={ref => {
                  webRefs.current[tab.id] = ref;
                }}
                source={{uri: tab.uri}}
                javaScriptEnabled
                domStorageEnabled
                setSupportMultipleWindows
                mixedContentMode="compatibility"
                onMessage={onMessage}
                onNavigationStateChange={nav =>
                  updateTab(tab.id, {
                    url: nav.url,
                    loading: nav.loading,
                    canGoBack: nav.canGoBack,
                    canGoForward: nav.canGoForward,
                    ...(nav.title ? {title: nav.title} : {}),
                  })
                }
                onLoadProgress={({nativeEvent}) =>
                  updateTab(tab.id, {progress: nativeEvent.progress})
                }
                onShouldStartLoadWithRequest={request => {
                  if (isInternalScheme(request.url)) {
                    return true;
                  }
                  // mailto:, tel:, intent: ... belong to other apps.
                  Linking.openURL(request.url).catch(() => {});
                  return false;
                }}
                onOpenWindow={event => openTab(event.nativeEvent.targetUrl)}
              />
            </View>
          ) : tab.id === active.id ? (
            <View key={tab.id} style={styles.blank}>
              <Text style={styles.blankTitle}>{strings.title}</Text>
              <Text style={styles.blankHint}>{strings.blankHint}</Text>
            </View>
          ) : null,
        )}

        {assistantOpen ? (
          <BrowserAssistant
            strings={strings}
            hasPage={isWebUrl(active.url)}
            getPage={getPage}
            onClose={() => setAssistantOpen(false)}
          />
        ) : null}
      </View>
    </View>
  );
});
