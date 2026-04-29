import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import AuthModal from '../auth/AuthModal';
import GamePlayer from '../rooms/components/GamePlayer';
import { Download, Play, MessageSquare, Heart, Search, UploadCloud, User } from 'lucide-react-native';

interface CommunityGame {
  id: string;
  title: string;
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
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedGames = (data || []).map(p => ({
        id: p.id,
        title: p.title || 'Untitled',
        author_name: p.author_name || 'Unknown',
        play_count: p.play_count || 0,
        likes: p.likes || 0,
        comments_count: p.comments_count || 0,
        created_at: p.created_at,
        description: p.description,
        icon_preview: p.project_data?.iconPreview
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

  const confirmUpload = async () => {
    if (!selectedProject) {
      Alert.alert('Selection Required', 'Please select a project to publish.');
      return;
    }
    setUploading(true);
    setUploadModalVisible(false);
    try {
      const result = await publishProject(gameDescription);
      if (!result.success) throw new Error(result.error);

      Alert.alert('Success', 'Game uploaded to community!');
      setGameDescription('');
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
        {renderIcon(item.icon_preview)}
      </View>
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle}>{item.title}</Text>
        <Text style={styles.gameAuthor}>by @{item.author_name}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Play size={12} color={theme.colors.textMuted} />
            <Text style={styles.statText}>{item.play_count}</Text>
          </View>
          <TouchableOpacity 
            style={styles.stat}
            onPress={(e) => {
              e.stopPropagation();
              handleLike(item.id);
            }}
          >
            <Heart size={12} color={item.likes > 0 ? '#ff4b4b' : theme.colors.textMuted} fill={item.likes > 0 ? '#ff4b4b' : 'transparent'} />
            <Text style={[styles.statText, item.likes > 0 && { color: '#ff4b4b' }]}>{item.likes}</Text>
          </TouchableOpacity>
          <View style={styles.stat}>
            <MessageSquare size={12} color={theme.colors.textMuted} />
            <Text style={styles.statText}>{item.comments_count}</Text>
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

      <View style={styles.searchContainer}>
        <Search size={14} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search games..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          renderItem={renderGameCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={1}
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

      {/* Game Details Full-Screen Native Modal */}
      <Modal visible={!!selectedGame} animationType="slide" transparent={false} onRequestClose={() => setSelectedGame(null)}>
        {selectedGame && (
          <View style={styles.detailsModal}>
            <View style={styles.detailsHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedGame(null)}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsScrollContent}>
              <View style={styles.detailsSplitContent}>
                {/* Left Column: Preview & Play */}
                <View style={styles.detailsLeftCol}>
                  <View style={styles.detailsHeroImage}>
                    <Play color={theme.colors.primary} size={60} fill={theme.colors.primary} opacity={0.1} />
                  </View>

                  <TouchableOpacity
                    style={styles.bigPlayButton}
                    onPress={() => handlePlay(selectedGame.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={theme.colors.background} />
                    ) : (
                      <>
                        <Play size={20} color={theme.colors.background} fill={theme.colors.background} />
                        <Text style={styles.bigPlayButtonText}>PLAY</Text>
                      </>
                    )}
                  </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.detailsStatItem}
                      onPress={() => handleLike(selectedGame.id)}
                    >
                      <Heart size={14} color={'#ff4b4b'} fill={'#ff4b4b'} />
                      <Text style={styles.detailsStatVal}>{selectedGame.likes}</Text>
                    </TouchableOpacity>
                    <View style={styles.detailsStatItem}>
                      <Play size={14} color={theme.colors.primary} />
                      <Text style={styles.detailsStatVal}>{selectedGame.play_count}</Text>
                    </View>
                  </View>

                {/* Right Column: Info & Social */}
                <View style={styles.detailsRightCol}>
                  <View style={styles.detailsTitleRow}>
                    <Text style={styles.detailsTitle}>{selectedGame.title}</Text>
                    <View style={styles.versionTag}>
                      <Text style={styles.versionTagText}>v1.0.0</Text>
                    </View>
                  </View>
                  <Text style={styles.detailsAuthor}>Created by @{selectedGame.author_name}</Text>

                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>
                      {selectedGame.description || "No description provided for this game. Get ready for an adventure in the Oxion Engine!"}
                    </Text>
                  </View>

                  <View style={styles.commentsSection}>
                    <View style={styles.commentsHeader}>
                      <MessageSquare size={14} color={theme.colors.text} />
                      <Text style={styles.commentsTitle}>Comments ({selectedGame.comments_count})</Text>
                    </View>

                    <View style={styles.commentInputContainer}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
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
                        <Text style={styles.commentPlaceholderText}>No comments yet. Be the first!</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    backgroundColor: '#1E2228',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactLoginText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  compactUploadButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16191E',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: '#1E2228',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  gameImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#16191E',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gameInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  gameTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  gameAuthor: {
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: -2,
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
});
