import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { 
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
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
  debugSidebar: { 
    position: 'absolute', 
    top: 0, 
    right: 0, 
    bottom: 0, 
    width: 250, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    borderLeftWidth: 1, 
    borderLeftColor: 'rgba(255,255,255,0.2)', 
    paddingTop: 80, 
    paddingHorizontal: 15,
    zIndex: 10000 
  },
  debugTitle: { color: '#4facfe', fontSize: 14, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 5, flex: 1 },
  debugSidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  debugCloseBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  debugLabel: { color: '#aaa', fontSize: 10, marginTop: 10 },
  debugValue: { color: '#fff', fontSize: 12, fontFamily: 'monospace' },
  debugVarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  debugVarName: { color: '#44ff44', fontSize: 11 },
  debugVarVal: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  debugScroll: { flex: 1 },
});
