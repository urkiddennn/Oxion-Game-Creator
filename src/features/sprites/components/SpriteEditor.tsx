import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { theme } from '../../../theme';
import { Save, X, Eraser, Pencil, PaintBucket, RotateCcw } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';

interface SpriteEditorProps {
  onSave: (pixels: string[][]) => void;
  onCancel: () => void;
}

const PALETTE = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#8B4513',
  '#800080', '#008080', '#006400', '#4B0082', '#FFC0CB', '#7FFFD4'
];

const GRID_SIZE = 16;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
// Calculate pixel size based on available screen height (landscape)
const EDITOR_SIZE = Math.min(SCREEN_HEIGHT * 0.7, 400);
const PIXEL_SIZE = EDITOR_SIZE / GRID_SIZE;

export default function SpriteEditor({ onSave, onCancel }: SpriteEditorProps) {
  const [pixels, setPixels] = useState<string[][]>(
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent'))
  );
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen');

  const pixelsRef = useRef(pixels);
  pixelsRef.current = pixels;

  const updatePixel = (x: number, y: number) => {
    const col = Math.floor(x / PIXEL_SIZE);
    const row = Math.floor(y / PIXEL_SIZE);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      const currentColor = pixelsRef.current[row][col];
      const targetColor = tool === 'eraser' ? 'transparent' : selectedColor;

      if (currentColor !== targetColor) {
        if (tool === 'fill') {
          const newPixels = [...pixelsRef.current.map(r => [...r])];
          fill(newPixels, row, col, currentColor, targetColor);
          setPixels(newPixels);
        } else {
          const newPixels = [...pixelsRef.current.map(r => [...r])];
          newPixels[row][col] = targetColor;
          setPixels(newPixels);
        }
      }
    }
  };

  const fill = (p: string[][], r: number, c: number, target: string, replacement: string) => {
    if (target === replacement) return;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
    if (p[r][c] !== target) return;

    p[r][c] = replacement;
    fill(p, r + 1, c, target, replacement);
    fill(p, r - 1, c, target, replacement);
    fill(p, r, c + 1, target, replacement);
    fill(p, r, c - 1, target, replacement);
  };

  const drawGesture = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      runOnJS(updatePixel)(e.x, e.y);
    })
    .onBegin((e) => {
      runOnJS(updatePixel)(e.x, e.y);
    });

  const renderCheckerboard = () => {
    const cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const isDark = (r + c) % 2 === 1;
        cells.push(
          <View
            key={`check-${r}-${c}`}
            style={{
              position: 'absolute',
              top: r * PIXEL_SIZE,
              left: c * PIXEL_SIZE,
              width: PIXEL_SIZE,
              height: PIXEL_SIZE,
              backgroundColor: isDark ? '#EEE' : '#FFF'
            }}
          />
        );
      }
    }
    return cells;
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainLayout}>
        {/* Left Toolbar */}
        <View style={styles.leftToolbar}>
          <TouchableOpacity onPress={onCancel} style={styles.sidebarAction}>
            <X color={theme.colors.text} size={20} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onSave(pixels)} style={styles.saveButton}>
            <Save color={theme.colors.background} size={20} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.toolIcon, tool === 'pen' && styles.toolActive]}
            onPress={() => setTool('pen')}
          >
            <Pencil color={tool === 'pen' ? theme.colors.primary : theme.colors.text} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolIcon, tool === 'fill' && styles.toolActive]}
            onPress={() => setTool('fill')}
          >
            <PaintBucket color={tool === 'fill' ? theme.colors.primary : theme.colors.text} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolIcon, tool === 'eraser' && styles.toolActive]}
            onPress={() => setTool('eraser')}
          >
            <Eraser color={tool === 'eraser' ? theme.colors.primary : theme.colors.text} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolIcon}
            onPress={() => setPixels(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('transparent')))}
          >
            <RotateCcw color={theme.colors.text} size={18} />
          </TouchableOpacity>
        </View>

        {/* Editor Center */}
        <View style={styles.editorCenter}>
          <GestureDetector gesture={drawGesture}>
            <View style={[styles.gridContainer, { width: EDITOR_SIZE, height: EDITOR_SIZE }]}>
              {renderCheckerboard()}
              {pixels.map((row, r) => (
                <View key={r} style={styles.row}>
                  {row.map((color, c) => (
                    <View
                      key={`${r}-${c}`}
                      style={[
                        styles.pixel,
                        {
                          backgroundColor: color,
                          width: PIXEL_SIZE,
                          height: PIXEL_SIZE
                        }
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </GestureDetector>
        </View>

        {/* Right Palette */}
        <View style={styles.rightPalette}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.paletteContent}>
            {PALETTE.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorSelected
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1115',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftToolbar: {
    width: 50,
    backgroundColor: '#16191E',
    borderRightWidth: 1,
    borderRightColor: '#2E333D',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  sidebarAction: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  divider: {
    width: '50%',
    height: 1,
    backgroundColor: '#2E333D',
    marginBottom: 4,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  editorCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1115',
  },
  rightPalette: {
    width: 50,
    backgroundColor: '#16191E',
    borderLeftWidth: 1,
    borderLeftColor: '#2E333D',
  },
  paletteContent: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  gridContainer: {
    borderWidth: 2,
    borderColor: '#3F4551',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  pixel: {
    borderWidth: 0.2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E2228',
  },
  toolActive: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.15 }],
  },
});
