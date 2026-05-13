import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { X, Image as ImageIcon, Film, ArrowLeft, ArrowRight, Pause, ArrowUp, ArrowDown, Layout, Zap, Settings, Activity, ChevronUp, MousePointer2, Bolt, Clock, GitBranch, Heart, Volume2, VolumeX, Search, Database, PlayIcon, Eye, EyeOff, Target, Type, Palette, ArrowLeftRight, Maximize2 } from 'lucide-react-native';
import ObjectCreatorModal from './modals/ObjectCreatorModal';
import ObjectInspectorModal from './modals/ObjectInspectorModal';
import { theme } from '../../../theme';
import { styles } from '../ObjectsScreen.styles';

export default function ObjectModals({
  createModalVisible, setCreateModalVisible,
  inspectorVisible, setInspectorVisible,
  spritePickerVisible, setSpritePickerVisible,
  animationPickerVisible, setAnimationPickerVisible,
  actionPickerVisible, setActionPickerVisible,
  eventPickerVisible, setEventPickerVisible,
  propertyPickerVisible, setPropertyPickerVisible,
  statePickerVisible, setStatePickerVisible,
  soundPickerVisible, setSoundPickerVisible,
  selectedObject, setSelectedObject,
  currentProject, updateObject, handleCreateObject, renderSpritePreview,
  // Logic states/handlers
  activeListenerIndex, setActiveListenerIndex,
  activeSubIndex, setActiveSubIndex,
  activePropertyIndex, setActivePropertyIndex,
  handleActionSelect, handleEventSelect, handlePropertySelect,
  pickingForCondition, pickingForEngineState, setPickingForEngineState
}: any) {
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to filter strings or objects with labels/ids
  const matchesSearch = (text: string | undefined) => {
    if (!searchQuery) return true;
    if (!text) return false;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

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
        soundPickerVisible={soundPickerVisible}
        setSoundPickerVisible={setSoundPickerVisible}
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

                      const pickingForRepeater = (global as any).pickingForRepeater;
                      if (pickingForRepeater) {
                        const sr = selectedObject.sprite_repeater || {};
                        const field = pickingForRepeater === 'active' ? 'activeSpriteId' : 'inactiveSpriteId';
                        updateObject(selectedObject.id, { sprite_repeater: { ...sr, [field]: sprite.id } });
                        setSelectedObject({ ...selectedObject, sprite_repeater: { ...sr, [field]: sprite.id } });
                        (global as any).pickingForRepeater = null;
                        setSpritePickerVisible(false);
                        return;
                      }

                      if ((global as any).lastSpritePickerCallback) {
                        (global as any).lastSpritePickerCallback(sprite.id);
                        return;
                      }
                      const appearance = selectedObject.appearance || { spriteId: null, animationSpeed: 100 };
                      const isGrid = !!sprite.grid?.enabled;
                      const sw = isGrid ? (sprite.grid.frameWidth || sprite.width) : sprite.width;
                      const sh = isGrid ? (sprite.grid.frameHeight || sprite.height) : sprite.height;

                      const updates: any = {
                        appearance: { ...appearance, spriteId: sprite.id },
                        width: sw || 32,
                        height: sh || 32,
                        physics: {
                          ...(selectedObject.physics || {}),
                          collision: {
                            ...(selectedObject.physics?.collision || { type: 'rectangle', offsetX: 0, offsetY: 0 }),
                            width: sw || 32,
                            height: sh || 32
                          }
                        }
                      };

                      updateObject(selectedObject.id, updates);
                      setSelectedObject({ ...selectedObject, ...updates });
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
        <View style={[styles.pickerOverlay, { padding: 0 }]}>
          <View style={[styles.pickerContent, { height: '100%', maxHeight: '100%', borderRadius: 0, paddingBottom: 40 }]}>
            <View style={[styles.modalHeader, { marginBottom: 16 }]}>
              <View>
                <Text style={styles.modalTitle}>Select Event Trigger</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>WHEN SHOULD THIS LOGIC RUN?</Text>
              </View>
              <TouchableOpacity onPress={() => { setEventPickerVisible(false); setSearchQuery(''); }}>
                <X color={theme.colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 2,
              paddingHorizontal: 8,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)'
            }}>
              <Search size={18} color={theme.colors.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  fontSize: 14
                }}
                placeholder="Search events (e.g. tick, tap, jump...)"
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Logic Flow Templates */}
              {([
                { id: 'if', label: 'IF THEN', icon: GitBranch },
                { id: 'if_else', label: 'IF ELSE', icon: GitBranch },
                { id: 'wait_until', label: 'WAIT UNTIL', icon: Clock },
              ].filter(t => matchesSearch(t.label) || matchesSearch(t.id)).length > 0) && (
                <>
                  <Text style={styles.subSectionTitleCompact}>Logic Flow Templates</Text>
                  <View style={[styles.pickerRowSmall, { flexWrap: 'wrap', marginBottom: 12, paddingHorizontal: 10 }]}>
                    {[
                      { id: 'if', label: 'IF THEN', icon: GitBranch },
                      { id: 'if_else', label: 'IF ELSE', icon: GitBranch },
                      { id: 'wait_until', label: 'WAIT UNTIL', icon: Clock },
                    ].filter(t => matchesSearch(t.label) || matchesSearch(t.id)).map(t => (
                      <TouchableOpacity key={t.id} style={[styles.pickerChip, { backgroundColor: '#1A1D23', minWidth: 80 }]} onPress={() => {
                        if (handleEventSelect) handleEventSelect(t.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(t.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <t.icon size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.pickerChipText, { color: theme.colors.primary, fontSize: 9 }]}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Engine Events */}
              {([
                { id: 'on_tick', label: 'Every Frame (on tick)', icon: Activity, color: theme.colors.primary },
                { id: 'on_start', label: 'On Start (once)', icon: Zap, color: theme.colors.secondary },
                { id: 'on_timer:1000', label: 'Timer (every 1 second)', icon: Clock, color: theme.colors.warning },
              ].filter(e => matchesSearch(e.label) || matchesSearch(e.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Engine Events</Text>
                  {[
                    { id: 'on_tick', label: 'Every Frame (on tick)', icon: Activity, color: theme.colors.primary },
                    { id: 'on_start', label: 'On Start (once)', icon: Zap, color: theme.colors.secondary },
                    { id: 'on_timer:1000', label: 'Timer (every 1 second)', icon: Clock, color: theme.colors.warning },
                  ].filter(e => matchesSearch(e.label) || matchesSearch(e.id)).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect(ev.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <ev.icon size={14} color={ev.color} />
                      <Text style={[styles.actionPresetText, { color: ev.color, fontWeight: 'bold' }]}>{ev.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Player & Control Input */}
              {([
                { id: 'builtin_jump', label: 'When Player Jumps (Built-in)', icon: ChevronUp, color: theme.colors.primary },
                { id: 'on_jump_press', label: 'On Jump Button (Global)', icon: ChevronUp, color: theme.colors.primary },
                { id: 'builtin_left', label: 'When Player Moves Left', icon: ArrowLeft, color: theme.colors.secondary },
                { id: 'builtin_right', label: 'When Player Moves Right', icon: ArrowRight, color: theme.colors.secondary },
                { id: 'when_self_tap', label: 'When THIS Object Tapped', icon: MousePointer2, color: theme.colors.success },
                { id: 'builtin_tap', label: 'When Screen Tapped', icon: MousePointer2, color: theme.colors.primary },
                { id: 'on_screen_tap', label: 'On Screen Tap (Global)', icon: MousePointer2, color: theme.colors.secondary },
                { id: 'on_release', label: 'On Object Release', icon: Pause, color: theme.colors.error },
                { id: 'wait_until:', label: 'Wait Until (Condition)', icon: Clock, color: theme.colors.warning },
              ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Player & Control Input</Text>
                  {[
                    { id: 'builtin_jump', label: 'When Player Jumps (Built-in)', icon: ChevronUp, color: theme.colors.primary },
                    { id: 'on_jump_press', label: 'On Jump Button (Global)', icon: ChevronUp, color: theme.colors.primary },
                    { id: 'builtin_left', label: 'When Player Moves Left', icon: ArrowLeft, color: theme.colors.secondary },
                    { id: 'builtin_right', label: 'When Player Moves Right', icon: ArrowRight, color: theme.colors.secondary },
                    { id: 'when_self_tap', label: 'When THIS Object Tapped', icon: MousePointer2, color: theme.colors.success },
                    { id: 'builtin_tap', label: 'When Screen Tapped', icon: MousePointer2, color: theme.colors.primary },
                    { id: 'on_screen_tap', label: 'On Screen Tap (Global)', icon: MousePointer2, color: theme.colors.secondary },
                    { id: 'on_release', label: 'On Object Release', icon: Pause, color: theme.colors.error },
                    { id: 'wait_until:', label: 'Wait Until (Condition)', icon: Clock, color: theme.colors.warning },
                  ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect(ev.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <ev.icon size={14} color={ev.color} />
                      <Text style={styles.actionPresetText}>{ev.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Appearance & State */}
              {([
                { id: 'when: self.is_flipped == true', label: 'Is Flipped (Facing Left)', icon: ArrowLeftRight, color: theme.colors.warning },
                { id: 'when: self.visible == true', label: 'Is Visible', icon: Eye, color: theme.colors.success },
              ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Appearance & State</Text>
                  {[
                    { id: 'when: self.is_flipped == true', label: 'Is Flipped (Facing Left)', icon: ArrowLeftRight, color: theme.colors.warning },
                    { id: 'when: self.visible == true', label: 'Is Visible', icon: Eye, color: theme.colors.success },
                  ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect(ev.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <ev.icon size={14} color={ev.color} />
                      <Text style={styles.actionPresetText}>{ev.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Collisions & Interactions */}
              {(matchesSearch('collision') || matchesSearch('hit') || matchesSearch('overlapping') || (currentProject?.objects || []).filter((obj: any) => matchesSearch(obj.name)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Collisions & Interactions</Text>
                  {[
                    { id: 'on_collision', label: 'On Any Collision', icon: Bolt, color: '#FFAC00' },
                    { id: 'when: self.is_overlapping == true', label: 'Is Overlapping another object', icon: Zap, color: theme.colors.secondary },
                  ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect(ev.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <ev.icon size={14} color={ev.color} />
                      <Text style={styles.actionPresetText}>{ev.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {(currentProject?.objects || []).filter((obj: any) => matchesSearch(obj.name)).length > 0 && (
                    <>
                      <Text style={[styles.subSectionTitleCompact, { marginTop: 12, marginBottom: 8, fontSize: 11, opacity: 0.8 }]}>When hitting specific Object:</Text>
                      <View style={styles.pickerGrid}>
                        {(currentProject?.objects || []).filter((obj: any) => matchesSearch(obj.name)).map((obj: any) => (
                          <TouchableOpacity
                            key={obj.id}
                            style={styles.objectPickerItemSmall}
                            onPress={() => {
                              if (handleEventSelect) handleEventSelect(`collision:${obj.name}`);
                              else if ((global as any).handleEventSelect) (global as any).handleEventSelect(`collision:${obj.name}`);
                              setEventPickerVisible(false);
                              setSearchQuery('');
                            }}
                          >
                            <View style={styles.objectPickerSpriteBox}>
                              {renderSpritePreview(obj.appearance?.spriteId, 32)}
                            </View>
                            <Text style={styles.objectPickerNameSmall} numberOfLines={1}>{obj.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Size & Position */}
              {([
                { id: 'when: self.x > 100', label: 'Compare X Coordinate', icon: Target, color: theme.colors.primary },
                { id: 'when: self.y > 100', label: 'Compare Y Coordinate', icon: Target, color: theme.colors.primary },
                { id: 'when: self.width > 32', label: 'Compare Width', icon: Maximize2, color: theme.colors.success },
                { id: 'when: self.height > 32', label: 'Compare Height', icon: Maximize2, color: theme.colors.success },
              ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Size & Position</Text>
                  {[
                    { id: 'when: self.x > 100', label: 'Compare X Coordinate', icon: Target, color: theme.colors.primary },
                    { id: 'when: self.y > 100', label: 'Compare Y Coordinate', icon: Target, color: theme.colors.primary },
                    { id: 'when: self.width > 32', label: 'Compare Width', icon: Maximize2, color: theme.colors.success },
                    { id: 'when: self.height > 32', label: 'Compare Height', icon: Maximize2, color: theme.colors.success },
                  ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect(ev.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <ev.icon size={14} color={ev.color} />
                      <Text style={styles.actionPresetText}>{ev.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Variables & Comparisons (WHEN...) */}
              {(((Object.keys(currentProject?.variables?.global || {}).length > 0 || Object.keys(selectedObject?.variables?.local || {}).length > 0)) && 
                (matchesSearch('when') || matchesSearch('compare') || matchesSearch('boolean') || matchesSearch('variable') || 
                 Object.keys(currentProject?.variables?.global || {}).some(v => matchesSearch(v)) || 
                 Object.keys(selectedObject?.variables?.local || {}).some(v => matchesSearch(v)))) && (
                <>
                  <View style={styles.divider} />
                  <Text style={[styles.subSectionTitleCompact, { color: '#FBBF24', fontSize: 9, letterSpacing: 0.5, marginBottom: 4 }]}>Variables & Comparisons (WHEN...)</Text>
                  
                  {/* List Global Variable Comparisons */}
                  {Object.keys(currentProject?.variables?.global || {}).map(v => (
                    <View key={`when-global-${v}`} style={{ marginVertical: 4, paddingHorizontal: 4 }}>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 8, textTransform: 'uppercase', marginBottom: 2 }}>GLOBAL VAR: {v}</Text>
                      <View style={[styles.pickerRowSmall, { marginTop: 0, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }]}>
                        <TouchableOpacity
                          style={[styles.pickerChipSecondary, { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#1E2228', borderRadius: 2, borderWidth: 1, borderColor: '#333' }]}
                          onPress={() => {
                            const val = `when: Global.${v} > 0`;
                            if (handleEventSelect) handleEventSelect(val);
                            else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                            setEventPickerVisible(false);
                            setSearchQuery('');
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: theme.colors.primary }}>WHEN Global.{v} &gt; 0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pickerChipSecondary, { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#1E2228', borderRadius: 2, borderWidth: 1, borderColor: '#333' }]}
                          onPress={() => {
                            const val = `when: Global.${v} == true`;
                            if (handleEventSelect) handleEventSelect(val);
                            else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                            setEventPickerVisible(false);
                            setSearchQuery('');
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FBBF24' }}>WHEN Global.{v} is TRUE</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* List Local Variable Comparisons */}
                  {Object.keys(selectedObject?.variables?.local || {}).map(v => (
                    <View key={`when-local-${v}`} style={{ marginVertical: 4, paddingHorizontal: 4 }}>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 8, textTransform: 'uppercase', marginBottom: 2 }}>LOCAL VAR: {v}</Text>
                      <View style={[styles.pickerRowSmall, { marginTop: 0, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }]}>
                        <TouchableOpacity
                          style={[styles.pickerChipSecondary, { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#1E2228', borderRadius: 2, borderWidth: 1, borderColor: '#333' }]}
                          onPress={() => {
                            const val = `when: self.${v} > 0`;
                            if (handleEventSelect) handleEventSelect(val);
                            else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                            setEventPickerVisible(false);
                            setSearchQuery('');
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: theme.colors.secondary }}>WHEN self.{v} &gt; 0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pickerChipSecondary, { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#1E2228', borderRadius: 2, borderWidth: 1, borderColor: '#333' }]}
                          onPress={() => {
                            const val = `when: self.${v} == true`;
                            if (handleEventSelect) handleEventSelect(val);
                            else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                            setEventPickerVisible(false);
                            setSearchQuery('');
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FBBF24' }}>WHEN self.{v} is TRUE</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Progress Bar & Stats */}
              {([
                { id: 'on_empty', label: 'On Empty (0%)', icon: Activity, color: theme.colors.error },
                { id: 'on_full', label: 'On Full (100%)', icon: Activity, color: theme.colors.primary },
                { id: 'on_life_lost', label: 'On Life Lost', icon: Heart, color: theme.colors.error },
                { id: 'on_zero_lives', label: 'On Zero Lives', icon: Heart, color: theme.colors.error },
              ].filter(ev => {
                if (ev.id === 'on_empty' || ev.id === 'on_full') {
                  return selectedObject?.behavior === 'progress_bar';
                }
                if (ev.id === 'on_life_lost' || ev.id === 'on_zero_lives') {
                  return selectedObject?.behavior !== 'progress_bar';
                }
                return true;
              }).filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Progress Bar & Stats</Text>
                  {[
                    { id: 'on_empty', label: 'On Empty (0%)', icon: Activity, color: theme.colors.error },
                    { id: 'on_full', label: 'On Full (100%)', icon: Activity, color: theme.colors.primary },
                    { id: 'on_life_lost', label: 'On Life Lost', icon: Heart, color: theme.colors.error },
                    { id: 'on_zero_lives', label: 'On Zero Lives', icon: Heart, color: theme.colors.error },
                  ].filter(ev => {
                    if (ev.id === 'on_empty' || ev.id === 'on_full') {
                      return selectedObject?.behavior === 'progress_bar';
                    }
                    if (ev.id === 'on_life_lost' || ev.id === 'on_zero_lives') {
                      return selectedObject?.behavior !== 'progress_bar';
                    }
                    return true;
                  }).filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect(ev.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <ev.icon size={14} color={ev.color} />
                      <Text style={[styles.actionPresetText, { color: ev.color }]}>{ev.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Game Audio */}
              {([
                { id: 'on_start_sound', label: 'When ANY Sound Starts', icon: Volume2, color: theme.colors.primary },
                { id: 'on_stop_sound', label: 'When ANY Sound Stops', icon: VolumeX, color: theme.colors.error },
              ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).length > 0 || (currentProject?.sounds || []).filter((snd: any) => matchesSearch(snd.name)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Game Audio</Text>
                  {[
                    { id: 'on_start_sound', label: 'When ANY Sound Starts', icon: Volume2, color: theme.colors.primary },
                    { id: 'on_stop_sound', label: 'When ANY Sound Stops', icon: VolumeX, color: theme.colors.error },
                  ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect(ev.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <ev.icon size={14} color={ev.color} />
                      <Text style={[styles.actionPresetText, { color: ev.color }]}>{ev.label}</Text>
                    </TouchableOpacity>
                  ))}
                  {(currentProject?.sounds || []).filter((snd: any) => matchesSearch(snd.name)).length > 0 && (
                    <>
                      <Text style={[styles.subSectionTitleCompact, { marginTop: 12, marginBottom: 8, fontSize: 11, opacity: 0.8 }]}>When specific Sound starts:</Text>
                      <View style={styles.pickerRowSmall}>
                        {(currentProject?.sounds || []).filter((snd: any) => matchesSearch(snd.name)).map((snd: any) => (
                          <TouchableOpacity
                            key={snd.id}
                            style={styles.pickerChipSecondary}
                            onPress={() => {
                              if (handleEventSelect) handleEventSelect(`on_start_sound:${snd.name}`);
                              else if ((global as any).handleEventSelect) (global as any).handleEventSelect(`on_start_sound:${snd.name}`);
                              setEventPickerVisible(false);
                              setSearchQuery('');
                            }}
                          >
                            <Text style={styles.pickerChipTextSmall}>{snd.name?.toUpperCase()}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Raycasting Triggers */}
              {(matchesSearch('raycast') || matchesSearch('hit') || matchesSearch('clear') || (selectedObject?.plugins || []).some((p: any) => p.type === 'raycast')) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Raycasting Triggers</Text>
                  {[
                    { id: 'on_raycast_hit', label: 'On Raycast Hit (Any)', color: theme.colors.primary },
                    { id: 'on_raycast_clear', label: 'On Raycast Clear (Any)', color: theme.colors.secondary }
                  ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).map(ev => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect(ev.id);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(ev.id);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <Target size={14} color={ev.color} />
                      <Text style={[styles.actionPresetText, { color: ev.color, fontWeight: 'bold' }]}>{ev.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Specific raycast plugins */}
                  {(selectedObject?.plugins || []).filter((p: any) => p.type === 'raycast' && matchesSearch(p.name)).map((plugin: any) => (
                    <View key={plugin.id} style={{ marginTop: 8, paddingHorizontal: 10 }}>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 9, marginBottom: 4 }}>PLUGIN: {plugin.name?.toUpperCase()}</Text>
                      <View style={[styles.pickerRowSmall, { gap: 8 }]}>
                        <TouchableOpacity
                          style={styles.pickerChipSecondary}
                          onPress={() => {
                            if (handleEventSelect) handleEventSelect(`on_raycast_hit:${plugin.name}`);
                            else if ((global as any).handleEventSelect) (global as any).handleEventSelect(`on_raycast_hit:${plugin.name}`);
                            setEventPickerVisible(false);
                            setSearchQuery('');
                          }}
                        >
                          <Text style={[styles.pickerChipTextSmall, { color: theme.colors.primary }]}>HIT: {plugin.name?.toUpperCase()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pickerChipSecondary}
                          onPress={() => {
                            if (handleEventSelect) handleEventSelect(`on_raycast_clear:${plugin.name}`);
                            else if ((global as any).handleEventSelect) (global as any).handleEventSelect(`on_raycast_clear:${plugin.name}`);
                            setEventPickerVisible(false);
                            setSearchQuery('');
                          }}
                        >
                          <Text style={[styles.pickerChipTextSmall, { color: theme.colors.secondary }]}>CLEAR: {plugin.name?.toUpperCase()}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Dynamic Comparisons */}
              {([
                'self.x', 'self.y', 'self.width', 'self.height', 'room_width', 'room_height'
              ].filter(p => matchesSearch(p)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Dynamic Comparisons (WHEN ...)</Text>
                  <View style={styles.pickerRowSmall}>
                    {['self.x', 'self.y', 'self.width', 'self.height', 'room_width', 'room_height'].filter(p => matchesSearch(p)).map(p => (
                      <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#111' }]} onPress={() => {
                        if (handleEventSelect) handleEventSelect(p + ' > ');
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(p + ' > ');
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipText, { color: theme.colors.warning }]}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Global Variables */}
              {(Object.keys(currentProject?.variables?.global || {}).filter(v => matchesSearch(v)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Project Variables (Global)</Text>
                  <View style={styles.pickerRowSmall}>
                    {Object.keys(currentProject?.variables?.global || {}).filter(v => matchesSearch(v)).map(v => (
                      <TouchableOpacity key={v} style={styles.pickerChip} onPress={() => {
                        const val = `Global.${v}`;
                        if (handleEventSelect) handleEventSelect(val);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={styles.pickerChipText}>{v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Object Triggers */}
              {((currentProject?.objects || []).filter((o: any) => o.id !== selectedObject?.id && matchesSearch(o.name)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Object Triggers</Text>
                  {(currentProject?.objects || []).filter((o: any) => o.id !== selectedObject?.id && matchesSearch(o.name)).map((obj: any) => (
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
                            setSearchQuery('');
                          }}>
                            <Text style={styles.pickerChipTextSmall}>{p.toUpperCase()}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Math & Operators */}
              {([
                '>', '<', '==', '!=', '>=', '<=', '+', '-', '*', '/', '^', '%', 'clamp', 'min', 'max', 'abs', 'floor', 'random'
              ].filter(op => matchesSearch(op)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Math & Operators (WHEN ...)</Text>
                  <View style={styles.pickerRowSmall}>
                    {['>', '<', '==', '!=', '>=', '<=', '+', '-', '*', '/', '^', '%'].filter(op => matchesSearch(op)).map(op => (
                      <TouchableOpacity key={op} style={[styles.pickerChip, { backgroundColor: theme.colors.surfaceElevated }]} onPress={() => {
                        if (handleEventSelect) handleEventSelect(op);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(op);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={styles.pickerChipText}>{op}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.pickerRowSmall}>
                    {['clamp(', 'min(', 'max(', 'abs(', 'floor(', 'random('].filter(p => matchesSearch(p)).map(p => (
                      <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#0A0C10' }]} onPress={() => {
                        if (handleEventSelect) handleEventSelect(p);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(p);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipText, { color: theme.colors.secondary }]}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Object Properties */}
              {([
                'self', 'other', 'tap_x', 'tap_y', 'room_width', 'room_height', 'time'
              ].filter(p => matchesSearch(p)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Object Properties</Text>
                  <View style={styles.pickerRowSmall}>
                    {['self', 'other', 'tap_x', 'tap_y', 'room_width', 'room_height', 'time'].filter(p => matchesSearch(p)).map(p => (
                      <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#111' }]} onPress={() => {
                        const val = (p === 'self' || p === 'other') ? p + '.' : p;
                        if (handleEventSelect) handleEventSelect(val);
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect(val);
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipText, { color: theme.colors.primary }]}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Property Picker Modal */}
      <Modal visible={propertyPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPropertyPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => (e as any).stopPropagation?.()} style={[styles.pickerContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Insert Property / Variable</Text>
              <TouchableOpacity onPress={() => { setPropertyPickerVisible(false); setSearchQuery(''); }}>
                <X color={theme.colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 2,
              paddingHorizontal: 8,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)'
            }}>
              <Search size={18} color={theme.colors.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  fontSize: 14
                }}
                placeholder="Search properties (e.g. x, health, score...)"
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {['self', 'other'].filter(p => matchesSearch(p)).length > 0 && (
                <>
                  <Text style={styles.subSectionTitleCompact}>Dynamic References</Text>
                  <View style={styles.pickerRowSmall}>
                    {['self', 'other'].filter(p => matchesSearch(p)).map(p => (
                      <TouchableOpacity key={p} style={[styles.pickerChip, { borderColor: theme.colors.primary }]} onPress={() => {
                        if (handlePropertySelect) handlePropertySelect(p + '.');
                        else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(p + '.');
                        setPropertyPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipText, { color: theme.colors.primary }]}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {['x', 'y', 'vx', 'vy', 'width', 'height', 'health', 'angle', 'scale', 'visible', 'value', 'current_count', 'max_count'].filter(p => {
                if (p === 'value') return selectedObject?.behavior === 'progress_bar';
                if (p === 'current_count' || p === 'max_count') return selectedObject?.behavior === 'sprite_repeater';
                if (p === 'health') return selectedObject?.behavior !== 'progress_bar' && selectedObject?.behavior !== 'sprite_repeater';
                return true;
              }).filter(p => matchesSearch(p)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Current Object (this/self)</Text>
                  <View style={styles.pickerRowSmall}>
                    {['x', 'y', 'vx', 'vy', 'width', 'height', 'health', 'angle', 'scale', 'visible', 'value', 'current_count', 'max_count'].filter(p => {
                      if (p === 'value') return selectedObject?.behavior === 'progress_bar';
                      if (p === 'current_count' || p === 'max_count') return selectedObject?.behavior === 'sprite_repeater';
                      if (p === 'health') return selectedObject?.behavior !== 'progress_bar' && selectedObject?.behavior !== 'sprite_repeater';
                      return true;
                    }).filter(p => matchesSearch(p)).map(p => (
                      <TouchableOpacity key={p} style={styles.pickerChip} onPress={() => {
                        const val = `self.${p}`;
                        if (handlePropertySelect) handlePropertySelect(val);
                        else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(val);
                        setPropertyPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={styles.pickerChipText}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {['room_width', 'room_height', 'time', 'tap_x', 'tap_y'].filter(p => matchesSearch(p)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Room & Environment</Text>
                  <View style={styles.pickerRowSmall}>
                    {['room_width', 'room_height', 'time', 'tap_x', 'tap_y', 'get_drag_x', 'get_drag_y'].filter(p => matchesSearch(p)).map(p => (
                      <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#111' }]} onPress={() => {
                        if (handlePropertySelect) handlePropertySelect(p);
                        else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(p);
                        setPropertyPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipText, { color: theme.colors.warning }]}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {['clamp(', 'min(', 'max(', 'abs(', 'floor(', 'random('].filter(p => matchesSearch(p)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Logic & Math</Text>
                  <View style={styles.pickerRowSmall}>
                    {['clamp(', 'min(', 'max(', 'abs(', 'floor(', 'random('].filter(p => matchesSearch(p)).map(p => (
                      <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#0A0C10' }]} onPress={() => {
                        if (handlePropertySelect) handlePropertySelect(p);
                        else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(p);
                        setPropertyPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipText, { color: theme.colors.secondary }]}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {['>', '<', '==', '!=', '>=', '<=', '+', '-', '*', '/', '^', '%'].filter(op => matchesSearch(op)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Operators</Text>
                  <View style={styles.pickerRowSmall}>
                    {['>', '<', '==', '!=', '>=', '<=', '+', '-', '*', '/', '^', '%'].filter(op => matchesSearch(op)).map(op => (
                      <TouchableOpacity key={op} style={[styles.pickerChip, { backgroundColor: theme.colors.surfaceElevated }]} onPress={() => {
                        if (handlePropertySelect) handlePropertySelect(op);
                        else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(op);
                        setPropertyPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={styles.pickerChipText}>{op}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {Object.keys(currentProject?.variables?.global || {}).filter(v => matchesSearch(v)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Project Variables</Text>
                  <View style={styles.pickerRowSmall}>
                    {Object.keys(currentProject?.variables?.global || {}).filter(v => matchesSearch(v)).map(v => (
                      <TouchableOpacity key={v} style={styles.pickerChip} onPress={() => {
                        const val = `Global.${v}`;
                        if (handlePropertySelect) handlePropertySelect(val);
                        else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(val);
                        setPropertyPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={styles.pickerChipText}>{v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {(currentProject?.objects || []).filter((o: any) => o.id !== selectedObject?.id && matchesSearch(o.name)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Other Project Objects</Text>
                  {(currentProject?.objects || []).filter((o: any) => o.id !== selectedObject?.id && matchesSearch(o.name)).map((obj: any) => {
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
                          {['x', 'y', 'vx', 'vy', 'width', 'height', 'health', 'scale', 'value', 'current_count', 'max_count'].filter(p => {
                            if (p === 'value') return obj.behavior === 'progress_bar';
                            if (p === 'current_count' || p === 'max_count') return obj.behavior === 'sprite_repeater';
                            if (p === 'health') return obj.behavior !== 'progress_bar' && obj.behavior !== 'sprite_repeater';
                            return true;
                          }).map(p => (
                            <TouchableOpacity key={p} style={styles.pickerChipSecondary} onPress={() => {
                              if (handlePropertySelect) handlePropertySelect(`${targetId}.${p}`);
                              else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(`${targetId}.${p}`);
                              setPropertyPickerVisible(false);
                              setSearchQuery('');
                            }}>
                              <Text style={styles.pickerChipTextSmall}>{p.toUpperCase()}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={[styles.pickerRowSmall, { marginTop: 4 }]}>
                          {['physics.ignoreCollision', 'physics.bodyType', 'visible'].map(p => {
                            const label = p.includes('ignoreCollision') ? 'SOLID' : p.split('.')[1]?.toUpperCase() || p.toUpperCase();
                            const val = p.includes('ignoreCollision') ? `!${targetId}.${p}` : `${targetId}.${p}`;
                            return (
                              <TouchableOpacity key={p} style={[styles.pickerChipSecondary, { backgroundColor: '#111' }]} onPress={() => {
                                if (handlePropertySelect) handlePropertySelect(val);
                                else if ((global as any).handlePropertySelect) (global as any).handlePropertySelect(val);
                                setPropertyPickerVisible(false);
                                setSearchQuery('');
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
        <View style={[styles.pickerOverlay, { padding: 0 }]}>
          <View style={[styles.pickerContent, { height: '100%', maxHeight: '100%', borderRadius: 0, paddingBottom: 40 }]}>
            <View style={[styles.modalHeader, { marginBottom: 16 }]}>
              <View>
                <Text style={styles.modalTitle}>Select Action</Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>WHAT SHOULD HAPPEN?</Text>
              </View>
              <TouchableOpacity onPress={() => { setActionPickerVisible(false); setSearchQuery(''); }}>
                <X color={theme.colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              paddingHorizontal: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)'
            }}>
              <Search size={18} color={theme.colors.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  fontSize: 14
                }}
                placeholder="Search actions (e.g. move, sound, jump...)"
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Preset Actions */}
              {([
                { id: 'save_game', label: 'Save Game Progress', icon: Database, color: theme.colors.success },
                { id: 'load_game', label: 'Load Game Progress', icon: Database, color: theme.colors.warning },
                { id: 'restart_room', label: 'Restart Room', icon: GitBranch, color: theme.colors.primary },
              ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).length > 0) && (
                <>
                  <Text style={styles.subSectionTitleCompact}>Preset Actions</Text>
                  {[
                    { id: 'save_game', label: 'Save Game Progress', icon: Database, color: theme.colors.success },
                    { id: 'load_game', label: 'Load Game Progress', icon: Database, color: theme.colors.warning },
                    { id: 'restart_room', label: 'Restart Room', icon: GitBranch, color: theme.colors.primary },
                  ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).map(act => (
                    <TouchableOpacity
                      key={act.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleActionSelect) handleActionSelect(act.id);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act.id);
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <act.icon size={14} color={act.color} />
                      <Text style={styles.actionPresetText}>{act.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Movement, Physics & Scale */}
              {([
                { id: 'move_left', label: 'Move Left', icon: ArrowLeft, color: theme.colors.secondary },
                { id: 'move_right', label: 'Move Right', icon: ArrowRight, color: theme.colors.secondary },
                { id: 'move_up', label: 'Move Up', icon: ArrowUp, color: theme.colors.secondary },
                { id: 'move_down', label: 'Move Down', icon: ArrowDown, color: theme.colors.secondary },
                { id: 'jump', label: 'Jump / Hop Up', icon: ChevronUp, color: theme.colors.primary },
                { id: 'stop_x', label: 'Stop Horizontal Movement', icon: Pause, color: theme.colors.error },
                { id: 'move_towards:Player:1', label: 'Move Towards Player (Speed 1)', icon: ArrowRight, color: theme.colors.success },
                { id: 'move_towards:400:300:1', label: 'Move Towards Coordinates 400,300 (Speed 1)', icon: ArrowRight, color: theme.colors.success },
                { id: 'go_to:touch', label: 'Go To Touch (Teleport to Drag/Tap)', icon: MousePointer2, color: theme.colors.warning },
                { id: 'go_to:Player', label: 'Go To Player (Teleport to Object)', icon: Target, color: theme.colors.primary },
              ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).length > 0 || 
                ['add_x:1', 'add_x:-1', 'add_y:1', 'add_y:-1', 'add_angle:5', 'add_angle:-5', 'set_scale:1.5', 'add_scale:0.1'].some(act => matchesSearch(act))) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Movement & Physics</Text>
                  {[
                    { id: 'move_left', label: 'Move Left', icon: ArrowLeft, color: theme.colors.secondary },
                    { id: 'move_right', label: 'Move Right', icon: ArrowRight, color: theme.colors.secondary },
                    { id: 'move_up', label: 'Move Up', icon: ArrowUp, color: theme.colors.secondary },
                    { id: 'move_down', label: 'Move Down', icon: ArrowDown, color: theme.colors.secondary },
                    { id: 'jump', label: 'Jump / Hop Up', icon: ChevronUp, color: theme.colors.primary },
                    { id: 'stop_x', label: 'Stop Horizontal Movement', icon: Pause, color: theme.colors.error },
                    { id: 'move_towards:Player:1', label: 'Move Towards Player (Speed 1)', icon: ArrowRight, color: theme.colors.success },
                    { id: 'move_towards:400:300:1', label: 'Move Towards Coordinates 400,300 (Speed 1)', icon: ArrowRight, color: theme.colors.success },
                    { id: 'go_to:touch', label: 'Go To Touch (Teleport to Drag/Tap)', icon: MousePointer2, color: theme.colors.warning },
                    { id: 'go_to:Player', label: 'Go To Player (Teleport to Object)', icon: Target, color: theme.colors.primary },
                  ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).map(act => (
                    <TouchableOpacity
                      key={act.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleActionSelect) handleActionSelect(act.id);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act.id);
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <act.icon size={14} color={act.color} />
                      <Text style={styles.actionPresetText}>{act.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Positioning micro-chips */}
                  {['add_x:1', 'add_x:-1', 'add_y:1', 'add_y:-1', 'add_angle:5', 'add_angle:-5', 'set_scale:1.5', 'add_scale:0.1'].filter(act => matchesSearch(act)).length > 0 && (
                    <View style={[styles.pickerRowSmall, { marginTop: 8 }]}>
                      {['add_x:1', 'add_x:-1', 'add_y:1', 'add_y:-1', 'add_angle:5', 'add_angle:-5', 'set_scale:1.5', 'add_scale:0.1'].filter(act => matchesSearch(act)).map(act => (
                        <TouchableOpacity key={act} style={styles.pickerChipSecondary} onPress={() => {
                          if (handleActionSelect) handleActionSelect(act);
                          else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act);
                          setActionPickerVisible(false);
                          setSearchQuery('');
                        }}>
                          <Text style={styles.pickerChipTextSmall}>{act.toUpperCase().replace('_', ' ')}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Lives & Stats */}
              {([
                { id: 'damage:1', label: 'Damage (-1 Life)', icon: Heart, color: theme.colors.error },
                { id: 'heal:1', label: 'Heal (+1 Life)', icon: Heart, color: theme.colors.success },
                { id: 'set_count:3', label: 'Set Lives Count', icon: Heart, color: theme.colors.primary },
              ].filter(act => {
                if (act.id === 'set_count:3') {
                  return selectedObject?.behavior === 'sprite_repeater';
                }
                return selectedObject?.behavior !== 'progress_bar' && selectedObject?.behavior !== 'sprite_repeater';
              }).filter(act => matchesSearch(act.label) || matchesSearch(act.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Lives & Stats</Text>
                  {[
                    { id: 'damage:1', label: 'Damage (-1 Life)', icon: Heart, color: theme.colors.error },
                    { id: 'heal:1', label: 'Heal (+1 Life)', icon: Heart, color: theme.colors.success },
                    { id: 'set_count:3', label: 'Set Lives Count', icon: Heart, color: theme.colors.primary },
                  ].filter(act => {
                    if (act.id === 'set_count:3') {
                      return selectedObject?.behavior === 'sprite_repeater';
                    }
                    return selectedObject?.behavior !== 'progress_bar' && selectedObject?.behavior !== 'sprite_repeater';
                  }).filter(act => matchesSearch(act.label) || matchesSearch(act.id)).map(act => (
                    <TouchableOpacity
                      key={act.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleActionSelect) handleActionSelect(act.id);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act.id);
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <act.icon size={14} color={act.color} />
                      <Text style={[styles.actionPresetText, { color: act.color }]}>{act.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* State & Visibility */}
              {([
                { id: 'destroy', label: 'Destroy Object', icon: X, color: theme.colors.error },
                { id: 'set_visible:true', label: 'Show Object', icon: Eye, color: theme.colors.success },
                { id: 'set_visible:false', label: 'Hide Object', icon: EyeOff, color: theme.colors.warning },
              ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>State & Visibility</Text>
                  {[
                    { id: 'destroy', label: 'Destroy Object', icon: X, color: theme.colors.error },
                    { id: 'set_visible:true', label: 'Show Object', icon: Eye, color: theme.colors.success },
                    { id: 'set_visible:false', label: 'Hide Object', icon: EyeOff, color: theme.colors.warning },
                  ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).map(act => (
                    <TouchableOpacity
                      key={act.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleActionSelect) handleActionSelect(act.id);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act.id);
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <act.icon size={14} color={act.color} />
                      <Text style={styles.actionPresetText}>{act.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* UI, Text & Appearance */}
              {([
                { id: 'set_text:Hello', label: 'Set Text to "Hello"', icon: Type, color: theme.colors.primary },
                { id: 'set_text:Global.var_0', label: 'Set Text to Variable', icon: Type, color: theme.colors.secondary },
              ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>UI, Text & Appearance</Text>
                  {[
                    { id: 'set_text:Hello', label: 'Set Text', icon: Type, color: theme.colors.primary },
                    { id: 'set_text_color:#FF0000', label: 'Set Text Color', icon: Palette, color: theme.colors.error },
                    { id: 'set_bg_color:rgba(0,0,0,0.5)', label: 'Set Background', icon: Layout, color: theme.colors.secondary },
                    { id: 'set_text_size:24', label: 'Set Text Size', icon: Type, color: theme.colors.warning },
                    { id: 'set_text_align:center', label: 'Set Text Align', icon: Type, color: theme.colors.primary },
                  ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).map(act => (
                    <TouchableOpacity
                      key={act.id}
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleActionSelect) handleActionSelect(act.id);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act.id);
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <act.icon size={14} color={act.color} />
                      <Text style={styles.actionPresetText}>{act.label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Progress Bar Actions */}
              {(selectedObject?.behavior === 'progress_bar' && [
                { id: 'set_value:50', label: 'SET VALUE' },
                { id: 'add_value:-10', label: 'CHANGE BAR' },
                { id: 'tween_to:100:1000', label: 'TWEEN TO' },
                { id: 'bind_to_variable:', label: 'BIND TO VAR' },
              ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Progress Bar Actions</Text>
                  <View style={styles.pickerRowSmall}>
                    {[
                      { id: 'set_value:50', label: 'SET VALUE' },
                      { id: 'add_value:-10', label: 'CHANGE BAR' },
                      { id: 'tween_to:100:1000', label: 'TWEEN TO' },
                      { id: 'bind_to_variable:', label: 'BIND TO VAR' },
                    ].filter(act => matchesSearch(act.label) || matchesSearch(act.id)).map(act => (
                      <TouchableOpacity key={act.id} style={[styles.pickerChipSecondary, { borderColor: theme.colors.primary }]} onPress={() => {
                        if (handleActionSelect) handleActionSelect(act.id);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act.id);
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipTextSmall, { color: theme.colors.primary }]}>{act.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Game Audio */}
              {(currentProject?.sounds || []).filter((snd: any) => matchesSearch(snd.name)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Game Audio</Text>
                  <View style={styles.pickerRowSmall}>
                    {(currentProject?.sounds || []).filter((snd: any) => matchesSearch(snd.name)).map((snd: any) => (
                      <View key={snd.id} style={{ width: '100%', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Volume2 size={12} color={theme.colors.primary} />
                          <Text style={[styles.miniLabel, { color: theme.colors.primary, marginBottom: 0 }]}>{snd.name?.toUpperCase()}</Text>
                        </View>
                        <View style={styles.pickerRowSmall}>
                          <TouchableOpacity
                            style={[styles.pickerChipSecondary, { borderColor: theme.colors.primary, borderStyle: 'dashed' }]}
                            onPress={() => {
                              if (handleActionSelect) handleActionSelect(`start_sound:${snd.name}`);
                              else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`start_sound:${snd.name}`);
                              setActionPickerVisible(false);
                              setSearchQuery('');
                            }}
                          >
                            <Text style={[styles.pickerChipTextSmall, { color: theme.colors.primary }]}>PLAY</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.pickerChipSecondary, { borderColor: theme.colors.error, borderStyle: 'dashed' }]}
                            onPress={() => {
                              if (handleActionSelect) handleActionSelect(`stop_sound:${snd.name}`);
                              else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`stop_sound:${snd.name}`);
                              setActionPickerVisible(false);
                              setSearchQuery('');
                            }}
                          >
                            <Text style={[styles.pickerChipTextSmall, { color: theme.colors.error }]}>STOP</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {(currentProject?.sounds || []).length === 0 && (
                      <Text style={[styles.pickerLabel, { fontStyle: 'italic', opacity: 0.5 }]}>No sounds imported yet</Text>
                    )}
                  </View>
                </>
              )}

              {/* Scene & Room Control */}
              {(matchesSearch('restart_room') || (currentProject?.rooms || []).filter((room: any) => matchesSearch(room.name)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Scene & Room Control</Text>
                  <View style={styles.pickerRowSmall}>
                    {matchesSearch('restart_room') && (
                      <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => {
                        if (handleActionSelect) handleActionSelect('restart_room');
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect('restart_room');
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={styles.pickerChipTextSmall}>RESTART ROOM</Text>
                      </TouchableOpacity>
                    )}
                    {(currentProject?.rooms || []).filter((room: any) => matchesSearch(room.name)).map((room: any) => (
                      <TouchableOpacity
                        key={room.id}
                        style={styles.pickerChipSecondary}
                        onPress={() => {
                          if (handleActionSelect) handleActionSelect(`go_to_room:${room.name}`);
                          else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`go_to_room:${room.name}`);
                          setActionPickerVisible(false);
                          setSearchQuery('');
                        }}
                      >
                        <Text style={styles.pickerChipTextSmall}>GO TO {room.name?.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Spawn Objects */}
              {(currentProject?.objects || []).filter((obj: any) => matchesSearch(obj.name)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Spawn Objects</Text>
                  <View style={styles.pickerGrid}>
                    {(currentProject?.objects || []).filter((obj: any) => matchesSearch(obj.name)).map((obj: any) => (
                      <TouchableOpacity
                        key={obj.id}
                        style={styles.objectPickerItemSmall}
                        onPress={() => {
                          if (handleActionSelect) handleActionSelect(`create_instance:${obj.id}:0:0`);
                          else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`create_instance:${obj.id}:0:0`);
                          setActionPickerVisible(false);
                          setSearchQuery('');
                        }}
                      >
                        <View style={styles.objectPickerSpriteBox}>
                          {renderSpritePreview(obj.appearance?.spriteId, 32)}
                        </View>
                        <Text style={styles.objectPickerNameSmall} numberOfLines={1}>SPAWN {obj.name?.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Math & Expressions */}
              {['random(10)', 'clamp(0,0,0)', 'min(0,0)', 'max(0,0)', 'abs(0)', 'floor(0)', 'sin(0)', 'cos(0)'].filter(m => matchesSearch(m)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Math & Expressions</Text>
                  <View style={styles.pickerRowSmall}>
                    {['random(10)', 'clamp(0,0,0)', 'min(0,0)', 'max(0,0)', 'abs(0)', 'floor(0)', 'sin(0)', 'cos(0)'].filter(m => matchesSearch(m)).map(m => (
                      <TouchableOpacity key={m} style={styles.pickerChipSecondary} onPress={() => {
                        if (handleActionSelect) handleActionSelect(m);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(m);
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipTextSmall, { color: theme.colors.primary }]}>{m.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Values & Environment */}
              {['tap_x', 'tap_y', 'get_drag_x', 'get_drag_y', 'room_width', 'room_height', 'time', 'self.x', 'self.y', 'self.vx', 'self.vy', 'self.rot', 'self.scale', 'self.visible'].filter(p => matchesSearch(p)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Values & Environment</Text>
                  <View style={styles.pickerRowSmall}>
                    {['tap_x', 'tap_y', 'get_drag_x', 'get_drag_y', 'room_width', 'room_height', 'time', 'self.x', 'self.y', 'self.vx', 'self.vy', 'self.rot', 'self.scale', 'self.visible'].filter(p => matchesSearch(p)).map(p => (
                      <TouchableOpacity key={p} style={[styles.pickerChip, { backgroundColor: '#111' }]} onPress={() => {
                        if (handleActionSelect) handleActionSelect(p);
                        else if ((global as any).handleActionSelect) (global as any).handleActionSelect(p);
                        setActionPickerVisible(false);
                        setSearchQuery('');
                      }}>
                        <Text style={[styles.pickerChipText, { color: theme.colors.warning }]}>{p.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Project Variables (Global) */}
              {currentProject?.variables?.global && Object.keys(currentProject.variables.global).filter(v => matchesSearch(v)).length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Project Variables (Global)</Text>
                  {Object.keys(currentProject.variables.global).filter(v => matchesSearch(v)).map(v => (
                    <View key={v} style={{ marginBottom: 12 }}>
                      <Text style={[styles.miniLabel, { color: theme.colors.primary }]}>{v.toUpperCase()}</Text>
                      <View style={styles.pickerRowSmall}>
                        <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => {
                          if (handleActionSelect) handleActionSelect(`var_add:${v}:1`);
                          else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`var_add:${v}:1`);
                          setActionPickerVisible(false);
                          setSearchQuery('');
                        }}>
                          <Text style={styles.pickerChipTextSmall}>+1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => {
                          if (handleActionSelect) handleActionSelect(`var_add:${v}:-1`);
                          else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`var_add:${v}:-1`);
                          setActionPickerVisible(false);
                          setSearchQuery('');
                        }}>
                          <Text style={styles.pickerChipTextSmall}>-1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => {
                          if (handleActionSelect) handleActionSelect(`var_set:${v}:0`);
                          else if ((global as any).handleActionSelect) (global as any).handleActionSelect(`var_set:${v}:0`);
                          setActionPickerVisible(false);
                          setSearchQuery('');
                        }}>
                          <Text style={styles.pickerChipTextSmall}>SET 0</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
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

      {/* Sound Picker Modal */}
      <Modal visible={soundPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setSoundPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => (e as any).stopPropagation?.()} style={[styles.pickerContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sound</Text>
              <TouchableOpacity onPress={() => setSoundPickerVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.actionPresetItem, { backgroundColor: '#1A1D23', marginBottom: 8 }]}
                onPress={() => {
                  if ((global as any).handleSoundSelect) (global as any).handleSoundSelect(null);
                  setSoundPickerVisible(false);
                }}
              >
                <X size={18} color="#888" />
                <Text style={[styles.actionPresetText, { color: '#888' }]}>NONE / DEFAULT</Text>
              </TouchableOpacity>

              <View style={styles.pickerRowSmall}>
                {(currentProject?.sounds || []).map((snd: any) => (
                  <TouchableOpacity
                    key={snd.id}
                    style={styles.pickerChipSecondary}
                    onPress={() => {
                      if ((global as any).handleSoundSelect) (global as any).handleSoundSelect(snd.name);
                      setSoundPickerVisible(false);
                    }}
                  >
                    <Volume2 size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.pickerChipTextSmall}>{snd.name?.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(currentProject?.sounds || []).length === 0 && (
                <View style={styles.emptyPicker}>
                  <VolumeX size={32} color="#444" />
                  <Text style={styles.emptyPickerText}>No Sounds</Text>
                  <Text style={styles.emptyPickerSub}>Import sounds in the Audio tab first.</Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
