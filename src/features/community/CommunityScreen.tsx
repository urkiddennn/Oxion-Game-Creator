import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import AuthModal from '../auth/AuthModal';
import GamePlayer from '../rooms/components/GamePlayer';
import { Download, Play, MessageSquare, Heart, Search, UploadCloud, User, Award, Gamepad2, Plus, Trash2, Star, Eye, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

interface CommunityGame {
  id: string;
  title: string;
  author_id?: string;
  author_name: string;
  play_count: number;
  comments_count: number;
  likes: number;
  created_at: string;
  description?: string;
  icon_preview?: {
    type: 'pixel' | 'imported',
    uri?: string,
    pixels?: string[][]
  };
  previews?: string[];
}

export default function CommunityScreen({ navigation }: any) {
  const [games, setGames] = useState<CommunityGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [gameDescription, setGameDescription] = useState('');
  const [selectedGame, setSelectedGame] = useState<CommunityGame | null>(null);
  const { session, user, signOut } = useAuthStore();
  const { projects, selectedProject, fetchRemoteProject, publishProject, selectProject } = useProjectStore();
  const [uploadStage, setUploadStage] = useState<'project' | 'info'>('project');
  const [pickedPreviews, setPickedPreviews] = useState<string[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const [sortTab, setSortTab] = useState<'new' | 'played' | 'hearts'>('new');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGames();
  }, [sortTab]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      let query = supabase.from('games').select('*');

      // Sorting
      if (sortTab === 'played') {
        query = query.order('play_count', { ascending: false });
      } else if (sortTab === 'hearts') {
        query = query.order('likes', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Searching
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedGames = (data || []).map(p => ({
        id: p.id,
        title: p.title || 'Untitled',
        author_id: p.author_id || '',
        author_name: p.author_name || 'Unknown',
        play_count: p.play_count || 0,
        likes: p.likes || 0,
        comments_count: p.comments_count || 0,
        created_at: p.created_at,
        description: p.description,
        icon_preview: p.project_data?.iconPreview,
        previews: p.project_data?.previews || []
      }));

      setGames(formattedGames);
    } catch (err: any) {
      console.error(err);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!session || !user) {
      setAuthModalVisible(true);
      return;
    }
    setUploadStage('project');
    setGameDescription('');
    setPickedPreviews([]);
    setUploadModalVisible(true);
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingProject, setPlayingProject] = useState<any>(null);

  const handlePlay = async (gameId: string) => {
    setLoading(true);
    try {
      // 1. Fetch project data
      const project = await fetchRemoteProject(gameId);
      setPlayingProject(project);
      setIsPlaying(true);
      setSelectedGame(null); // Close details modal when playing starts
      setCreatorModalVisible(false); // Close creator modal if playing started

      // 2. Increment play count in background
      const { error: rpcError } = await supabase.rpc('increment_play_count', { game_id: gameId });

      if (rpcError) {
        // Fallback if RPC doesn't exist
        const { data } = await supabase.from('games').select('play_count').eq('id', gameId).single();
        if (data) {
          await supabase.from('games').update({ play_count: (data.play_count || 0) + 1 }).eq('id', gameId);
        }
      }
    } catch (err: any) {
      Alert.alert('Play Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Creator profile states
  const [creatorModalVisible, setCreatorModalVisible] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState('');
  const [creatorGames, setCreatorGames] = useState<any[]>([]);
  const [loadingCreatorProfile, setLoadingCreatorProfile] = useState(false);

  const handleOpenCreatorProfile = async (authorId: string, authorName: string) => {
    if (!authorId) {
      Alert.alert('Profile Error', 'This creator profile is unavailable.');
      return;
    }
    setCreatorId(authorId);
    setCreatorName(authorName);
    setCreatorModalVisible(true);
    setLoadingCreatorProfile(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(p => ({
        id: p.id,
        title: p.title || 'Untitled',
        author_id: p.author_id,
        author_name: p.author_name || authorName,
        play_count: p.play_count || 0,
        likes: p.likes || 0,
        comments_count: p.comments_count || 0,
        created_at: p.created_at,
        description: p.description,
        icon_preview: p.project_data?.iconPreview,
        previews: p.project_data?.previews || []
      }));

      setCreatorGames(formatted);
    } catch (err: any) {
      console.error('Error fetching creator games:', err);
    } finally {
      setLoadingCreatorProfile(false);
    }
  };

  const handleLike = async (gameId: string) => {
    if (!session || !user) {
      setAuthModalVisible(true);
      return;
    }

    try {
      // Optimistic update
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, likes: g.likes + 1 } : g));
      if (selectedGame?.id === gameId) {
        setSelectedGame({ ...selectedGame, likes: selectedGame.likes + 1 });
      }

      const { data } = await supabase.from('games').select('likes').eq('id', gameId).single();
      if (data) {
        await supabase.from('games').update({ likes: (data.likes || 0) + 1 }).eq('id', gameId);
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const fetchComments = async (gameId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('game_comments')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') { // Table doesn't exist
          setComments([]);
          return;
        }
        throw error;
      }
      setComments(data || []);
    } catch (err) {
      console.warn('Fetch comments error:', err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!session || !user) {
      setAuthModalVisible(true);
      return;
    }
    if (!newComment.trim() || !selectedGame) return;

    const comment = {
      game_id: selectedGame.id,
      author_id: user.id,
      author_name: user.user_metadata?.username || 'Unknown Developer',
      content: newComment.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('game_comments').insert(comment);
      if (error) throw error;

      setComments(prev => [comment, ...prev]);
      setNewComment('');

      // Update comment count in games table
      const { data: gameData } = await supabase.from('games').select('comments_count').eq('id', selectedGame.id).single();
      if (gameData) {
        await supabase.from('games').update({ comments_count: (gameData.comments_count || 0) + 1 }).eq('id', selectedGame.id);
      }
    } catch (err: any) {
      Alert.alert('Comment Error', err.message);
    }
  };

  useEffect(() => {
    if (selectedGame) {
      fetchComments(selectedGame.id);
    }
  }, [selectedGame]);

  const pickPreviewImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPickedPreviews([...pickedPreviews, base64Uri]);
    }
  };

  const confirmUpload = async () => {
    if (!selectedProject) {
      Alert.alert('Selection Required', 'Please select a project to publish.');
      return;
    }
    setUploading(true);
    setUploadModalVisible(false);
    try {
      const result = await publishProject(gameDescription, pickedPreviews);
      if (!result.success) throw new Error(result.error);

      Alert.alert('Success', 'Game uploaded to community!');
      setGameDescription('');
      setPickedPreviews([]);
      fetchGames();
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const renderIcon = (icon: any, size: number = 60) => {
    if (!icon) return <Play color={theme.colors.background} size={size * 0.4} fill={theme.colors.background} opacity={0.3} />;

    if (icon.type === 'imported' && icon.uri) {
      return <Image source={{ uri: icon.uri }} style={{ width: size, height: size, borderRadius: 4 }} />;
    }

    if (icon.pixels) {
      const pixelSize = size / 16;
      return (
        <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
          {icon.pixels.map((row: string[], r: number) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((color, c) => (
                <View key={c} style={{ width: pixelSize, height: pixelSize, backgroundColor: color || 'transparent' }} />
              ))}
            </View>
          ))}
        </View>
      );
    }

    return <Play color={theme.colors.background} size={size * 0.4} fill={theme.colors.background} opacity={0.3} />;
  };

  const renderGameCard = ({ item }: { item: CommunityGame }) => (
    <TouchableOpacity
      style={styles.gameCard}
      activeOpacity={0.8}
      onPress={() => setSelectedGame(item)}
    >
      <View style={styles.gameImagePlaceholder}>
        {renderIcon(item.icon_preview, 50)}
      </View>
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle} numberOfLines={1}>{item.title}</Text>
        <TouchableOpacity
          onPress={() => item.author_id && handleOpenCreatorProfile(item.author_id, item.author_name)}
          activeOpacity={0.7}
          style={{ alignSelf: 'flex-start' }}
        >
          <Text style={styles.gameAuthor} numberOfLines={1}>@{item.author_name}</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Play size={8} color={theme.colors.textMuted} />
            <Text style={styles.statText}>{item.play_count}</Text>
          </View>
          <View style={styles.stat}>
            <Heart size={8} color={item.likes > 0 ? '#ff4b4b' : theme.colors.textMuted} fill={item.likes > 0 ? '#ff4b4b' : 'transparent'} />
            <Text style={[styles.statText, item.likes > 0 && { color: '#ff4b4b' }]}>{item.likes}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.headerTitle}>Community</Text>
            <Text style={styles.headerSubtitle}>Discover & share</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.compactUploadButton, uploading && { opacity: 0.5 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <UploadCloud size={14} color={theme.colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.sortTab, sortTab === 'new' && styles.sortTabActive]}
            onPress={() => setSortTab('new')}
          >
            <Text style={[styles.sortTabText, sortTab === 'new' && styles.sortTabTextActive]}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortTab, sortTab === 'played' && styles.sortTabActive]}
            onPress={() => setSortTab('played')}
          >
            <Text style={[styles.sortTabText, sortTab === 'played' && styles.sortTabTextActive]}>Played</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortTab, sortTab === 'hearts' && styles.sortTabActive]}
            onPress={() => setSortTab('hearts')}
          >
            <Text style={[styles.sortTabText, sortTab === 'hearts' && styles.sortTabTextActive]}>Hearts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={12} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search..."
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchGames}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          key="community-grid-compact"
          data={games}
          keyExtractor={(item) => item.id}
          renderItem={renderGameCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={5}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />

      {/* Enhanced Upload Flow Modal */}
      <Modal visible={uploadModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.uploadModalContent}>
            <Text style={styles.modalTitle}>Publish to Community</Text>

            {uploadStage === 'project' ? (
              <>
                <Text style={styles.modalSubtitle}>Select a project to share:</Text>
                <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
                  {projects.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.projectSelectRow, selectedProject?.id === p.id && styles.projectSelectRowActive]}
                      onPress={() => selectProject(p.name)}
                    >
                      <View style={[styles.projectDot, { backgroundColor: selectedProject?.id === p.id ? theme.colors.primary : theme.colors.textMuted }]} />
                      <Text style={[styles.projectSelectText, selectedProject?.id === p.id && { color: theme.colors.primary }]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {projects.length === 0 && (
                    <Text style={{ color: theme.colors.textMuted, textAlign: 'center', padding: 20 }}>No projects found. Create one first!</Text>
                  )}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setUploadModalVisible(false)}>
                    <Text style={styles.modalBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.publishBtn, !selectedProject && { opacity: 0.5 }]}
                    onPress={() => selectedProject && setUploadStage('info')}
                    disabled={!selectedProject}
                  >
                    <Text style={styles.modalBtnText}>Next Step</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Finalize "{selectedProject?.name}" details:</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="What's this game about? (e.g. Instructions, story, controls)"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={gameDescription}
                  onChangeText={setGameDescription}
                />
                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>Game Preview Pictures (Max 5):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12, minHeight: 90 }}>
                  {pickedPreviews.map((uri, idx) => (
                    <View key={idx} style={styles.pickedPreviewContainer}>
                      <Image source={{ uri }} style={styles.pickedPreviewImage} />
                      <TouchableOpacity
                        style={styles.pickedPreviewDelete}
                        onPress={() => setPickedPreviews(pickedPreviews.filter((_, i) => i !== idx))}
                      >
                        <Trash2 size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {pickedPreviews.length < 5 && (
                    <TouchableOpacity style={styles.addPreviewBtn} onPress={pickPreviewImage}>
                      <Plus size={18} color={theme.colors.primary} />
                      <Text style={{ color: theme.colors.textMuted, fontSize: 8, marginTop: 2 }}>Add Picture</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setUploadStage('project')}>
                    <Text style={styles.modalBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.publishBtn]} onPress={confirmUpload}>
                    <Text style={styles.modalBtnText}>Publish Now</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Game Details Full-Screen Playstore-style Modal */}
      <Modal visible={!!selectedGame} animationType="slide" transparent={false} onRequestClose={() => setSelectedGame(null)}>
        {selectedGame && (
          <View style={styles.detailsModal}>
            <View style={styles.playstoreHeader}>
              <TouchableOpacity
                style={styles.playstoreBackBtn}
                onPress={() => setSelectedGame(null)}
              >
                <ArrowLeft color={theme.colors.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.playstoreHeaderTitle} numberOfLines={1}>{selectedGame.title}</Text>
            </View>

            <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsScrollContent}>
              {/* Play Store App Info Section */}
              <View style={styles.playstoreHero}>
                <View style={styles.playstoreIconContainer}>
                  {renderIcon(selectedGame.icon_preview, 90)}
                </View>
                <View style={styles.playstoreInfo}>
                  <Text style={styles.playstoreTitle}>{selectedGame.title}</Text>
                  <TouchableOpacity
                    onPress={() => selectedGame.author_id && handleOpenCreatorProfile(selectedGame.author_id, selectedGame.author_name)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.playstoreAuthor}>@{selectedGame.author_name}</Text>
                  </TouchableOpacity>
                  <Text style={styles.playstoreCategory}>Oxion Arcade • Free</Text>
                </View>
              </View>

              {/* Play Store Stats Section */}
              <View style={styles.playstoreStatsRow}>
                <TouchableOpacity
                  style={styles.playstoreStatItem}
                  onPress={() => handleLike(selectedGame.id)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Heart size={16} color="#ff4b4b" fill="#ff4b4b" />
                    <Text style={styles.playstoreStatVal}>{selectedGame.likes}</Text>
                  </View>
                  <Text style={styles.playstoreStatLabel}>Likes</Text>
                </TouchableOpacity>

                <View style={styles.playstoreStatDivider} />

                <View style={styles.playstoreStatItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Play size={16} color={theme.colors.primary} fill={theme.colors.primary} />
                    <Text style={styles.playstoreStatVal}>{selectedGame.play_count}</Text>
                  </View>
                  <Text style={styles.playstoreStatLabel}>Plays</Text>
                </View>

                <View style={styles.playstoreStatDivider} />

                <View style={styles.playstoreStatItem}>
                  <Text style={styles.playstoreStatVal}>v1.0.0</Text>
                  <Text style={styles.playstoreStatLabel}>Version</Text>
                </View>
              </View>

              {/* Huge Play/Install Button */}
              <View style={{ paddingHorizontal: 24, marginVertical: 16 }}>
                <TouchableOpacity
                  style={styles.playstoreBigBtn}
                  onPress={() => handlePlay(selectedGame.id)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.background} />
                  ) : (
                    <>
                      <Gamepad2 size={20} color={theme.colors.background} />
                      <Text style={styles.playstoreBigBtnText}>Play Game</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Screenshots Carousel */}
              {selectedGame.previews && selectedGame.previews.length > 0 && (
                <View style={styles.playstoreSection}>
                  <Text style={styles.playstoreSectionTitle}>Screenshots</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 24, paddingBottom: 10 }}>
                    {selectedGame.previews.map((uri: string, idx: number) => (
                      <View key={idx} style={styles.playstoreScreenshotWrapper}>
                        <Image source={{ uri }} style={styles.playstoreScreenshot} resizeMode="cover" />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Description Box */}
              <View style={styles.playstoreSection}>
                <Text style={styles.playstoreSectionTitle}>About this game</Text>
                <Text style={styles.playstoreDescription}>
                  {selectedGame.description || "No description provided for this game. Get ready for an adventure in the Oxion Engine!"}
                </Text>
              </View>

              {/* Reviews and Comments Section */}
              <View style={[styles.playstoreSection, { borderBottomWidth: 0 }]}>
                <View style={styles.commentsHeader}>
                  <MessageSquare size={16} color={theme.colors.text} />
                  <Text style={styles.playstoreSectionTitle}>Ratings & Reviews ({selectedGame.comments_count})</Text>
                </View>

                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a public review..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.postCommentBtn, !newComment.trim() && { opacity: 0.5 }]}
                    onPress={handlePostComment}
                    disabled={!newComment.trim()}
                  >
                    <Text style={styles.postCommentBtnText}>Post</Text>
                  </TouchableOpacity>
                </View>

                {loadingComments ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : comments.length > 0 ? (
                  <View style={styles.commentsList}>
                    {comments.map((c, i) => (
                      <View key={i} style={styles.commentItem}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>@{c.author_name}</Text>
                          <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.commentContent}>{c.content}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.commentPlaceholder}>
                    <Text style={styles.commentPlaceholderText}>No reviews yet. Write the first review!</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Creator Profile Modal */}
      <Modal visible={creatorModalVisible} animationType="slide" transparent={false} onRequestClose={() => setCreatorModalVisible(false)}>
        <View style={styles.detailsModal}>
          <View style={styles.detailsHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCreatorModalVisible(false)}
            >
              <Text style={styles.backButtonText}>← Close Profile</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsScrollContent}>
            {/* Public Profile Card Header */}
            <View style={styles.creatorHeader}>
              <View style={styles.avatarWrapLarge}>
                <Text style={styles.avatarCharLarge}>
                  {creatorName ? creatorName.substring(0, 2).toUpperCase() : 'OX'}
                </Text>
                <View style={styles.onlineBadge} />
              </View>

              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileNameLarge}>@{creatorName}</Text>
                  <View style={styles.badgeLevel}>
                    <Award size={10} color={theme.colors.primary} />
                    <Text style={styles.badgeText}>CREATOR</Text>
                  </View>
                </View>
                <Text style={styles.reputationLabel}>Community Game Creator</Text>
              </View>
            </View>

            {/* Developer Reputation Summary stats */}
            <View style={styles.statsSection}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{creatorGames.length}</Text>
                <Text style={styles.statLabel}>Shared Games</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {creatorGames.reduce((acc, curr) => acc + curr.likes, 0)}
                </Text>
                <Text style={styles.statLabel}>Reputation Hearts</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {creatorGames.reduce((acc, curr) => acc + curr.play_count, 0)}
                </Text>
                <Text style={styles.statLabel}>Total Plays</Text>
              </View>
            </View>

            {/* Creator Portfolio */}
            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
              <Text style={styles.portfolioTitle}>@{creatorName}'s Portfolio</Text>

              {loadingCreatorProfile ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : creatorGames.length === 0 ? (
                <View style={styles.emptyPortfolioCard}>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>No games published yet.</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {creatorGames.map((game) => (
                    <TouchableOpacity
                      key={game.id}
                      style={styles.creatorGameRow}
                      onPress={() => {
                        setCreatorModalVisible(false);
                        setSelectedGame(game);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={styles.iconContainer}>
                          {renderIcon(game.icon_preview, 40)}
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>
                            {game.title}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <Play size={8} color={theme.colors.textMuted} />
                              <Text style={{ color: theme.colors.textMuted, fontSize: 8 }}>{game.play_count}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <Heart size={8} color="#ff4b4b" fill="#ff4b4b" />
                              <Text style={{ color: theme.colors.textMuted, fontSize: 8 }}>{game.likes}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.cardPlayBtn}
                        onPress={() => handlePlay(game.id)}
                      >
                        <Play size={8} color={theme.colors.background} fill={theme.colors.background} />
                        <Text style={{ color: theme.colors.background, fontSize: 8, fontWeight: 'bold' }}>PLAY</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <GamePlayer
        visible={isPlaying}
        onClose={() => setIsPlaying(false)}
        projectOverride={playingProject}
      />
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#0F1115',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    backgroundColor: '#1E2228',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactLoginText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  compactUploadButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#16191E',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sortTabActive: {
    backgroundColor: '#2A2E35',
  },
  sortTabText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  sortTabTextActive: {
    color: theme.colors.primary,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1D23',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: 200,
  },
  searchIcon: {
    marginRight: 6,
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    padding: 0,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  gameCard: {
    flex: 1 / 5,
    backgroundColor: '#1E2228',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
    minWidth: 60,
  },
  gameImagePlaceholder: {
    width: '100%',
    height: 60,
    backgroundColor: '#16191E',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gameInfo: {
    padding: 6,
  },
  gameTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 1,
  },
  gameAuthor: {
    fontSize: 7,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    color: theme.colors.textMuted,
    fontSize: 7,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  playButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    gap: 4,
    marginTop: 6,
  },
  playButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsModal: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  detailsHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#16191E',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsScroll: {
    flex: 1,
  },
  detailsScrollContent: {
    paddingBottom: 40,
  },
  detailsSplitContent: {
    flexDirection: 'row',
    padding: 24,
  },
  detailsLeftCol: {
    width: '30%',
    marginRight: 24,
  },
  detailsRightCol: {
    flex: 1,
  },
  detailsHeroImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1E2228',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.text,
  },
  versionTag: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  versionTagText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsAuthor: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 20,
  },
  descriptionBox: {
    width: '100%',
    backgroundColor: '#1E2228',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  descriptionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    opacity: 0.8,
  },
  detailsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  detailsStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsStatVal: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentsSection: {
    flex: 1,
    marginTop: 12,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  commentInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#16191E',
    borderRadius: 4,
    padding: 8,
    color: theme.colors.text,
    fontSize: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 40,
  },
  postCommentBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 4,
  },
  postCommentBtnText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentsList: {
    gap: 8,
  },
  commentItem: {
    backgroundColor: '#1E2228',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  commentDate: {
    color: theme.colors.textMuted,
    fontSize: 9,
  },
  commentContent: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  commentPlaceholder: {
    flex: 1,
    backgroundColor: '#16191E',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    minHeight: 100,
  },
  commentPlaceholderText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  bigPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 6,
    gap: 10,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bigPlayButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadModalContent: {
    backgroundColor: '#1E2228',
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 20,
  },
  descriptionInput: {
    backgroundColor: '#16191E',
    borderRadius: 4,
    padding: 12,
    color: theme.colors.text,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#2D333B',
  },
  publishBtn: {
    backgroundColor: theme.colors.primary,
  },
  modalBtnText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  projectSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#16191E',
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  projectSelectRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  projectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  projectSelectText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  creatorHeader: {
    flexDirection: 'row',
    backgroundColor: '#16191E',
    borderRadius: 2,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  avatarWrapLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#20242B',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarCharLarge: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileNameLarge: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  reputationLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E2228',
    borderRadius: 2,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  portfolioTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptyPortfolioCard: {
    backgroundColor: '#121418',
    borderRadius: 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  creatorGameRow: {
    flexDirection: 'row',
    backgroundColor: '#1E2228',
    borderRadius: 2,
    padding: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#16191E',
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  cardPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 2,
    gap: 2,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27AE60',
    borderWidth: 1.5,
    borderColor: '#16191E',
  },
  profileDetails: {
    flex: 1,
    marginLeft: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  badgeLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    gap: 2,
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 6,
    fontWeight: '900',
  },
  pickedPreviewContainer: {
    width: 120,
    height: 68,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#16191E',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickedPreviewImage: {
    width: '100%',
    height: '100%',
  },
  pickedPreviewDelete: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPreviewBtn: {
    width: 120,
    height: 68,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16191E',
  },
  playstoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#16191E',
  },
  playstoreBackBtn: {
    marginRight: 16,
    padding: 4,
  },
  playstoreHeaderTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  playstoreHero: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  playstoreIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#16191E',
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playstoreInfo: {
    flex: 1,
    marginLeft: 18,
  },
  playstoreTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  playstoreAuthor: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  playstoreCategory: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  playstoreStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginHorizontal: 24,
    backgroundColor: '#16191E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playstoreStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  playstoreStatVal: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  playstoreStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  playstoreStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  playstoreBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00c853', // Play Store Vibrant green!
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24, // Curved modern pill button
    gap: 10,
    elevation: 4,
    shadowColor: '#00c853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playstoreBigBtnText: {
    color: '#000', // High contrast text on green
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  playstoreSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playstoreSectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  playstoreScreenshotWrapper: {
    width: 200,
    height: 112, // 16:9 ratio
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1E2228',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playstoreScreenshot: {
    width: '100%',
    height: '100%',
  },
  playstoreDescription: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  }
});
