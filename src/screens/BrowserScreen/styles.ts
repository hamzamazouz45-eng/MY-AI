import {StyleSheet} from 'react-native';

import type {Theme} from '../../utils/types';

export const createStyles = (theme: Theme, insets: {bottom: number} = {bottom: 0}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      // The app draws under the system navigation bar (edge-to-edge).
      paddingBottom: insets.bottom,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // Tabs
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingLeft: 6,
    },
    tabsScroll: {
      flexGrow: 0,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: 170,
      minWidth: 90,
      height: 34,
      paddingLeft: 10,
      paddingRight: 2,
      marginRight: 2,
      marginTop: 6,
      borderTopLeftRadius: 9,
      borderTopRightRadius: 9,
    },
    tabActive: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    tabTitle: {
      flexShrink: 1,
      fontSize: 12.5,
      color: theme.colors.onSurfaceVariant,
    },
    tabTitleActive: {
      color: theme.colors.onSurface,
    },
    tabClose: {
      margin: 0,
    },

    // Navigation row
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: 2,
    },
    address: {
      flex: 1,
      height: 38,
      marginHorizontal: 4,
      paddingHorizontal: 14,
      paddingVertical: 0,
      borderRadius: 19,
      fontSize: 13,
      color: theme.colors.onSurface,
      backgroundColor: theme.colors.background,
    },
    progress: {
      height: 2,
    },

    // Web area
    webArea: {
      flex: 1,
    },
    webVisible: {
      flex: 1,
    },
    webHidden: {
      display: 'none',
    },
    blank: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    blankTitle: {
      fontSize: 26,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: 10,
    },
    blankHint: {
      fontSize: 13,
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
    },

    // Assistant
    assistant: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      backgroundColor: theme.colors.surface,
    },
    assistantHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 14,
      paddingRight: 2,
      backgroundColor: theme.colors.surfaceVariant,
    },
    assistantTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    messages: {
      flex: 1,
    },
    messagesContent: {
      padding: 12,
      gap: 8,
    },
    emptyHint: {
      marginTop: 40,
      textAlign: 'center',
      lineHeight: 22,
      color: theme.colors.onSurfaceVariant,
    },
    userBubble: {
      alignSelf: 'flex-start',
      maxWidth: '92%',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceVariant,
    },
    botBubble: {
      alignSelf: 'stretch',
      paddingHorizontal: 2,
      paddingVertical: 4,
    },
    messageText: {
      fontSize: 14.5,
      lineHeight: 22,
      color: theme.colors.onSurface,
    },
    errorText: {
      color: theme.colors.error,
    },
    notice: {
      marginHorizontal: 12,
      marginBottom: 6,
      fontSize: 12.5,
      color: theme.colors.error,
    },
    chipsScroll: {
      flexGrow: 0,
    },
    chips: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    chipText: {
      fontSize: 12.5,
      color: theme.colors.onSurface,
    },
    contextRow: {
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    contextText: {
      fontSize: 12.5,
      color: theme.colors.onSurfaceVariant,
    },
    dimmed: {
      opacity: 0.4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 8,
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      color: theme.colors.onSurface,
    },
    sendButton: {
      height: 44,
      minWidth: 70,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
    },
    stopButton: {
      backgroundColor: theme.colors.error,
    },
    sendText: {
      fontWeight: '600',
      color: theme.colors.onPrimary,
    },
  });
