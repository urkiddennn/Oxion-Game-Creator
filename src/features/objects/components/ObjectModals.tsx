import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { X, Image as ImageIcon, Film, ArrowLeft, ArrowRight, Pause, ArrowUp, Layout, Zap, Settings, Activity, ChevronUp, MousePointer2, Bolt, Clock, GitBranch, Heart, Volume2, VolumeX, Search } from 'lucide-react-native';
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
                { id: 'if', label: 'IF THEN' },
                { id: 'if_else', label: 'IF ELSE' },
                { id: 'wait_until', label: 'WAIT UNTIL' },
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
                { id: 'on_tick', label: 'Every Frame (on tick)' },
                { id: 'on_start', label: 'On Start (once)' },
                { id: 'on_timer:1000', label: 'Timer (every 1 second)' },
              ].filter(e => matchesSearch(e.label) || matchesSearch(e.id)).length > 0) && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.subSectionTitleCompact}>Engine Events</Text>
                    {matchesSearch('Every Frame') && matchesSearch('on_tick') && (
                      <TouchableOpacity
                        style={styles.actionPresetItem}
                        onPress={() => {
                          if (handleEventSelect) handleEventSelect('on_tick');
                          else if ((global as any).handleEventSelect) (global as any).handleEventSelect('on_tick');
                          setEventPickerVisible(false);
                          setSearchQuery('');
                        }}
                      >
                        <Activity size={14} color={theme.colors.primary} />
                        <Text style={[styles.actionPresetText, { fontWeight: 'bold', color: theme.colors.primary }]}>Every Frame (on tick)</Text>
                      </TouchableOpacity>
                    )}
                    {matchesSearch('On Start') && matchesSearch('on_start') && (
                      <TouchableOpacity
                        style={styles.actionPresetItem}
                        onPress={() => {
                          if (handleEventSelect) handleEventSelect('on_start');
                          else if ((global as any).handleEventSelect) (global as any).handleEventSelect('on_start');
                          setEventPickerVisible(false);
                          setSearchQuery('');
                        }}
                      >
                        <Zap size={14} color={theme.colors.secondary} />
                        <Text style={[styles.actionPresetText, { fontWeight: 'bold', color: theme.colors.secondary }]}>On Start (once)</Text>
                      </TouchableOpacity>
                    )}
                    {matchesSearch('Timer') && matchesSearch('on_timer') && (
                      <TouchableOpacity
                        style={styles.actionPresetItem}
                        onPress={() => {
                          if (handleEventSelect) handleEventSelect('on_timer:1000');
                          else if ((global as any).handleEventSelect) (global as any).handleEventSelect('on_timer:1000');
                          setEventPickerVisible(false);
                          setSearchQuery('');
                        }}
                      >
                        <Clock size={14} color={theme.colors.warning} />
                        <Text style={[styles.actionPresetText, { color: theme.colors.warning }]}>Timer (every 1 second)</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

              {/* Built-in Movements */}
              {([
                { id: 'builtin_jump', label: 'When Player Jumps (Built-in)' },
                { id: 'on_jump_press', label: 'On Jump Button (Global)' },
                { id: 'builtin_left', label: 'When Player Moves Left' },
                { id: 'builtin_right', label: 'When Player Moves Right' },
                { id: 'builtin_tap', label: 'When Screen Tapped' },
                { id: 'on_screen_tap', label: 'On Screen Tap (Global)' },
                { id: 'on_release', label: 'On Object Release' },
                { id: 'wait_until:', label: 'Wait Until (Condition)' },
              ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).length > 0) && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.subSectionTitleCompact}>Built-in Movements</Text>
                    {[
                      { id: 'builtin_jump', label: 'When Player Jumps (Built-in)' },
                      { id: 'on_jump_press', label: 'On Jump Button (Global)' },
                      { id: 'builtin_left', label: 'When Player Moves Left' },
                      { id: 'builtin_right', label: 'When Player Moves Right' },
                      { id: 'builtin_tap', label: 'When Screen Tapped' },
                      { id: 'on_screen_tap', label: 'On Screen Tap (Global)' },
                      { id: 'on_release', label: 'On Object Release' },
                      { id: 'wait_until:', label: 'Wait Until (Condition)' },
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
                        {ev.id === 'builtin_jump' && <ChevronUp size={14} color={theme.colors.primary} />}
                        {ev.id === 'builtin_left' && <ArrowLeft size={14} color={theme.colors.primary} />}
                        {ev.id === 'builtin_right' && <ArrowRight size={14} color={theme.colors.primary} />}
                        {ev.id === 'builtin_tap' && <MousePointer2 size={14} color={theme.colors.primary} />}
                        {ev.id === 'on_screen_tap' && <MousePointer2 size={14} color={theme.colors.secondary} />}
                        {ev.id === 'on_release' && <Pause size={14} color={theme.colors.error} />}
                        <Text style={styles.actionPresetText}>{ev.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

              {/* Progress Bar & Stats */}
              {([
                { id: 'on_empty', label: 'On Empty (0%)' },
                { id: 'on_full', label: 'On Full (100%)' },
                { id: 'on_life_lost', label: 'On Life Lost' },
                { id: 'on_zero_lives', label: 'On Zero Lives' },
              ].filter(ev => matchesSearch(ev.label) || matchesSearch(ev.id)).length > 0) && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.subSectionTitleCompact}>Progress Bar & Stats</Text>
                    {[
                      { id: 'on_empty', label: 'On Empty (0%)', icon: Activity, color: theme.colors.error },
                      { id: 'on_full', label: 'On Full (100%)', icon: Activity, color: theme.colors.primary },
                      { id: 'on_life_lost', label: 'On Life Lost', icon: Heart, color: theme.colors.error },
                      { id: 'on_zero_lives', label: 'On Zero Lives', icon: Heart, color: theme.colors.error },
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
                  </>
                )}

              {/* Game Audio */}
              {([
                { id: 'on_start_sound', label: 'When ANY Sound Starts' },
                { id: 'on_stop_sound', label: 'When ANY Sound Stops' },
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

              {/* Collisions */}
              {((matchesSearch('collision') || matchesSearch('hit')).length > 0 || (currentProject?.objects || []).filter((obj: any) => matchesSearch(obj.name)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Collisions & Interactions</Text>
                  {matchesSearch('collision') && (
                    <TouchableOpacity
                      style={styles.actionPresetItem}
                      onPress={() => {
                        if (handleEventSelect) handleEventSelect('on_collision');
                        else if ((global as any).handleEventSelect) (global as any).handleEventSelect('on_collision');
                        setEventPickerVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <Bolt size={14} color="#FFAC00" />
                      <Text style={styles.actionPresetText}>On Any Collision</Text>
                    </TouchableOpacity>
                  )}
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

              {/* Object Comparison Triggers */}
              {((currentProject?.objects || []).filter((o: any) => o.id !== selectedObject?.id && matchesSearch(o.name)).length > 0) && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Object Comparison Triggers</Text>
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
                {['x', 'y', 'vx', 'vy', 'width', 'height', 'health', 'angle', 'scale', 'value', 'current_count', 'max_count'].map(p => (
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
                  if (handleActionSelect) handleActionSelect('restart_room');
                  else if ((global as any).handleActionSelect) (global as any).handleActionSelect('restart_room');
                  setActionPickerVisible(false);
                }}
              >
                <GitBranch size={14} color={theme.colors.info} />
                <Text style={styles.actionPresetText}>Restart Room</Text>
              </TouchableOpacity>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Sprite Repeater / Lives</Text>
              {[
                { id: 'damage:1', label: 'Damage (-1 Life)', icon: Heart, color: theme.colors.error },
                { id: 'heal:1', label: 'Heal (+1 Life)', icon: Heart, color: theme.colors.success },
                { id: 'set_count:3', label: 'Set Lives Count', icon: Heart, color: theme.colors.primary },
              ].map(act => (
                <TouchableOpacity
                  key={act.id}
                  style={styles.actionPresetItem}
                  onPress={() => {
                    if (handleActionSelect) handleActionSelect(act.id);
                    else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act.id);
                    setActionPickerVisible(false);
                  }}
                >
                  <act.icon size={14} color={act.color} />
                  <Text style={[styles.actionPresetText, { color: act.color }]}>{act.label}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Movement & Rotation</Text>
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
              <Text style={styles.subSectionTitleCompact}>Progress Bar Actions</Text>
              <View style={styles.pickerRowSmall}>
                {[
                  { id: 'set_value:50', label: 'SET VALUE' },
                  { id: 'add_value:-10', label: 'CHANGE BAR' },
                  { id: 'tween_to:100:1000', label: 'TWEEN TO' },
                  { id: 'bind_to_variable:', label: 'BIND TO VAR' },
                  { id: 'damage:1', label: 'DAMAGE' },
                  { id: 'heal:1', label: 'HEAL' },
                  { id: 'set_count:3', label: 'SET COUNT' },
                ].map(act => (
                  <TouchableOpacity key={act.id} style={[styles.pickerChipSecondary, { borderColor: theme.colors.primary }]} onPress={() => {
                    if (handleActionSelect) handleActionSelect(act.id);
                    else if ((global as any).handleActionSelect) (global as any).handleActionSelect(act.id);
                    setActionPickerVisible(false);
                  }}>
                    <Text style={[styles.pickerChipTextSmall, { color: theme.colors.primary }]}>{act.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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
              <Text style={styles.subSectionTitleCompact}>Game Audio</Text>
              <View style={styles.pickerRowSmall}>
                {(currentProject?.sounds || []).map((snd: any) => (
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
