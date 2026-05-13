import React, { useState, useRef, useMemo } from 'react';
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
const EDITOR_SIZE = Math.min(SCREEN_HEIGHT * 0.7, 400);
const PIXEL_SIZE = EDITOR_SIZE / GRID_SIZE;

// --- High Performance Color Packing/Unpacking ---
const hexToUint32 = (hex: string): number => {
  if (hex === 'transparent' || !hex) return 0;
  const cleanHex = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return (r << 24) | (g << 16) | (b << 8) | 255;
};

const uint32ToHexCache = new Map<number, string>();

const uint32ToHex = (val: number): string => {
  if (val === 0) return 'transparent';
  let cached = uint32ToHexCache.get(val);
  if (cached) return cached;

  const r = (val >>> 24) & 0xFF;
  const g = (val >>> 16) & 0xFF;
  const b = (val >>> 8) & 0xFF;
  const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  uint32ToHexCache.set(val, hex);
  return hex;
};

export default function SpriteEditor({ onSave, onCancel }: SpriteEditorProps) {
  const [pixels, setPixels] = useState<Uint32Array>(() => new Uint32Array(GRID_SIZE * GRID_SIZE));
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen');

  const pixelsRef = useRef(pixels);
  pixelsRef.current = pixels;

  const updatePixel = (x: number, y: number) => {
    const col = Math.floor(x / PIXEL_SIZE);
    const row = Math.floor(y / PIXEL_SIZE);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      const idx = row * GRID_SIZE + col;
      const currentColorVal = pixelsRef.current[idx];
      const targetColorVal = tool === 'eraser' ? 0 : hexToUint32(selectedColor);

      if (currentColorVal !== targetColorVal) {
        if (tool === 'fill') {
          const newPixels = new Uint32Array(pixelsRef.current);
          fill(newPixels, row, col, currentColorVal, targetColorVal);
          setPixels(newPixels);
        } else {
          // Mutate in-place for fast draw sequences, trigger React re-render by copy
          pixelsRef.current[idx] = targetColorVal;
          setPixels(new Uint32Array(pixelsRef.current));
        }
      }
    }
  };

  const fill = (p: Uint32Array, r: number, c: number, target: number, replacement: number) => {
    if (target === replacement) return;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
    if (p[r * GRID_SIZE + c] !== target) return;

    p[r * GRID_SIZE + c] = replacement;
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

  const handleSave = () => {
    const out: string[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: string[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(uint32ToHex(pixels[r * GRID_SIZE + c]));
      }
      out.push(row);
    }
    onSave(out);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainLayout}>
        {/* Left Toolbar */}
        <View style={styles.leftToolbar}>
          <TouchableOpacity onPress={onCancel} style={styles.sidebarAction}>
            <X color={theme.colors.text} size={20} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
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
            onPress={() => setPixels(new Uint32Array(GRID_SIZE * GRID_SIZE))}
          >
            <RotateCcw color={theme.colors.text} size={18} />
          </TouchableOpacity>
        </View>

        {/* Editor Center */}
        <View style={styles.editorCenter}>
          <GestureDetector gesture={drawGesture}>
            <View style={[styles.gridContainer, { width: EDITOR_SIZE, height: EDITOR_SIZE }]}>
              {renderCheckerboard()}
              {Array.from({ length: GRID_SIZE }).map((_, r) => (
                <View key={r} style={styles.row}>
                  {Array.from({ length: GRID_SIZE }).map((_, c) => {
                    const colorVal = pixels[r * GRID_SIZE + c];
                    const color = uint32ToHex(colorVal);
                    return (
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
                    );
                  })}
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
