import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, TextInput, Alert, Linking } from 'react-native';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../theme';
import { SquarePlus, ArrowRight, User, Trash2, Heart, Play } from 'lucide-react-native';
import { OxionLogo } from '../../components/OxionLogo';
import CommunityScreen from '../community/CommunityScreen';
import AuthModal from '../auth/AuthModal';
import ProfileScreen from '../profile/ProfileScreen';
import TutorialsScreen from '../tutorials/TutorialsScreen';
import ContributionsScreen from '../community/ContributionsScreen';

export default function LaunchpadScreen() {
  const [activeTab, setActiveTab] = useState<'Projects' | 'Community' | 'Tutorials' | 'Contributions' | 'Profile'>('Projects');
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [namingModalVisible, setNamingModalVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const { projects, createNewProject, openProject, selectedProject, selectProject, removeProject } = useProjectStore();
  const { session, signOut } = useAuthStore();

  const handleCreate = () => {
    setNewProjectName(`Game ${projects.length + 1}`);
    setNamingModalVisible(true);
  };

  const confirmCreate = () => {
    createNewProject(newProjectName || `Game ${projects.length + 1}`, 'Empty');
    setNamingModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Tab Bar */}
      <View style={styles.tabBar}>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Projects' && styles.tabActive]}
            onPress={() => setActiveTab('Projects')}
          >
            <Text style={[styles.tabText, activeTab === 'Projects' && styles.tabTextActive]}>Projects</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Community' && styles.tabActive]}
            onPress={() => setActiveTab('Community')}
          >
            <Text style={[styles.tabText, activeTab === 'Community' && styles.tabTextActive]}>Community</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Tutorials' && styles.tabActive]}
            onPress={() => setActiveTab('Tutorials')}
          >
            <Text style={[styles.tabText, activeTab === 'Tutorials' && styles.tabTextActive]}>Tutorials</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Contributions' && styles.tabActive]}
            onPress={() => setActiveTab('Contributions')}
          >
            <Text style={[styles.tabText, activeTab === 'Contributions' && styles.tabTextActive]}>Contributions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabBarRight}>
          {!session ? (
            <TouchableOpacity style={styles.navSignInButton} onPress={() => setAuthModalVisible(true)}>
              <User size={14} color={theme.colors.primary} />
              <Text style={styles.navSignInText}>Sign In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navSignInButton} onPress={() => setActiveTab('Profile')}>
              <User size={14} color={theme.colors.primary} />
              <Text style={styles.navSignInText}>Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activeTab === 'Community' ? (
        <CommunityScreen />
      ) : activeTab === 'Tutorials' ? (
        <TutorialsScreen />
      ) : activeTab === 'Contributions' ? (
        <ContributionsScreen />
      ) : activeTab === 'Profile' ? (
        <ProfileScreen />
      ) : (
        <View style={styles.mainContent}>
          {/* Project Section */}
          <View style={styles.projectsSection}>


            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectGrid}>
              {/* Dynamic Project Cards */}
              {projects.map((project, index) => {
                const isSelected = selectedProject?.name === project.name;
                return (
                  <TouchableOpacity
                    key={`${project.name}_${index}`}
                    style={styles.projectCard}
                    onPress={() => {
                      openProject(project.name);
                    }}
                    onLongPress={() => {
                      Alert.alert(
                        'Delete Project',
                        `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => removeProject(project.id)
                          },
                        ]
                      );
                    }}
                    delayLongPress={500}
                  >
                    <View style={styles.thumbnailPlaceholder} />
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectName}>{project.name}</Text>
                      <ArrowRight color={theme.colors.textMuted} size={16} />
                    </View>
                  </TouchableOpacity>
                );
              })}


              {/* Create New Card */}
              <TouchableOpacity style={styles.createCard} onPress={handleCreate}>
                <SquarePlus color={theme.colors.textMuted} size={48} strokeWidth={1} />
                <Text style={{ color: theme.colors.textMuted, marginTop: 12, fontSize: 12 }}>New Project</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Right Info Sidebar */}
          <View style={styles.infoSidebar}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <OxionLogo size={120} />
              </View>
              <Text style={styles.appTitle}>Oxion2d v1.12.8</Text>
            </View>

            <View style={styles.sidebarLinks}>
              <TouchableOpacity
                style={styles.sidebarLinkButton}
                onPress={() => Linking.openURL('https://paypal.me/Urkidden')}
              >
                <Heart size={14} color="#FFF" />
                <Text style={styles.sidebarLinkText}>Donate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarLinkButton}
                onPress={() => Linking.openURL('https://www.youtube.com/@urkidden4834')}
              >
                <Play size={14} color="#FFF" />
                <Text style={styles.sidebarLinkText}>YouTube</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      )}

      {/* Project Naming Modal */}
      <Modal
        visible={namingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNamingModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNamingModalVisible(false)}
        >
          <View style={styles.namingModal}>
            <Text style={styles.modalTitle}>Project Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="Enter game title..."
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#1E2228' }]}
                onPress={() => setNamingModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={confirmCreate}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>Create Project</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#16191E',
    borderBottomWidth: 1,

    borderBottomColor: theme.colors.border,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tabBarRight: {

    flexDirection: 'row',
    alignItems: 'center',
  },
  navSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
    gap: 6,
    backgroundColor: '#1E2228',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  navSignInText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  tab: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginRight: 4,
    height: '100%',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.text,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  projectsSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 24,
  },
  projectGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  projectCard: {
    width: 140,
    height: 140,
    backgroundColor: '#1E2228',
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  activeBadgeText: {
    color: theme.colors.background,
    fontSize: 9,
    fontWeight: 'bold',
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  projectInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#16191E',
  },
  projectName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  createCard: {
    width: 140,
    height: 140,
    backgroundColor: '#1E2228',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoSidebar: {
    width: 180,
    backgroundColor: '#16191E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  appTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  versionText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  sidebarLinks: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 8,
  },
  sidebarLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 2,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sidebarLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  deleteProjectBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  namingModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#1E2228',
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
