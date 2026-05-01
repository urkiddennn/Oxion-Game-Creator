import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { X, Image as ImageIcon, Film, ArrowLeft, ArrowRight, Pause, ArrowUp, Layout, Zap, Settings, Activity, ChevronUp, MousePointer2, Bolt, Clock, GitBranch } from 'lucide-react-native';
import ObjectCreatorModal from './modals/ObjectCreatorModal';
import ObjectInspectorModal from './modals/ObjectInspectorModal';
import { theme } from '../../../theme';

export default function ObjectModals({
  createModalVisible, setCreateModalVisible,
  inspectorVisible, setInspectorVisible,
  spritePickerVisible, setSpritePickerVisible,
  animationPickerVisible, setAnimationPickerVisible,
  actionPickerVisible, setActionPickerVisible,
  eventPickerVisible, setEventPickerVisible,
  propertyPickerVisible, setPropertyPickerVisible,
  statePickerVisible, setStatePickerVisible,
  selectedObject, setSelectedObject,
  currentProject, updateObject, handleCreateObject, renderSpritePreview,
  // Logic states/handlers
  activeListenerIndex, setActiveListenerIndex,
  activeSubIndex, setActiveSubIndex,
  activePropertyIndex, setActivePropertyIndex,
  handleActionSelect, handleEventSelect, handlePropertySelect,
  pickingForCondition, pickingForEngineState, setPickingForEngineState
}: any) {
  return (
    <>
      <ObjectCreatorModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSelectBehavior={handleCreateObject}
      />

      <ObjectInspectorModal
        visible={inspectorVisible}
        onClose={() => setInspectorVisible(false)}
        selectedObject={selectedObject}
        setSelectedObject={setSelectedObject}
        currentProject={currentProject}
        updateObject={updateObject}
        setSpritePickerVisible={setSpritePickerVisible}
        setAnimationPickerVisible={setAnimationPickerVisible}
        setActionPickerVisible={setActionPickerVisible}
        setEventPickerVisible={setEventPickerVisible}
        setPropertyPickerVisible={setPropertyPickerVisible}
        statePickerVisible={statePickerVisible}
        setStatePickerVisible={setStatePickerVisible}
        pickingForEngineState={pickingForEngineState}
        setPickingForEngineState={setPickingForEngineState}
        renderSpritePreview={renderSpritePreview}
        // Pass back the indices for the pickers to use
        activeListenerIndex={activeListenerIndex}
        setActiveListenerIndex={setActiveListenerIndex}
        activeSubIndex={activeSubIndex}
        setActiveSubIndex={setActiveSubIndex}
        activePropertyIndex={activePropertyIndex}
        setActivePropertyIndex={setActivePropertyIndex}
      />

      {/* Sprite Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={spritePickerVisible}
        onRequestClose={() => setSpritePickerVisible(false)}
      >
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setSpritePickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => (e as any).stopPropagation?.()} style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sprite</Text>
              <TouchableOpacity onPress={() => setSpritePickerVisible(false)}>
                <X color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.pickerGrid}>
                {currentProject?.sprites.map((sprite: any) => (
                  <TouchableOpacity
                    key={sprite.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      if (!selectedObject) return;
                      if ((global as any).lastSpritePickerCallback) {
                        (global as any).lastSpritePickerCallback(sprite.id);
                        return;
                      }
                      const appearance = selectedObject.appearance || { spriteId: null, animationSpeed: 100 };
                      updateObject(selectedObject.id, { appearance: { ...appearance, spriteId: sprite.id } });
                      setSelectedObject({ ...selectedObject, appearance: { ...appearance, spriteId: sprite.id } });
                      setSpritePickerVisible(false);
                    }}
                  >
                    <View style={styles.pickerPreview}>
                      {renderSpritePreview(sprite.id, 40)}
                    </View>
                    <Text style={styles.pickerLabel} numberOfLines={1}>{sprite.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Animation Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={animationPickerVisible}
        onRequestClose={() => setAnimationPickerVisible(false)}
      >
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setAnimationPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => (e as any).stopPropagation?.()} style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Animation</Text>
              <TouchableOpacity onPress={() => setAnimationPickerVisible(false)}>
                <X color={theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.pickerGrid}>
                {currentProject?.animations?.map((anim: any) => (
                  <TouchableOpacity
                    key={anim.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      if (!selectedObject) return;
                      const appearance = selectedObject.appearance || { type: 'sprite', spriteId: null, animationId: null, animationSpeed: 100 };
                      updateObject(selectedObject.id, { appearance: { ...appearance, animationId: anim.id, type: 'animation' } });
                      setSelectedObject({ ...selectedObject, appearance: { ...appearance, animationId: anim.id, type: 'animation' } });
                      setAnimationPickerVisible(false);
                    }}
                  >
                    <View style={styles.pickerPreview}>
                      <Film size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.pickerLabel} numberOfLines={1}>{anim.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Event Picker Modal */}
      <Modal visible={eventPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setEventPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => (e as any).stopPropagation?.()} style={[styles.pickerContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Event Trigger</Text>
              <TouchableOpacity onPress={() => setEventPickerVisible(false)}>
                <X color={theme.colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.subSectionTitleCompact}>Logic Flow Templates</Text>
              <View style={[styles.pickerRowSmall, { flexWrap: 'wrap', marginBottom: 12, paddingHorizontal: 10 }]}>
                {[
                  { id: 'if', label: 'IF THEN', icon: GitBranch },
                  { id: 'if_else', label: 'IF ELSE', icon: GitBranch },
                  { id: 'wait_until', label: 'WAIT UNTIL', icon: Clock },
                ].map(t => (
                  <TouchableOpacity key={t.id} style={[styles.pickerChip, { backgroundColor: '#1A1D23', minWidth: 80 }]} onPress={() => {
                    if (handleEventSelect) handleEventSelect(t.id);
                    else if ((global as any).handleEventSelect) (global as any).handleEventSelect(t.id);
                    setEventPickerVisible(false);
                  }}>
                    <t.icon size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.pickerChipText, { color: theme.colors.primary, fontSize: 9 }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Engine Events</Text>
              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleEventSelect) handleEventSelect('on_tick');
                  else if ((global as any).handleEventSelect) (global as any).handleEventSelect('on_tick');
                  setEventPickerVisible(false);
                }}
              >
                <Activity size={14} color={theme.colors.primary} />
                <Text style={[styles.actionPresetText, { fontWeight: 'bold', color: theme.colors.primary }]}>Every Frame (on tick)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleEventSelect) handleEventSelect('on_start');
                  else if ((global as any).handleEventSelect) (global as any).handleEventSelect('on_start');
                  setEventPickerVisible(false);
                }}
              >
                <Zap size={14} color={theme.colors.secondary} />
                <Text style={[styles.actionPresetText, { fontWeight: 'bold', color: theme.colors.secondary }]}>On Start (once)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleEventSelect) handleEventSelect('on_timer:1000');
                  else if ((global as any).handleEventSelect) (global as any).handleEventSelect('on_timer:1000');
                  setEventPickerVisible(false);
                }}
              >
                <Clock size={14} color={theme.colors.warning} />
                <Text style={[styles.actionPresetText, { color: theme.colors.warning }]}>Timer (every 1 second)</Text>
              </TouchableOpacity>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Built-in Movements</Text>
              {[
                { id: 'builtin_jump', label: 'When Player Jumps' },
                { id: 'builtin_left', label: 'When Player Moves Left' },
                { id: 'builtin_right', label: 'When Player Moves Right' },
                { id: 'builtin_tap', label: 'When Screen Tapped' },
                { id: 'on_screen_tap', label: 'On Screen Tap (Global)' },
                { id: 'on_release', label: 'On Object Release' },
                { id: 'wait_until:', label: 'Wait Until (Condition)' },
              ].map(ev => (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.actionPresetItem}
                  onPress={() => {
                    if (handleEventSelect) handleEventSelect(ev.id);
                    else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                    setEventPickerVisible(false);
                  }}
                >
                  {ev.id === 'builtin_jump' && <ChevronUp size={14} color={theme.colors.primary} />}
                  {ev.id === 'builtin_left' && <ArrowLeft size={14} color={theme.colors.primary} />}
                  {ev.id === 'builtin_right' && <ArrowRight size={14} color={theme.colors.primary} />}
                  {ev.id === 'builtin_tap' && <MousePointer2 size={14} color={theme.colors.primary} />}
                  {ev.id === 'on_screen_tap' && <MousePointer2 size={14} color={theme.colors.secondary} />}
                  {ev.id === 'on_release' && <Pause size={14} color={theme.colors.error} />}
                  <Text style={styles.actionPresetText}>{ev.label}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Collisions & Interactions</Text>
              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleEventSelect) handleEventSelect('on_collision');
                  else if ((global as any).handleEventSelect) (global as any).handleEventSelect('on_collision');
                  setEventPickerVisible(false);
                }}
              >
                <Bolt size={14} color="#FFAC00" />
                <Text style={styles.actionPresetText}>On Any Collision</Text>
              </TouchableOpacity>

              <Text style={[styles.subSectionTitleCompact, { marginTop: 12, marginBottom: 8, fontSize: 11, opacity: 0.8 }]}>When hitting specific Object:</Text>
              <View style={styles.pickerGrid}>
                {(currentProject?.objects || []).map((obj: any) => (
                  <TouchableOpacity
                    key={obj.id}
                    style={styles.objectPickerItemSmall}
                    onPress={() => {
                      if (handleEventSelect) handleEventSelect(`collision:${obj.name}`);
                      else if ((global as any).handleEventSelect) (global as any).handleEventSelect(`collision:${obj.name}`);
                      setEventPickerVisible(false);
                    }}
                  >
                    <View style={styles.objectPickerSpriteBox}>
                      {renderSpritePreview(obj.appearance?.spriteId, 32)}
                    </View>
                    <Text style={styles.objectPickerNameSmall} numberOfLines={1}>{obj.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Dynamic Comparisons (WHEN ...)</Text>
              <View style={styles.pickerRowSmall}>
                {['self.x', 'self.y', 'self.width', 'self.height', 'room_width', 'room_height'].map(p => (
                  <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#111' }]} onPress={() => {
                    if (handleEventSelect) handleEventSelect(p + ' > ');
                    else if ((global as any).handleEventSelect) (global as any).handleEventSelect(p + ' > ');
                    setEventPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipText, { color: theme.colors.warning }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Project Variables (Global)</Text>
              <View style={styles.pickerRowSmall}>
                {Object.keys(currentProject?.variables?.global || {}).map(v => (
                  <TouchableOpacity key={v} style={styles.pickerChip} onPress={() => {
                    const val = `Global.${v}`;
                    if (handleEventSelect) handleEventSelect(val);
                    else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                    setEventPickerVisible(false);
                  }}>
                    <Text style={styles.pickerChipText}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Object Comparison Triggers</Text>
              {(currentProject?.objects || []).filter((o: any) => o.id !== selectedObject?.id).map((obj: any) => (
                <View key={obj.id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ width: 16, height: 16, backgroundColor: '#111', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
                      {renderSpritePreview(obj.appearance?.spriteId, 14)}
                    </View>
                    <Text style={styles.miniLabel}>{obj.name?.toUpperCase()}</Text>
                  </View>
                  <View style={styles.pickerRowSmall}>
                    {['x', 'y', 'width', 'height'].map(p => (
                      <TouchableOpacity key={p} style={styles.pickerChipSecondary} onPress={() => {
                        const val = `${obj.name}.${p} > `;
                        if (handleEventSelect) handleEventSelect(val);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                        setEventPickerVisible(false);
                      }}>
                        <Text style={styles.pickerChipTextSmall}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Math & Operators (WHEN ...)</Text>
              <View style={styles.pickerRowSmall}>
                {['>', '<', '==', '!=', '>=', '<=', '+', '-', '*', '/', '^', '%'].map(op => (
                  <TouchableOpacity key={op} style={[styles.pickerChip, { backgroundColor: theme.colors.surfaceElevated }]} onPress={() => {
                    if (handleEventSelect) handleEventSelect(op);
                    else if ((global as any).handleEventSelect) (global as any).handleEventSelect(op);
                    setEventPickerVisible(false);
                  }}>
                    <Text style={styles.pickerChipText}>{op}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.pickerRowSmall}>
                {['clamp(', 'min(', 'max(', 'abs(', 'floor(', 'random('].map(p => (
                  <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#0A0C10' }]} onPress={() => {
                    if (handleEventSelect) handleEventSelect(p);
                    else if ((global as any).handleEventSelect) (global as any).handleEventSelect(p);
                    setEventPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipText, { color: theme.colors.secondary }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Object Properties</Text>
              <View style={styles.pickerRowSmall}>
                {['self', 'other', 'tap_x', 'tap_y', 'room_width', 'room_height', 'time'].map(p => (
                  <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#111' }]} onPress={() => {
                    const val = (p === 'self' || p === 'other') ? p + '.' : p;
                    if (handleEventSelect) handleEventSelect(val);
                    else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                    setEventPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipText, { color: theme.colors.primary }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Property Picker Modal */}
      <Modal visible={propertyPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPropertyPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => (e as any).stopPropagation?.()} style={[styles.pickerContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Insert Property / Variable</Text>
              <TouchableOpacity onPress={() => setPropertyPickerVisible(false)}>
                <X color={theme.colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.subSectionTitleCompact}>Dynamic References</Text>
              <View style={styles.pickerRowSmall}>
                {['self', 'other'].map(p => (
                  <TouchableOpacity key={p} style={[styles.pickerChip, { borderColor: theme.colors.primary }]} onPress={() => {
                    if (handlePropertySelect) handlePropertySelect(p + '.');
                    else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(p + '.');
                    setPropertyPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipText, { color: theme.colors.primary }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Current Object (this/self)</Text>
              <View style={styles.pickerRowSmall}>
                {['x', 'y', 'vx', 'vy', 'width', 'height', 'health', 'angle', 'scale'].map(p => (
                  <TouchableOpacity key={p} style={styles.pickerChip} onPress={() => {
                    const val = `self.${p}`;
                    if (handlePropertySelect) handlePropertySelect(val);
                    else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(val);
                    setPropertyPickerVisible(false);
                  }}>
                    <Text style={styles.pickerChipText}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Room & Environment</Text>
              <View style={styles.pickerRowSmall}>
                {['room_width', 'room_height', 'time', 'tap_x', 'tap_y'].map(p => (
                  <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#111' }]} onPress={() => {
                    if (handlePropertySelect) handlePropertySelect(p);
                    else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(p);
                    setPropertyPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipText, { color: theme.colors.warning }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Logic & Math</Text>
              <View style={styles.pickerRowSmall}>
                {['clamp(', 'min(', 'max(', 'abs(', 'floor(', 'random('].map(p => (
                  <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#0A0C10' }]} onPress={() => {
                    if (handlePropertySelect) handlePropertySelect(p);
                    else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(p);
                    setPropertyPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipText, { color: theme.colors.secondary }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Operators</Text>
              <View style={styles.pickerRowSmall}>
                {['>', '<', '==', '!=', '>=', '<=', '+', '-', '*', '/', '^', '%'].map(op => (
                  <TouchableOpacity key={op} style={[styles.pickerChip, { backgroundColor: theme.colors.surfaceElevated }]} onPress={() => {
                    if (handlePropertySelect) handlePropertySelect(op);
                    else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(op);
                    setPropertyPickerVisible(false);
                  }}>
                    <Text style={styles.pickerChipText}>{op}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Project Variables</Text>
              <View style={styles.pickerRowSmall}>
                {Object.keys(currentProject?.variables?.global || {}).map(v => (
                  <TouchableOpacity key={v} style={styles.pickerChip} onPress={() => {
                    const val = `Global.${v}`;
                    if (handlePropertySelect) handlePropertySelect(val);
                    else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(val);
                    setPropertyPickerVisible(false);
                  }}>
                    <Text style={styles.pickerChipText}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(currentProject?.objects || []).filter((o: any) => o.id !== selectedObject?.id).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Other Project Objects</Text>
                  {(currentProject?.objects || []).filter((o: any) => o.id !== selectedObject?.id).map((obj: any) => {
                    const displayName = obj.name || obj.behavior || 'Unnamed Object';
                    const targetId = obj.name || obj.behavior || obj.id;
                    return (
                      <View key={obj.id} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <View style={{ width: 16, height: 16, backgroundColor: '#111', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
                            {renderSpritePreview(obj.appearance?.spriteId, 14)}
                          </View>
                          <Text style={[styles.miniLabel, { color: theme.colors.primary, marginBottom: 0 }]}>{displayName.toUpperCase()}</Text>
                        </View>
                        <View style={styles.pickerRowSmall}>
                          {['x', 'y', 'vx', 'vy', 'width', 'height', 'health', 'scale'].map(p => (
                            <TouchableOpacity key={p} style={styles.pickerChipSecondary} onPress={() => {
                              if (handlePropertySelect) handlePropertySelect(`${targetId}.${p}`);
                              else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(`${targetId}.${p}`);
                              setPropertyPickerVisible(false);
                            }}>
                              <Text style={styles.pickerChipTextSmall}>{p.toUpperCase()}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={[styles.pickerRowSmall, { marginTop: 4 }]}>
                          {['physics.ignoreCollision', 'physics.isStatic', 'visible'].map(p => {
                            const label = p.includes('ignoreCollision') ? 'SOLID' : p.split('.')[1]?.toUpperCase() || p.toUpperCase();
                            const val = p.includes('ignoreCollision') ? `!${targetId}.${p}` : `${targetId}.${p}`;
                            return (
                              <TouchableOpacity key={p} style={[styles.pickerChipSecondary, { backgroundColor: '#111' }]} onPress={() => {
                                if (handlePropertySelect) handlePropertySelect(val);
                                else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(val);
                                setPropertyPickerVisible(false);
                              }}>
                                <Text style={[styles.pickerChipTextSmall, { color: theme.colors.secondary }]}>{label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Action Picker Modal */}
      <Modal visible={actionPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setActionPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => (e as any).stopPropagation?.()} style={[styles.pickerContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Action</Text>
              <TouchableOpacity onPress={() => setActionPickerVisible(false)}>
                <X color={theme.colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.subSectionTitleCompact}>Presets</Text>
              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleActionSelect) handleActionSelect('tap_x');
                  else if ((global as any).handleActionSelect) (global as any).handleActionSelect('tap_x');
                  setActionPickerVisible(false);
                }}
              >
                <MousePointer2 size={14} color={theme.colors.warning} />
                <Text style={styles.actionPresetText}>Tap X Position</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleActionSelect) handleActionSelect('tap_y');
                  else if ((global as any).handleActionSelect) (global as any).handleActionSelect('tap_y');
                  setActionPickerVisible(false);
                }}
              >
                <MousePointer2 size={14} color={theme.colors.warning} />
                <Text style={styles.actionPresetText}>Tap Y Position</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleActionSelect) handleActionSelect('jump');
                  else if ((global as any).handleActionSelect) (global as any).handleActionSelect('jump');
                  setActionPickerVisible(false);
                }}
              >
                <ChevronUp size={14} color={theme.colors.primary} />
                <Text style={styles.actionPresetText}>Jump</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleActionSelect) handleActionSelect('move_left');
                  else if ((global as any).handleActionSelect) (global as any).handleActionSelect('move_left');
                  setActionPickerVisible(false);
                }}
              >
                <ArrowLeft size={14} color={theme.colors.secondary} />
                <Text style={styles.actionPresetText}>Move Left</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleActionSelect) handleActionSelect('move_right');
                  else if ((global as any).handleActionSelect) (global as any).handleActionSelect('move_right');
                  setActionPickerVisible(false);
                }}
              >
                <ArrowRight size={14} color={theme.colors.secondary} />
                <Text style={styles.actionPresetText}>Move Right</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => {
                  if (handleActionSelect) handleActionSelect('stop_x');
                  else if ((global as any).handleActionSelect) (global as any).handleActionSelect('stop_x');
                  setActionPickerVisible(false);
                }}
              >
                <Pause size={14} color={theme.colors.error} />
                <Text style={styles.actionPresetText}>Stop Horizontal</Text>
              </TouchableOpacity>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Global Variables (Game-wide)</Text>
              {Object.keys(currentProject?.variables?.global || {}).map(v => (
                <View key={v} style={{ marginBottom: 12 }}>
                  <Text style={[styles.miniLabel, { color: theme.colors.primary }]}>{v.toUpperCase()}</Text>
                  <View style={styles.pickerRowSmall}>
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => {
                      if (handleActionSelect) handleActionSelect(`var_add:${v}:1`);
                      else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`var_add:${v}:1`);
                      setActionPickerVisible(false);
                    }}>
                      <Text style={styles.pickerChipTextSmall}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => {
                      if (handleActionSelect) handleActionSelect(`var_add:${v}:-1`);
                      else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`var_add:${v}:-1`);
                      setActionPickerVisible(false);
                    }}>
                      <Text style={styles.pickerChipTextSmall}>-1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => {
                      if (handleActionSelect) handleActionSelect(`var_set:${v}:0`);
                      else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`var_set:${v}:0`);
                      setActionPickerVisible(false);
                    }}>
                      <Text style={styles.pickerChipTextSmall}>SET 0</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Movement & Rotation</Text>
              <View style={styles.pickerRowSmall}>
                {['add_x:1', 'add_x:-1', 'add_y:1', 'add_y:-1', 'add_angle:5', 'add_angle:-5', 'set_scale:1.5', 'add_scale:0.1'].map(act => (
                  <TouchableOpacity key={act} style={styles.pickerChipSecondary} onPress={() => {
                    if (handleActionSelect) handleActionSelect(act);
                    else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act);
                    setActionPickerVisible(false);
                  }}>
                    <Text style={styles.pickerChipTextSmall}>{act.toUpperCase().replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Scene Control</Text>
              <View style={styles.pickerRowSmall}>
                <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => {
                  if (handleActionSelect) handleActionSelect('restart_room');
                  else if ((global as any).handleActionSelect) (global as any).handleActionSelect('restart_room');
                  setActionPickerVisible(false);
                }}>
                  <Text style={styles.pickerChipTextSmall}>RESTART ROOM</Text>
                </TouchableOpacity>
                {(currentProject?.rooms || []).map((room: any) => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.pickerChipSecondary}
                    onPress={() => {
                      if (handleActionSelect) handleActionSelect(`go_to_room:${room.name}`);
                      else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`go_to_room:${room.name}`);
                      setActionPickerVisible(false);
                    }}
                  >
                    <Text style={styles.pickerChipTextSmall}>GO TO {room.name?.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Spawn Objects</Text>
              <View style={styles.pickerGrid}>
                {(currentProject?.objects || []).map((obj: any) => (
                  <TouchableOpacity
                    key={obj.id}
                    style={styles.objectPickerItemSmall}
                    onPress={() => {
                      if (handleActionSelect) handleActionSelect(`create_instance:${obj.id}:0:0`);
                      else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`create_instance:${obj.id}:0:0`);
                      setActionPickerVisible(false);
                    }}
                  >
                    <View style={styles.objectPickerSpriteBox}>
                      {renderSpritePreview(obj.appearance?.spriteId, 32)}
                    </View>
                    <Text style={styles.objectPickerNameSmall} numberOfLines={1}>SPAWN {obj.name?.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Math & Expressions</Text>
              <View style={styles.pickerRowSmall}>
                {['random(10)', 'clamp(0,0,0)', 'min(0,0)', 'max(0,0)', 'abs(0)', 'floor(0)', 'sin(0)', 'cos(0)'].map(m => (
                  <TouchableOpacity key={m} style={styles.pickerChipSecondary} onPress={() => {
                    if (handleActionSelect) handleActionSelect(m);
                    else if ((global as any).handleActionSelect) (global as any).handleActionSelect(m);
                    setActionPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipTextSmall, { color: theme.colors.primary }]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Values & Environment</Text>
              <View style={styles.pickerRowSmall}>
                {['tap_x', 'tap_y', 'room_width', 'room_height', 'time', 'self.x', 'self.y', 'self.vx', 'self.vy', 'self.rot', 'self.scale'].map(p => (
                  <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#111' }]} onPress={() => {
                    if (handleActionSelect) handleActionSelect(p);
                    else if ((global as any).handleActionSelect) (global as any).handleActionSelect(p);
                    setActionPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipText, { color: theme.colors.warning }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {currentProject?.variables?.global && Object.keys(currentProject.variables.global).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Global Variables</Text>
                  <View style={styles.pickerRowSmall}>
                    {Object.keys(currentProject.variables.global).map(v => (
                      <TouchableOpacity key={v} style={styles.pickerChipSecondary} onPress={() => {
                        if (handleActionSelect) handleActionSelect(v);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(v);
                        setActionPickerVisible(false);
                      }}>
                        <Text style={[styles.pickerChipTextSmall, { color: theme.colors.secondary }]}>{v.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Animation State Picker Modal */}
      <Modal visible={statePickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setStatePickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => (e as any).stopPropagation?.()} style={[styles.pickerContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {pickingForEngineState?.toUpperCase()} Animation</Text>
              <TouchableOpacity onPress={() => setStatePickerVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.actionPresetItem, { backgroundColor: '#1A1D23', marginBottom: 8 }]}
                onPress={() => {
                  if ((global as any).handleStateSelect) (global as any).handleStateSelect(null);
                  setStatePickerVisible(false);
                }}
              >
                <X size={18} color="#888" />
                <Text style={[styles.actionPresetText, { color: '#888' }]}>NONE / DEFAULT</Text>
              </TouchableOpacity>

              {/* Primary & Secondary Sprite Animations */}
              <Text style={styles.subSectionTitleCompact}>Object Sprite Sheets</Text>
              {[selectedObject?.appearance?.spriteId, ...(selectedObject?.appearance?.additionalSpriteIds || [])].map((id, sIdx) => {
                const s = (currentProject?.sprites || []).find((spr: any) => spr.id === id);
                if (!s) return null;
                return (
                  <View key={`${id}-${sIdx}`} style={{ marginBottom: 12, backgroundColor: '#111', padding: 8, borderRadius: 6 }}>
                    <Text style={{ color: '#888', fontSize: 9, fontWeight: 'bold', marginBottom: 6 }}>{sIdx === 0 ? 'PRIMARY:' : 'SECONDARY:'} {s.name?.toUpperCase()}</Text>
                    <View style={styles.pickerRowSmall}>
                      {(s.animations || []).map((anim: any) => (
                        <TouchableOpacity
                          key={anim.name}
                          style={[styles.pickerChipSecondary, { padding: 8 }]}
                          onPress={() => {
                            const val = sIdx === 0 ? anim.name : `${s.name}:${anim.name}`;
                            if ((global as any).handleStateSelect) (global as any).handleStateSelect(val);
                            setStatePickerVisible(false);
                          }}
                        >
                          <Text style={styles.pickerChipTextSmall}>{anim.name.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>All Project Animations</Text>
              <View style={styles.pickerRowSmall}>
                {currentProject?.animations?.map((anim: any) => (
                  <TouchableOpacity
                    key={anim.id}
                    style={styles.pickerChipSecondary}
                    onPress={() => {
                      if ((global as any).handleStateSelect) (global as any).handleStateSelect(anim.name);
                      setStatePickerVisible(false);
                    }}
                  >
                    <Text style={styles.pickerChipTextSmall}>{anim.name.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 20,
  },
  pickerItem: {
    width: '30%',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  pickerPreview: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  emptyPicker: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyPickerText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyPickerSub: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  subSectionTitle: {
    ...theme.typography.overline,
    color: theme.colors.textMuted,
    marginBottom: 8,
    marginTop: 12,
  },
  actionPresetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#1E2228',
    borderRadius: 8,
    marginTop: 8,
  },
  actionPresetText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  subSectionTitleCompact: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerRowSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pickerChip: {
    backgroundColor: '#2E333D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  pickerChipSecondary: {
    backgroundColor: '#1E2228',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  pickerChipTextSmall: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
  },
  objectPickerItemSmall: {
    width: '22%',
    backgroundColor: '#1E2228',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  objectPickerSpriteBox: {
    width: 32,
    height: 32,
    backgroundColor: '#2E333D',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  objectPickerNameSmall: {
    color: theme.colors.text,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  miniLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});
