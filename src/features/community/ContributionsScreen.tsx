import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { theme } from '../../theme';
import { Heart, Coffee, AlertCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface Contributor {
  id: string;
  name: string;
  role: string;
}

interface Donator {
  id: string;
  name: string;
  amount: string;
}

export default function ContributionsScreen() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [donators, setDonators] = useState<Donator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [contributorRes, donatorRes] = await Promise.all([
        supabase.from('contributors').select('*').order('created_at', { ascending: true }),
        supabase.from('donators').select('*').order('created_at', { ascending: true })
      ]);

      if (contributorRes.error) throw contributorRes.error;
      if (donatorRes.error) throw donatorRes.error;

      setContributors(contributorRes.data || []);
      setDonators(donatorRes.data || []);
    } catch (err: any) {
      console.error('[Oxion] Error fetching contributions:', err);
      setError(err.message || 'Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading contributors...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <AlertCircle size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Heart size={32} color={theme.colors.primary} />
        <Text style={styles.title}>Contributions</Text>
        <Text style={styles.subtitle}>Thank you for supporting Oxion Game Creator</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contributors</Text>
        <View style={styles.list}>
          {contributors.length > 0 ? contributors.map((c) => (
            <View key={c.id} style={styles.item}>
              <Text style={styles.itemName}>{c.name}</Text>
              <Text style={styles.itemRole}>{c.role}</Text>
            </View>
          )) : (
            <Text style={styles.emptyText}>No contributors listed yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Donations</Text>
        <View style={styles.list}>
          {donators.length > 0 ? donators.map((d) => (
            <View key={d.id} style={styles.item}>
              <Text style={styles.itemName}>{d.name}</Text>
              <Text style={styles.itemRole}>{d.amount} Member</Text>
            </View>
          )) : (
            <Text style={styles.emptyText}>No donations listed yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Want to support the project?</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.donateButton}
            onPress={() => Linking.openURL('https://paypal.me/Urkidden')}
          >
            <Coffee size={18} color={theme.colors.background} />
            <Text style={styles.donateButtonText}>Buy me a coffee</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginTop: 16,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 102, 0.2)',
    paddingBottom: 8,
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,



    borderColor: theme.colors.border,
  },
  itemName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemRole: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 20,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  retryText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#16191E',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  footerText: {
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 2,
    gap: 10,
  },
  donateButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

