import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Box, User, MousePointer2, Timer, Heart, Move, Zap, Layout, Activity } from 'lucide-react-native';
import { theme } from '../../../../theme';

export const BEHAVIORS = [
  { id: 'player', label: 'Player', icon: User, color: '#00D1FF' },
  { id: 'solid', label: 'Solid', icon: Box, color: '#94A3B8' },
  { id: 'enemy', label: 'Enemy', icon: Zap, color: '#FF4444' }, // Added Enemy
  { id: 'button', label: 'Button', icon: MousePointer2, color: '#FF00D1' },
  { id: 'timer', label: 'Timer', icon: Timer, color: '#FFD700' },
  { id: 'health', label: 'Collectible', icon: Heart, color: '#EF4444' },
  { id: 'moveable', label: 'Moveable', icon: Move, color: '#10B981' },
  { id: 'emitter', label: 'Particle Emitter', icon: Zap, color: '#7000FF' },
  { id: 'bullet', label: 'Bullet', icon: Box, color: '#FFA500' }, // Added Bullet
  { id: 'popup', label: 'Pop-up Text', icon: Layout, color: '#94A3B8' },
  { id: 'text', label: 'Text Object', icon: Layout, color: '#FFFFFF' },
  { id: 'progress_bar', label: 'Progress Bar', icon: Activity, color: '#10B981' },
  { id: 'sprite_repeater', label: 'Sprite Repeater', icon: Heart, color: '#F43F5E' },
];

interface ObjectCreatorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBehavior: (behaviorId: string) => void;
}

export default function ObjectCreatorModal({ visible, onClose, onSelectBehavior }: ObjectCreatorModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Object</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.behaviorGrid}>
            {BEHAVIORS.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.behaviorButton}
                onPress={() => onSelectBehavior(b.id)}
              >
                <View style={[styles.behaviorIcon, { backgroundColor: b.color + '20' }]}>
                  <b.icon color={b.color} size={18} />
                </View>
                <Text style={styles.behaviorLabel}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 0,
    width: '100%',
    maxHeight: '100%',
    padding: 0,
    borderWidth: 0,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  closeText: {
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  behaviorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',

    paddingBottom: 32,
    justifyContent: 'center',
  },
  behaviorButton: {
    width: '20%',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  behaviorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  behaviorLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
});
