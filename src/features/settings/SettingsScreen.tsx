import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { useProjectStore } from '../../store/useProjectStore';
import { Settings as SettingsIcon, LogOut, Shield, Database, Bell } from 'lucide-react-native';

export default function SettingsScreen() {
  const { activeProject: currentProject, closeProject } = useProjectStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <SettingsIcon color={theme.colors.primary} size={32} />
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <SettingItem icon={Shield} label="Project Permissions" />
        <SettingItem icon={Database} label="Storage & Export" />
        <SettingItem icon={Bell} label="Notifications" />
      </View>

      <TouchableOpacity 
        style={styles.dangerButton} 
        onPress={() => closeProject()}
      >
        <LogOut color={theme.colors.error} size={20} />
        <Text style={styles.dangerText}>Close Project</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SettingItem({ icon: Icon, label }: any) {
  return (
    <TouchableOpacity style={styles.item}>
      <View style={styles.itemLeft}>
        <Icon color={theme.colors.textSecondary} size={20} />
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <Text style={styles.itemValue}>Configure</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemLabel: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  itemValue: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  dangerButton: {
    marginHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.error + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
    marginBottom: 40,
  },
  dangerText: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
});
