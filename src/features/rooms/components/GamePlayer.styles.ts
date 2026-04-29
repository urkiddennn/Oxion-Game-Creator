import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { 
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000', 
    zIndex: 9999 
  },
  gameViewport: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#000' 
  },
  canvas: { backgroundColor: '#000', overflow: 'hidden', position: 'relative' },
  instance: { position: 'absolute' },
  topOverlay: { position: 'absolute', top: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, pointerEvents: 'box-none' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  fpsOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, borderRadius: 4 },
  fpsText: { color: '#44ff44', fontSize: 10, fontWeight: 'bold', width: 40 },
  floatingControls: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 30, paddingBottom: 40, pointerEvents: 'box-none' },
  dpad: { flexDirection: 'row', gap: 15 },
  actions: { flexDirection: 'column', alignItems: 'center' },
  floatingBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  jumpBtn: { borderColor: '#4facfe' },
  shootBtn: { borderColor: '#ff4b2b', backgroundColor: 'rgba(255, 75, 43, 0.3)' },
  scoreBoard: { position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  scoreText: { color: '#fff', fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
});
