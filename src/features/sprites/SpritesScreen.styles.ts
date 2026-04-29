import { StyleSheet } from 'react-native';
import { theme } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: 16,
  },
  subtext: {
    ...theme.typography.caption,
    marginTop: 8,
  },
  spriteGrid: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  spriteCard: {
    width: '11.5%', // Approx 8 per row
    aspectRatio: 1,
    backgroundColor: '#1E2228',
    borderRadius: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#16191E',
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spritePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  pixelGridPreview: {
    width: '100%',
    height: '100%',
  },
  pixelRow: {
    flexDirection: 'row',
    flex: 1,
  },
  pixel: {
    flex: 1,
  },
  spriteLabel: {
    display: 'none', // Hide labels in 8-column view to keep it clean
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 250,
    backgroundColor: '#16191E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8,
  },
  menuTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  menuText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
