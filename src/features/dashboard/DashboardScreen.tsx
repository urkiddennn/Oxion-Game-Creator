import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useProjectStore } from '../../store/useProjectStore';
import { theme } from '../../theme';
import { Activity, Play, Zap, Box, Map as MapIcon, Info, ChevronLeft, Bolt } from 'lucide-react-native';

export default function DashboardScreen() {
  const { activeProject: currentProject, closeProject } = useProjectStore();

  if (!currentProject) return null;

  const isPlatformer = currentProject.template === 'Platformer';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity style={styles.backButton} onPress={closeProject}>
            <ChevronLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <View>
            <Text style={styles.welcomeText}>Current Project</Text>
            <Text style={styles.projectName}>{currentProject.name}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.playButton}>
          <Play fill={theme.colors.background} color={theme.colors.background} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{(currentProject.objects || []).length}</Text>
          <Text style={styles.statLabel}>Objects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{(currentProject.rooms || []).length}</Text>
          <Text style={styles.statLabel}>Rooms</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{(currentProject.sprites || []).length}</Text>
          <Text style={styles.statLabel}>Assets</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>v1.0</Text>
          <Text style={styles.statLabel}>Version</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.leftColumn}>
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Cloud Sync</Text>
              <PublishButton />
            </View>
            <View style={styles.cloudInfo}>
              <Bolt color={theme.colors.primary} size={16} />
              <Text style={styles.cloudText}>Stream assets and play across devices</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Context Actions</Text>
            <View style={styles.activityList}>
              <Text style={styles.emptyState}>No recent activity. Start by creating an object!</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView >

  );
}

function PublishButton() {
  const { publishProject } = useProjectStore();
  const [loading, setLoading] = React.useState(false);

  const handlePublish = async () => {
    setLoading(true);
    const result = await publishProject();
    setLoading(false);

    if (result.success) {
      alert('Project Published! Your game is now live in the cloud.');
    } else {
      alert('Publish Failed: ' + result.error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.publishBtn, loading && { opacity: 0.7 }]}
      onPress={handlePublish}
      disabled={loading}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {loading ? (
          <Text style={styles.publishBtnText}>Publishing...</Text>
        ) : (
          <>
            <Bolt color="#fff" size={16} />
            <Text style={styles.publishBtnText}>Publish to Cloud</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function DashboardCard({ icon: Icon, label, color }: any) {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
        <Icon color={color} size={24} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2228',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    ...theme.typography.caption,
  },
  projectName: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  statLabel: {
    ...theme.typography.caption,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  mainContent: {
    flexDirection: 'row',
    paddingBottom: 40,
  },
  leftColumn: {
    flex: 2,
  },
  rightColumn: {
    flex: 1,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    fontSize: 14,
  },
  activityList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    minHeight: 200,
  },
  emptyState: {
    ...theme.typography.caption,
    textAlign: 'center',
  },
  cloudInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E2228',
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
  },
  cloudText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  publishBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishBtnText: {
    ...theme.typography.caption,
    color: theme.colors.background,
    fontWeight: '700',
  },
});
