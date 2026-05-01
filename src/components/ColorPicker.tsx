import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { theme } from '../theme';

interface Props {
  color: string;
  onColorChange: (color: string) => void;
}

const PREDEFINED_COLORS = [
  // Grays/Darks
  '#000000', '#1A1A1A', '#2E333D', '#3F4551', '#4A4A4A', '#606060', '#808080', '#A0A0A0', '#C0C0C0', '#E0E0E0', '#FFFFFF',
  // Reds/Pinks
  '#FF0000', '#FF3333', '#FF4D4D', '#FF6666', '#FF8080', '#FF9999', '#FF00FF', '#FF33FF', '#FF66B2', '#FF99CC',
  // Oranges/Yellows
  '#FF4500', '#FF8C00', '#FFA500', '#FFB732', '#FFD700', '#FFFF00', '#FFFF33', '#FFFF66', '#FFFF99', '#FFFFE0',
  // Greens
  '#00FF00', '#32CD32', '#00CC00', '#009900', '#008000', '#006600', '#90EE90', '#98FB98', '#ADFF2F', '#CCFF00',
  // Blues
  '#0000FF', '#1E90FF', '#00BFFF', '#33CCFF', '#66D9FF', '#87CEEB', '#ADD8E6', '#000080', '#0000CD', '#00008B',
  // Purples
  '#800080', '#8A2BE2', '#9370DB', '#9932CC', '#BA55D3', '#DA70D6', '#E6E6FA', '#4B0082', '#483D8B', '#6A5ACD',
  // Earth/Natural
  '#8B4513', '#A0522D', '#D2691E', '#CD853F', '#F4A460', '#DEB887', '#BC8F8F', '#FAEBD7', '#FFF8DC', '#FFE4C4'
];

export const ColorPickerWrapper = ({ color, onColorChange }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Room Background</Text>
      <View style={styles.scrollWrapper}>
        <ScrollView 
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={true}
          indicatorStyle="white"
        >
          {PREDEFINED_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c },
                color.toUpperCase() === c.toUpperCase() && styles.activeSwatch
              ]}
              onPress={() => onColorChange(c)}
            >
              {color.toUpperCase() === c.toUpperCase() && (
                <View style={styles.checkInner} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
  },
  title: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
    textAlign: 'center',
  },
  scrollWrapper: {
    height: 300, // Fixed height for scrollable area
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    paddingBottom: 10,
  },
  swatch: {
    width: 38, // Slightly smaller to fit more
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSwatch: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
    zIndex: 10,
  },
  checkInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
  },
});
