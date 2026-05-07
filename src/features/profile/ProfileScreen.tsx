import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import AuthModal from '../auth/AuthModal';
import GamePlayer from '../rooms/components/GamePlayer';
import { User, Heart, Play, Trash2, Mail, Calendar, Award, LogOut, ShieldAlert, ChevronRight, Gamepad2, MessageSquare } from 'lucide-react-native';

interface PublishedGame {
  id: string;
  title: string;
  play_count: number;
  likes: number;
  comments_count: number;
  created_at: string;
  description?: string;
  icon_preview?: {
    type: 'pixel' | 'imported',
    uri?: string,
    pixels?: string[][]
  };
}

export default function ProfileScreen() {
  const { session, user, signOut } = useAuthStore();
  const { fetchRemoteProject } = useProjectStore();
  
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [myGames, setMyGames] = useState<PublishedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // For playing games
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingProject, setPlayingProject] = useState<any>(null);
  const [playingLoading, setPlayingLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyGames();
    } else {
      setMyGames([]);
    }
  }, [user]);

  const fetchMyGames = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(p => ({
        id: p.id,
        title: p.title || 'Untitled',
        play_count: p.play_count || 0,
        likes: p.likes || 0,
        comments_count: p.comments_count || 0,
        created_at: p.created_at,
        description: p.description,
        icon_preview: p.project_data?.iconPreview
      }));

      setMyGames(formatted);
    } catch (err: any) {
      console.error('Error fetching developer profile games:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayGame = async (gameId: string) => {
    setPlayingLoading(true);
    try {
      const project = await fetchRemoteProject(gameId);
      setPlayingProject(project);
      setIsPlaying(true);
    } catch (err: any) {
      Alert.alert('Play Error', 'Could not fetch this community game: ' + err.message);
    } finally {
      setPlayingLoading(false);
    }
  };

  const handleUnpublish = (game: PublishedGame) => {
    Alert.alert(
      'Unpublish Game',
      `Are you sure you want to remove "${game.title}" from the community? This will permanently delete it and all its likes/comments from the cloud.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unpublish', 
          style: 'destructive', 
          onPress: () => confirmUnpublish(game.id) 
        }
      ]
    );
  };

  const confirmUnpublish = async (gameId: string) => {
    setDeletingId(gameId);
    try {
      // 1. Delete assets first
      const { error: assetsErr } = await supabase
        .from('game_assets')
        .delete()
        .eq('game_id', gameId);
      
      if (assetsErr) console.warn('Could not delete some assets:', assetsErr.message);

      // 2. Delete comments
      const { error: commentsErr } = await supabase
        .from('game_comments')
        .delete()
        .eq('game_id', gameId);
      
      if (commentsErr) console.warn('Could not delete comments:', commentsErr.message);

      // 3. Delete game row
      const { error: gameErr } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (gameErr) throw gameErr;

      Alert.alert('Success', 'Game has been unpublished from the community.');
      setMyGames(prev => prev.filter(g => g.id !== gameId));
    } catch (err: any) {
      Alert.alert('Unpublish Error', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const totalLikes = myGames.reduce((acc, curr) => acc + curr.likes, 0);
  const totalPlays = myGames.reduce((acc, curr) => acc + curr.play_count, 0);

  const getJoinedDate = () => {
    if (!user?.created_at) return 'N/A';
    return new Date(user.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderIcon = (icon: any, size: number = 50) => {
    if (!icon) return <Gamepad2 color={theme.colors.textMuted} size={size * 0.4} />;

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

    return <Gamepad2 color={theme.colors.textMuted} size={size * 0.4} />;
  };

  const renderMyGameCard = ({ item }: { item: PublishedGame }) => (
    <View style={styles.gameCard}>
      <View style={styles.gameCardLeft}>
        <View style={styles.iconContainer}>
          {renderIcon(item.icon_preview, 44)}
        </View>
        <View style={styles.gameCardMeta}>
          <Text style={styles.gameCardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.gameCardDate}>
            Uploaded {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <View style={styles.statsInlineRow}>
            <View style={styles.inlineStat}>
              <Play size={8} color={theme.colors.primary} />
              <Text style={styles.inlineStatText}>{item.play_count} plays</Text>
            </View>
            <View style={styles.inlineStat}>
              <Heart size={8} color="#FF4B4B" fill="#FF4B4B" />
              <Text style={styles.inlineStatText}>{item.likes} hearts</Text>
            </View>
            <View style={styles.inlineStat}>
              <MessageSquare size={8} color={theme.colors.textMuted} />
              <Text style={styles.inlineStatText}>{item.comments_count} comments</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.gameCardRight}>
        <TouchableOpacity 
          style={styles.cardPlayBtn} 
          onPress={() => handlePlayGame(item.id)}
          disabled={playingLoading}
        >
          <Play size={10} color={theme.colors.background} fill={theme.colors.background} />
          <Text style={styles.cardPlayBtnText}>PLAY</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cardDeleteBtn} 
          onPress={() => handleUnpublish(item)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#F43F5E" />
          ) : (
            <Trash2 size={12} color="#F43F5E" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!session || !user) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedCard}>
          <User size={56} color={theme.colors.primary} style={styles.lockedIcon} />
          <Text style={styles.lockedTitle}>Creator Profiles</Text>
          <Text style={styles.lockedSubtitle}>
            Sign in to claim your Oxion Developer ID, publish games to the cloud, track plays, receive community feedback, and view your stats.
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => setAuthModalVisible(true)}>
            <User size={16} color={theme.colors.background} />
            <Text style={styles.loginBtnText}>SIGN IN / CREATE ACCOUNT</Text>
          </TouchableOpacity>
        </View>
        <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarChar}>
              {user.user_metadata?.username ? user.user_metadata.username.substring(0, 2).toUpperCase() : 'OX'}
            </Text>
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>@{user.user_metadata?.username || 'developer'}</Text>
              <View style={styles.badgeLevel}>
                <Award size={10} color={theme.colors.primary} />
                <Text style={styles.badgeText}>DEVELOPER</Text>
              </View>
            </View>

            <View style={styles.metaInfoRow}>
              <Mail size={10} color={theme.colors.textMuted} />
              <Text style={styles.metaInfoText}>{user.email}</Text>
            </View>
            <View style={styles.metaInfoRow}>
              <Calendar size={10} color={theme.colors.textMuted} />
              <Text style={styles.metaInfoText}>Joined {getJoinedDate()}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
            <LogOut size={14} color="#F43F5E" />
          </TouchableOpacity>
        </View>

        {/* Reputation & Performance Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{myGames.length}</Text>
            <Text style={styles.statLabel}>Published Games</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalPlays}</Text>
            <Text style={styles.statLabel}>Total Plays</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalLikes}</Text>
            <Text style={styles.statLabel}>Hearts Earned</Text>
          </View>
        </View>

        {/* Developer Portfolio / My Games List */}
        <View style={styles.portfolioSection}>
          <Text style={styles.portfolioTitle}>My Creator Portfolio</Text>

          {loading ? (
            <View style={styles.listLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : myGames.length === 0 ? (
            <View style={styles.emptyPortfolioCard}>
              <ShieldAlert size={32} color={theme.colors.textMuted} />
              <Text style={styles.emptyPortfolioText}>No Games Published Yet</Text>
              <Text style={styles.emptyPortfolioSub}>
                Build something awesome and select "Publish to Community" inside the Community or Editor screens to showcase your game here!
              </Text>
            </View>
          ) : (
            <FlatList
              data={myGames}
              keyExtractor={(item) => item.id}
              renderItem={renderMyGameCard}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </ScrollView>

      {/* Game Player overlay */}
      <GamePlayer
        visible={isPlaying}
        onClose={() => setIsPlaying(false)}
        projectOverride={playingProject}
      />

      {playingLoading && (
        <View style={styles.globalLoaderOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.globalLoaderText}>Loading Game Workspace...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 24,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.background,
  },
  lockedCard: {
    backgroundColor: '#16191E',
    borderRadius: 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    maxWidth: 400,
  },
  lockedIcon: {
    marginBottom: 12,
    opacity: 0.9,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  lockedSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    gap: 6,
  },
  loginBtnText: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  profileHeader: {
    flexDirection: 'row',
    backgroundColor: '#16191E',
    borderRadius: 2,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarWrap: {
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
  avatarChar: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.5,
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
  profileName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
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
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  metaInfoText: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  signOutBtn: {
    width: 28,
    height: 28,
    borderRadius: 2,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 6,
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
  portfolioSection: {
    flex: 1,
  },
  portfolioTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  listLoader: {
    padding: 20,
    alignItems: 'center',
  },
  emptyPortfolioCard: {
    backgroundColor: '#121418',
    borderRadius: 2,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  emptyPortfolioText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 6,
    marginBottom: 2,
  },
  emptyPortfolioSub: {
    fontSize: 9,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 13,
  },
  listContent: {
    gap: 4,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: '#1E2228',
    borderRadius: 2,
    padding: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  gameCardMeta: {
    marginLeft: 8,
    flex: 1,
  },
  gameCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.text,
  },
  gameCardDate: {
    fontSize: 8,
    color: theme.colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  statsInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  inlineStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inlineStatText: {
    fontSize: 8,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  gameCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  cardPlayBtnText: {
    color: theme.colors.background,
    fontSize: 8,
    fontWeight: '900',
  },
  cardDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 2,
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  globalLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 17, 21, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  globalLoaderText: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
  },
});
