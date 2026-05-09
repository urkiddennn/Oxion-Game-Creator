import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Image, TextInput, Modal, Dimensions } from 'react-native';
import { theme } from '../../theme';
import { supabase } from '../../lib/supabase';
import { BookOpen, Video, Zap, Code, Layout, PlayCircle, Search, X, ExternalLink, Play } from 'lucide-react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  link: string;
  category: 'video' | 'guide' | 'logic' | 'physics';
  created_at: string;
}

const FALLBACK_TUTORIALS: Tutorial[] = [
  {
    id: 'sample-1',
    title: 'Oxion2D Introduction',
    description: 'A quick overview of the engine and its core features.',
    link: 'https://youtu.be/SSSrhsYPtFQ?si=Pl-4d1878dLYWTfe',
    category: 'video',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-2',
    title: 'Advanced Logic Systems',
    description: 'Learn how to build complex game mechanics.',
    link: 'https://youtu.be/PiZ5L0C2f-c?si=T7BHMbuKxkGxRXNw',
    category: 'video',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-3',
    title: 'Physics & Collisions',
    description: 'Master Matter.js and collision groups.',
    link: 'https://youtu.be/PiZ5L0C2f-c',
    category: 'physics',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-4',
    title: 'UI Design Tips',
    description: 'Create responsive HUDs for any screen.',
    link: 'https://docs.oxion.com/ui',
    category: 'guide',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-5',
    title: 'Variables & Data',
    description: 'Using local and global variables efficiently.',
    link: 'https://docs.oxion.com/data',
    category: 'logic',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-6',
    title: 'Animations 101',
    description: 'State machines and frame-perfect animations.',
    link: 'https://youtu.be/SSSrhsYPtFQ',
    category: 'video',
    created_at: new Date().toISOString()
  }
];

export default function TutorialsScreen() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;

      if (data && data.length > 0) {
        setTutorials(data);
      } else {
        setTutorials(FALLBACK_TUTORIALS);
      }
    } catch (err) {
      console.error('[Oxion] Error fetching tutorials:', err);
      setTutorials(FALLBACK_TUTORIALS);
    } finally {
      setLoading(false);
    }
  };

  const filteredTutorials = useMemo(() => {
    if (!searchQuery.trim()) return tutorials;
    return tutorials.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tutorials, searchQuery]);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handlePress = (tutorial: Tutorial) => {
    const videoId = getYoutubeId(tutorial.link);
    if (videoId) {
      setSelectedVideoId(videoId);
    } else {
      Linking.openURL(tutorial.link);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>


        <View style={styles.searchBar}>
          <Search size={14} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tutorials..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {filteredTutorials.map((tutorial) => {
            const videoId = getYoutubeId(tutorial.link);
            return (
              <TouchableOpacity
                key={tutorial.id}
                style={styles.card}
                onPress={() => handlePress(tutorial)}
                activeOpacity={0.7}
              >
                <View style={styles.thumbnailContainer}>
                  {videoId ? (
                    <Image
                      source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderThumbnail}>
                      <BookOpen size={24} color={theme.colors.textMuted} />
                    </View>
                  )}
                  {videoId && (
                    <View style={styles.playOverlay}>
                      <PlayCircle size={32} color="#FFF" fill="rgba(0,0,0,0.3)" />
                    </View>
                  )}
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{tutorial.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{tutorial.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Video Player Modal */}
      <Modal
        visible={!!selectedVideoId}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedVideoId(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setSelectedVideoId(null)}
          />
          <View style={styles.playerContainer}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerTitle}>Oxion Academy</Text>
              <TouchableOpacity onPress={() => setSelectedVideoId(null)}>
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.videoWrapper}>
              {selectedVideoId && (
                <YoutubePlayer
                  height={Dimensions.get('window').width * 0.9 * (9 / 16)}
                  width={Dimensions.get('window').width * 0.9}
                  videoId={selectedVideoId}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#16191E',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  badge: {
    backgroundColor: 'rgba(0, 209, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 209, 255, 0.2)',
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2228',
    borderRadius: 4,
    paddingHorizontal: 10,
    width: 250,
    height: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    marginLeft: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: (Dimensions.get('window').width - 60) / 4,
    backgroundColor: '#1E2228',
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 4,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2D31',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 8,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardDesc: {
    color: theme.colors.textMuted,
    fontSize: 10,
    lineHeight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    ...StyleSheet.absoluteFillObject,
  },
  playerContainer: {
    width: '90%',
    backgroundColor: '#16191E',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E2228',
  },
  playerTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  videoWrapper: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
