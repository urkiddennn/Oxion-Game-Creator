import React, { JSX, useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Switch, Image, StyleSheet } from 'react-native';
import { Info, Palette, Bolt, Share2, Settings, X, Plus, Trash2, Heart, Music, Target, Layers, Play, ArrowLeft, ArrowRight, Pause, ChevronUp, Zap, MousePointer2, HelpCircle, Layout, Globe, Activity } from 'lucide-react-native';
import { theme } from '../../../../theme';
import { GameObject, useProjectStore } from '../../../../store/useProjectStore';
import { styles } from './ObjectInspectorModal.styles';

interface ObjectInspectorModalProps {
  visible: boolean;
  onClose: () => void;
  selectedObject: GameObject | null;
  setSelectedObject: (obj: GameObject | null) => void;
  currentProject: any;
  updateObject: (id: string, updates: Partial<GameObject>) => void;
  setSpritePickerVisible: (visible: boolean) => void;
  renderSpritePreview: (spriteId: string | null, size?: number) => JSX.Element;
}

const VariableRow = ({
  varKey,
  value,
  onRename,
  onChangeValue,
  onPromote,
  onDelete,
  isGlobal = false
}: any) => {
  const [localKey, setLocalKey] = useState(varKey);

  useEffect(() => {
    setLocalKey(varKey);
  }, [varKey]);

  return (
    <View style={styles.variableRow}>
      {isGlobal ? (
        <Text style={[styles.varName, { opacity: 0.7 }]}>{varKey}</Text>
      ) : (
        <TextInput
          style={styles.varName}
          value={localKey}
          onChangeText={setLocalKey}
          onBlur={() => {
            if (localKey !== varKey && localKey.trim() !== '') {
              onRename(varKey, localKey);
            } else {
              setLocalKey(varKey);
            }
          }}
        />
      )}
      <TextInput
        style={styles.varValue}
        value={String(value)}
        onChangeText={onChangeValue}
      />
      <View style={styles.varActions}>
        {!isGlobal && onPromote && (
          <TouchableOpacity onPress={onPromote}>
            <Globe size={14} color={theme.colors.secondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onDelete}>
          <Trash2 size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ParticlePreview = ({ settings, particleSprite }: { settings: any, particleSprite: any }) => {
  const [p, setP] = useState<{ id: number, x: number, y: number, vx: number, vy: number, life: number }[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);

  useEffect(() => {
    if (!settings.enabled || !settings.particleObjectId) { setP([]); return; }

    const update = () => {
      const now = Date.now();
      setP(prev => {
        const next = prev.map(pt => ({
          ...pt,
          x: pt.x + pt.vx,
          y: pt.y + pt.vy,
          life: pt.life - 16
        })).filter(pt => pt.life > 0);

        const interval = 1000 / (settings.rate || 5);
        if (now - lastSpawnRef.current > interval) {
          lastSpawnRef.current = now;
          const angle = (Math.random() * (settings.spread || 45) - (settings.spread || 45) / 2) - 90;
          const rad = angle * Math.PI / 180;
          next.push({
            id: Math.random(),
            x: 50, y: 80,
            vx: Math.cos(rad) * (settings.speed || 2) * 0.5,
            vy: Math.sin(rad) * (settings.speed || 2) * 0.5,
            life: settings.lifetime || 1000
          });
        }
        return next;
      });
      frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [settings.enabled, settings.particleObjectId, settings.rate, settings.spread, settings.speed, settings.lifetime]);

  return (
    <View style={styles.previewContainer}>
      {p.map(pt => (
        <View
          key={pt.id}
          style={[
            styles.previewParticle,
            {
              left: `${pt.x}%`,
              top: `${pt.y}%`,
              backgroundColor: particleSprite?.color || theme.colors.primary,
              opacity: pt.life / settings.lifetime
            }
          ]}
        />
      ))}
      <View style={styles.previewSource} />
    </View>
  );
};

export default function ObjectInspectorModal({
  visible, onClose, selectedObject, setSelectedObject, currentProject,
  updateObject, setSpritePickerVisible, renderSpritePreview
}: ObjectInspectorModalProps) {
  const [actionPickerVisible, setActionPickerVisible] = useState(false);
  const [activeListenerIndex, setActiveListenerIndex] = useState<number | null>(null);
  const [eventPickerVisible, setEventPickerVisible] = useState(false);
  const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [activePropertyIndex, setActivePropertyIndex] = useState<number | null>(null);
  const [pickingForCondition, setPickingForCondition] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    about: true,
    appearance: false,
    animations: false,
    physics: false,
    combat: false,
    sounds: false,
    logic: false,
    variables: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!selectedObject) return null;

  const safeObject = {
    ...selectedObject,
    health: selectedObject.health || { max: 100, current: 100 },
    animations: selectedObject.animations || {},
    appearance: {
      ...selectedObject.appearance,
      animationSpeed: selectedObject.appearance?.animationSpeed || 100,
    },
    physics: {
      enabled: true,
      isStatic: false,
      applyGravity: true,
      friction: 0.1,
      density: 0.001,
      jumpStrength: 10,
      moveSpeed: 5,
      ignoreCollision: false,
      ...selectedObject.physics,
    },
    combat: {
      canShoot: false,
      maxBullets: 3,
      bulletObjectId: null,
      damage: 10,
      shootSpeed: 5,
      canShootInAir: true,
      canMelee: false,
      meleeDamage: 20,
      canMeleeInAir: true,
      explodes: false,
      ...selectedObject.combat,
    },
    sounds: selectedObject.sounds || {},
    variables: {
      local: (selectedObject.variables as any)?.local ||
        (selectedObject.variables && typeof selectedObject.variables === 'object' && !('local' in selectedObject.variables) ? selectedObject.variables : {}) ||
        {},
    },
    logic: {
      triggers: { onTap: '', onCollision: '', ...selectedObject.logic?.triggers },
      listeners: selectedObject.logic?.listeners || [],
    },
    emitter: {
      enabled: false,
      particleObjectId: null,
      rate: 5,
      lifetime: 1000,
      speed: 2,
      spread: 45,
      gravityScale: 0,
      burst: false,
      ...selectedObject.emitter,
    },
  };

  const globalVars = currentProject?.variables?.global || {};

  const otherObjects = useMemo(() => {
    return (currentProject?.objects || []).filter((obj: GameObject) => obj.id !== safeObject.id);
  }, [currentProject?.objects, safeObject.id]);

  const updateField = (path: string, value: any) => {
    const parts = path.split('.');
    if (parts.length === 1) {
      updateObject(safeObject.id, { [parts[0]]: value });
    } else if (parts.length === 2) {
      updateObject(safeObject.id, {
        [parts[0]]: { ...(safeObject as any)[parts[0]], [parts[1]]: value },
      });
    } else if (parts.length === 3) {
      updateObject(safeObject.id, {
        [parts[0]]: {
          ...(safeObject as any)[parts[0]],
          [parts[1]]: { ...(safeObject as any)[parts[0]][parts[1]], [parts[2]]: value },
        },
      });
    }
  };

  const handleActionSelect = (actionStr: string) => {
    const currentListeners = safeObject.logic?.listeners || [];
    const newListeners = [...currentListeners];
    if (activeListenerIndex !== null) {
      if (pickingForCondition) {
        newListeners[activeListenerIndex] = { ...newListeners[activeListenerIndex], conditionAction: actionStr };
      } else {
        newListeners[activeListenerIndex] = { ...newListeners[activeListenerIndex], action: actionStr };
      }
    } else {
      newListeners.push({ eventId: '', action: actionStr });
    }
    updateField('logic.listeners', newListeners);
    setActionPickerVisible(false);
    setPickingForCondition(false);
  };

  const handleEventSelect = (eventId: string) => {
    const currentListeners = safeObject.logic?.listeners || [];
    if (activeEventIndex !== null) {
      const newListeners = [...currentListeners];
      newListeners[activeEventIndex] = { ...newListeners[activeEventIndex], eventId };
      updateField('logic.listeners', newListeners);
    }
    setEventPickerVisible(false);
  };

  const handlePropertySelect = (propStr: string) => {
    const currentListeners = safeObject.logic?.listeners || [];
    if (activePropertyIndex !== null) {
      const newListeners = [...currentListeners];
      const currentCond = newListeners[activePropertyIndex].condition || '';
      const lastChar = currentCond.trim().slice(-1);
      const isOp = ['>', '<', '=', '!'].includes(lastChar);
      const newVal = currentCond + (currentCond && !isOp ? ' ' : '') + propStr;

      newListeners[activePropertyIndex] = { ...newListeners[activePropertyIndex], condition: newVal };
      updateField('logic.listeners', newListeners);
    }
    setPropertyPickerVisible(false);
  };

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={styles.inspectorOverlay}>
          <View style={styles.inspectorContent}>
            <View style={styles.inspectorHeader}>
              <Text style={styles.inspectorTitle}>Object Inspector</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.saveText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <Section
                title="About"
                icon={<Info size={16} color={theme.colors.primary} />}
                expanded={expandedSections.about}
                onToggle={() => toggleSection('about')}
              >
                <InputGroup label="Name" value={safeObject.name} onChange={(v: string) => updateField('name', v)} />
                {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy') && (
                  <View style={[styles.subSection, { marginTop: 12 }]}>
                    <Text style={styles.subSectionTitleCompact}>Health Stats</Text>
                    <View style={styles.switchRowCompact}>
                      <Text style={styles.inputLabel}>Max Health</Text>
                      <TextInput
                        style={styles.inspectorInputCompact}
                        keyboardType="numeric"
                        value={safeObject.health.max.toString()}
                        onChangeText={(v: string) => updateField('health.max', parseInt(v) || 0)}
                      />
                    </View>
                  </View>
                )}
              </Section>

              {safeObject.behavior !== 'text' && (
                <Section
                  title="Appearance"
                  icon={<Palette size={16} color={theme.colors.secondary} />}
                  expanded={expandedSections.appearance}
                  onToggle={() => toggleSection('appearance')}
                >
                  <TouchableOpacity
                    style={styles.spriteSelectButtonCompact}
                    onPress={() => setSpritePickerVisible(true)}
                  >
                    <View style={styles.spritePreviewContainerSmall}>
                      {renderSpritePreview(safeObject.appearance.spriteId, 32)}
                    </View>
                    <Text style={styles.spriteSelectLabelSmall}>
                      {safeObject.appearance.spriteId
                        ? (currentProject?.sprites || []).find((s: any) => s.id === safeObject.appearance.spriteId)?.name
                        : 'Select Sprite'}
                    </Text>
                  </TouchableOpacity>

                  {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy' || safeObject.behavior === 'particle') && (
                    <InputGroup
                      label="Animation Speed (ms)"
                      value={safeObject.appearance.animationSpeed.toString()}
                      onChange={(v: string) => updateField('appearance.animationSpeed', parseInt(v) || 0)}
                      keyboardType="numeric"
                    />
                  )}
                </Section>
              )}

              {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy') && (
                <Section
                  title="Animation States"
                  icon={<Layers size={16} color="#FF00D1" />}
                  expanded={expandedSections.animations}
                  onToggle={() => toggleSection('animations')}
                >
                  {['idle', 'move', 'jump', 'hit', 'dead', 'melee', 'shoot'].map(state => (
                    <View key={state} style={styles.animationStateRow}>
                      <Text style={styles.animationStateLabel}>{state.toUpperCase()}</Text>
                      <TouchableOpacity
                        style={styles.miniSpritePicker}
                        onPress={() => { }}
                      >
                        {renderSpritePreview((safeObject.animations as any)[state], 24)}
                        <Text style={styles.miniSpriteText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </Section>
              )}

              <Section
                title="Physics & Movement"
                icon={<Zap size={16} color={theme.colors.warning} />}
                expanded={expandedSections.physics}
                onToggle={() => toggleSection('physics')}
              >
                <SwitchRow label="Enabled" value={safeObject.physics.enabled} onToggle={(v: boolean) => updateField('physics.enabled', v)} />
                {safeObject.physics.enabled && (
                  <>
                    <SwitchRow label="Static (Fixed)" value={safeObject.physics.isStatic} onToggle={(v: boolean) => updateField('physics.isStatic', v)} />
                    <SwitchRow label="Apply Gravity" value={safeObject.physics.applyGravity} onToggle={(v: boolean) => updateField('physics.applyGravity', v)} />
                    <SwitchRow label="Ignore Collision" value={safeObject.physics.ignoreCollision} onToggle={(v: boolean) => updateField('physics.ignoreCollision', v)} />
                    <InputGroup label="Move Speed" value={safeObject.physics.moveSpeed.toString()} onChange={(v: string) => updateField('physics.moveSpeed', parseFloat(v) || 0)} keyboardType="numeric" />
                    <InputGroup label="Jump Strength" value={safeObject.physics.jumpStrength.toString()} onChange={(v: string) => updateField('physics.jumpStrength', parseFloat(v) || 0)} keyboardType="numeric" />
                    <InputGroup label="Friction" value={safeObject.physics.friction.toString()} onChange={(v: string) => updateField('physics.friction', parseFloat(v) || 0)} keyboardType="numeric" />
                  </>
                )}
              </Section>

              {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy' || safeObject.behavior === 'bullet') && (
                <Section
                  title="Combat & Weapons"
                  icon={<Target size={16} color="#EF4444" />}
                  expanded={expandedSections.combat}
                  onToggle={() => toggleSection('combat')}
                >
                  {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy') && (
                    <>
                      <SwitchRow
                        label="Can Shoot"
                        value={safeObject.combat.canShoot}
                        onToggle={(v: boolean) => {
                          updateField('combat.canShoot', v);
                          if (v && !safeObject.combat.bulletObjectId) {
                            const firstOther = (currentProject?.objects || []).find((o: any) => o.id !== safeObject.id);
                            if (firstOther) updateField('combat.bulletObjectId', firstOther.id);
                          }
                        }}
                      />
                      {safeObject.combat.canShoot && (
                        <View style={styles.subSection}>
                          <Text style={styles.inputLabel}>BULLET OBJECT (PROJECTILE)</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                            {(currentProject?.objects || []).filter((o: any) => o.id !== safeObject.id).map((obj: any) => (
                              <TouchableOpacity
                                key={obj.id}
                                style={[
                                  styles.miniObjectSelect,
                                  safeObject.combat.bulletObjectId === obj.id && styles.miniObjectSelectActive
                                ]}
                                onPress={() => updateField('combat.bulletObjectId', obj.id)}
                              >
                                {renderSpritePreview(obj.appearance.spriteId, 24)}
                                <Text style={styles.miniObjectText}>{obj.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>

                          <InputGroup label="Max Bullets at Once" value={safeObject.combat.maxBullets.toString()} onChange={(v: string) => updateField('combat.maxBullets', parseInt(v) || 0)} keyboardType="numeric" />
                          <InputGroup label="Damage" value={safeObject.combat.damage.toString()} onChange={(v: string) => updateField('combat.damage', parseInt(v) || 0)} keyboardType="numeric" />
                          <InputGroup label="Bullet Speed" value={safeObject.combat.shootSpeed.toString()} onChange={(v: string) => updateField('combat.shootSpeed', parseFloat(v) || 0)} keyboardType="numeric" />
                          <SwitchRow label="Shoot in Air" value={safeObject.combat.canShootInAir} onToggle={(v: boolean) => updateField('combat.canShootInAir', v)} />
                        </View>
                      )}
                      <View style={styles.divider} />
                      <SwitchRow label="Can Melee" value={safeObject.combat.canMelee} onToggle={(v: boolean) => updateField('combat.canMelee', v)} />
                      {safeObject.combat.canMelee && (
                        <View style={styles.subSection}>
                          <InputGroup label="Melee Damage" value={safeObject.combat.meleeDamage.toString()} onChange={(v: string) => updateField('combat.meleeDamage', parseInt(v) || 0)} keyboardType="numeric" />
                          <SwitchRow label="Melee in Air" value={safeObject.combat.canMeleeInAir} onToggle={(v: boolean) => updateField('combat.canMeleeInAir', v)} />
                        </View>
                      )}
                    </>
                  )}

                  {(safeObject.behavior === 'bullet' || safeObject.behavior === 'enemy') && (
                    <View style={styles.subSection}>
                      <SwitchRow label="Explode on Contact" value={safeObject.combat.explodes} onToggle={(v: boolean) => updateField('combat.explodes', v)} />
                    </View>
                  )}
                </Section>
              )}

              {(safeObject.behavior === 'emitter' || safeObject.behavior === 'particle') && (
                <Section
                  title="Particle Emitter"
                  icon={<Zap size={16} color="#7000FF" />}
                  expanded={expandedSections.emitter}
                  onToggle={() => toggleSection('emitter')}
                >
                  <ParticlePreview
                    settings={safeObject.emitter}
                    particleSprite={(currentProject?.sprites || []).find((s: { id: string | null; }) => s.id === (currentProject?.objects || []).find((o: { id: string | null; }) => o.id === safeObject.emitter.particleObjectId)?.appearance.spriteId)}
                  />

                  <SwitchRow label="Emitter Enabled" value={safeObject.emitter.enabled} onToggle={(v: boolean) => updateField('emitter.enabled', v)} />
                  {safeObject.emitter.enabled && (
                    <>
                      <View style={styles.subSection}>
                        <Text style={styles.inputLabel}>EMITS OBJECT</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                          {(currentProject?.objects || []).filter((o: any) => o.id !== safeObject.id).map((obj: any) => (
                            <TouchableOpacity
                              key={obj.id}
                              style={[
                                styles.miniObjectSelect,
                                safeObject.emitter.particleObjectId === obj.id && styles.miniObjectSelectActive
                              ]}
                              onPress={() => updateField('emitter.particleObjectId', obj.id)}
                            >
                              {renderSpritePreview(obj.appearance.spriteId, 24)}
                              <Text style={styles.miniObjectText}>{obj.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      <InputGroup label="Particles / Sec" value={safeObject.emitter.rate.toString()} onChange={(v: string) => updateField('emitter.rate', parseInt(v) || 0)} keyboardType="numeric" />
                      <InputGroup label="Lifetime (ms)" value={safeObject.emitter.lifetime.toString()} onChange={(v: string) => updateField('emitter.lifetime', parseInt(v) || 0)} keyboardType="numeric" />
                      <InputGroup label="Initial Speed" value={safeObject.emitter.speed.toString()} onChange={(v: string) => updateField('emitter.speed', parseFloat(v) || 0)} keyboardType="numeric" />
                      <InputGroup label="Spread Angle (°)" value={safeObject.emitter.spread.toString()} onChange={(v: string) => updateField('emitter.spread', parseInt(v) || 0)} keyboardType="numeric" />
                      <InputGroup label="Particle Gravity Scale" value={safeObject.emitter.gravityScale.toString()} onChange={(v: string) => updateField('emitter.gravityScale', parseFloat(v) || 0)} keyboardType="numeric" />
                      <SwitchRow label="Burst Mode" value={safeObject.emitter.burst} onToggle={(v: boolean) => updateField('emitter.burst', v)} />
                    </>
                  )}
                </Section>
              )}

              {safeObject.behavior === 'text' && (
                <Section
                  title="Text Settings"
                  icon={<Layout size={16} color="#FFFFFF" />}
                  expanded={expandedSections.text || true}
                  onToggle={() => toggleSection('text')}
                >
                  <View style={styles.subSection}>
                    <Text style={styles.inputLabel}>DISPLAY TEXT</Text>
                    <TextInput
                      style={styles.logicInput}
                      value={safeObject.text?.content || ''}
                      onChangeText={(v) => updateField('text.content', v)}
                      placeholder="Score: {score}"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <Text style={styles.miniLabel}>Use {"{var}"} to show global variables</Text>

                    <View style={[styles.pickerRowSmall, { marginTop: 4 }]}>
                      {Object.keys(globalVars).map(varName => (
                        <TouchableOpacity
                          key={varName}
                          style={styles.pickerChipSecondary}
                          onPress={() => {
                            const currentContent = safeObject.text?.content || '';
                            updateField('text.content', currentContent + `{${varName}}`);
                          }}
                        >
                          <Text style={styles.pickerChipTextSmall}>{varName}</Text>
                        </TouchableOpacity>
                      ))}
                      {Object.keys(globalVars).length === 0 && (
                        <Text style={[styles.infoTextSmall, { marginTop: 0 }]}>No global variables created yet.</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.subSection}>
                    <Text style={styles.inputLabel}>FONT FAMILY</Text>
                    <View style={styles.pickerRowSmall}>
                      {['default', 'pixel'].map(f => (
                        <TouchableOpacity
                          key={f}
                          style={[styles.pickerChip, safeObject.text?.fontFamily === f && { borderColor: theme.colors.primary }]}
                          onPress={() => updateField('text.fontFamily', f)}
                        >
                          <Text style={[styles.pickerChipText, { fontFamily: f === 'pixel' ? 'Pixel' : undefined }]}>
                            {f.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <InputGroup label="Size" value={safeObject.text?.fontSize?.toString() || '24'} onChange={(v: string) => updateField('text.fontSize', parseInt(v) || 12)} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <InputGroup label="Color" value={safeObject.text?.color || '#FFFFFF'} onChange={(v: string) => updateField('text.color', v)} />
                    </View>
                  </View>

                  <View style={styles.subSection}>
                    <Text style={styles.inputLabel}>ALIGNMENT</Text>
                    <View style={styles.pickerRowSmall}>
                      {['left', 'center', 'right'].map(a => (
                        <TouchableOpacity
                          key={a}
                          style={[styles.pickerChip, safeObject.text?.textAlign === a && { borderColor: theme.colors.primary }]}
                          onPress={() => updateField('text.textAlign', a)}
                        >
                          <Text style={styles.pickerChipText}>{a.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </Section>
              )}

              <Section
                title="Sounds"
                icon={<Music size={16} color="#10B981" />}
                expanded={expandedSections.sounds}
                onToggle={() => toggleSection('sounds')}
              >
                {(safeObject.behavior === 'player' || safeObject.behavior === 'enemy') && (
                  <>
                    {['jump', 'shoot', 'melee', 'hit', 'dead', 'run'].map(sound => (
                      <View key={sound} style={styles.soundRow}>
                        <Text style={styles.inputLabel}>{sound.toUpperCase()}</Text>
                        <TouchableOpacity style={styles.soundPicker}>
                          <Play size={12} color={theme.colors.primary} />
                          <Text style={styles.soundText}>Select Sound</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}

                {safeObject.behavior === 'bullet' && (
                  <View style={styles.soundRow}>
                    <Text style={styles.inputLabel}>EXPLODE/HIT</Text>
                    <TouchableOpacity style={styles.soundPicker}>
                      <Play size={12} color={theme.colors.primary} />
                      <Text style={styles.soundText}>Select Sound</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {(safeObject.behavior !== 'player' && safeObject.behavior !== 'enemy' && safeObject.behavior !== 'bullet') && (
                  <Text style={styles.infoTextSmall}>No specific sounds for this behavior yet.</Text>
                )}
              </Section>

              <Section
                title="Logic & Actions"
                icon={<Zap size={16} color="#F59E0B" />}
                expanded={expandedSections.logic}
                onToggle={() => toggleSection('logic')}
              >
                <Text style={styles.subSectionTitleCompact}>Event Listeners</Text>
                {safeObject.logic.listeners.map((listener, index) => (
                  <View key={index} style={styles.logicChainContainer}>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.logicBlockTitle}>WHEN</Text>
                        <View style={styles.logicBlock}>
                          <TextInput
                            style={styles.logicInput}
                            value={listener.eventId}
                            onChangeText={(v) => {
                              const newListeners = [...safeObject.logic.listeners];
                              newListeners[index] = { ...listener, eventId: v };
                              updateField('logic.listeners', newListeners);
                            }}
                            placeholder="every_tick"
                          />
                          <TouchableOpacity onPress={() => { setActiveEventIndex(index); setEventPickerVisible(true); }}>
                            <Zap size={12} color="#F59E0B" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.logicBlockTitle}>DO</Text>
                        <View style={[styles.logicBlock, { borderColor: theme.colors.secondary + '40' }]}>
                          <TextInput
                            style={styles.logicInput}
                            value={listener.action}
                            onChangeText={(v) => {
                              const newListeners = [...safeObject.logic.listeners];
                              newListeners[index] = { ...listener, action: v };
                              updateField('logic.listeners', newListeners);
                            }}
                            placeholder="jump"
                          />
                          <TouchableOpacity onPress={() => { setActiveListenerIndex(index); setActionPickerVisible(true); }}>
                            <Target size={12} color={theme.colors.secondary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {listener.condition ? (
                      <View style={{ marginTop: 10 }}>
                        <View style={styles.logicConnectorSmall} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.logicBlock, { flex: 2, borderColor: theme.colors.primary + '40' }]}>
                            <Text style={[styles.logicBlockTitle, { marginRight: 8 }]}>IF</Text>
                            <TextInput
                              style={styles.logicInput}
                              value={listener.condition}
                              onChangeText={(v) => {
                                const newListeners = [...safeObject.logic.listeners];
                                newListeners[index] = { ...listener, condition: v };
                                updateField('logic.listeners', newListeners);
                              }}
                              placeholder="score > 10"
                            />
                            <TouchableOpacity onPress={() => { setActivePropertyIndex(index); setPropertyPickerVisible(true); }}>
                              <Layers size={12} color={theme.colors.primary} />
                            </TouchableOpacity>
                          </View>

                          <View style={[styles.logicBlock, { flex: 2, borderColor: theme.colors.secondary + '40' }]}>
                            <Text style={[styles.logicBlockTitle, { marginRight: 8 }]}>THEN</Text>
                            <TextInput
                              style={styles.logicInput}
                              value={listener.conditionAction}
                              onChangeText={(v) => {
                                const newListeners = [...safeObject.logic.listeners];
                                newListeners[index] = { ...listener, conditionAction: v };
                                updateField('logic.listeners', newListeners);
                              }}
                              placeholder="score + 1"
                            />
                            <TouchableOpacity onPress={() => {
                              setActiveListenerIndex(index);
                              setPickingForCondition(true);
                              setActionPickerVisible(true);
                            }}>
                              <Target size={12} color={theme.colors.secondary} />
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity onPress={() => {
                            const newListeners = [...safeObject.logic.listeners];
                            newListeners[index] = { ...listener, condition: '' };
                            updateField('logic.listeners', newListeners);
                          }}>
                            <X size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addConditionBtn}
                        onPress={() => {
                          const newListeners = [...safeObject.logic.listeners];
                          newListeners[index] = { ...listener, condition: 'this.x > 0' };
                          updateField('logic.listeners', newListeners);
                        }}
                      >
                        <Plus size={10} color={theme.colors.primary} />
                        <Text style={styles.addConditionText}>ADD CONDITION (IF)</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.logicDeleteButton}
                      onPress={() => {
                        const currentListeners = safeObject.logic?.listeners || [];
                        const newListeners = currentListeners.filter((_, i) => i !== index);
                        updateField('logic.listeners', newListeners);
                      }}>
                      <Trash2 size={12} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addButtonCompact}
                  onPress={() => {
                    setActiveListenerIndex(null);
                    setActionPickerVisible(true);
                  }}
                >
                  <Plus size={14} color={theme.colors.primary} />
                  <Text style={styles.addButtonTextSmall}>Add Action Listener</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.subSectionTitleCompact}>Broadcast Triggers</Text>
                <InputGroup
                  label="On Tap (Emit Event ID)"
                  value={safeObject.logic.triggers.onTap || ''}
                  onChange={(v) => updateField('logic.triggers.onTap', v)}
                />
                <InputGroup
                  label="On Collision (Emit Event ID)"
                  value={safeObject.logic.triggers.onCollision || ''}
                  onChange={(v) => updateField('logic.triggers.onCollision', v)}
                />
              </Section>

              <Section
                title="Variables"
                icon={<Settings size={16} color={theme.colors.primary} />}
                expanded={expandedSections.variables}
                onToggle={() => toggleSection('variables')}
              >
                <Text style={styles.subSectionTitleCompact}>Local Variables (Local to this Object)</Text>
                {Object.entries(safeObject.variables.local || {}).map(([key, value], index) => (
                  <VariableRow
                    key={`local-${index}`}
                    varKey={key}
                    value={value}
                    onRename={(oldKey: string, newKey: string) => {
                      const newLocal = { ...safeObject.variables.local };
                      newLocal[newKey] = value;
                      delete newLocal[oldKey];
                      updateField('variables.local', newLocal);
                    }}
                    onChangeValue={(v: string) => {
                      const newLocal = { ...safeObject.variables.local, [key]: v };
                      updateField('variables.local', newLocal);
                    }}
                    onPromote={() => useProjectStore.getState().promoteVariableToGlobal(safeObject.id, key)}
                    onDelete={() => useProjectStore.getState().deleteLocalVariable(safeObject.id, key)}
                  />
                ))}
                <TouchableOpacity
                  style={styles.addButtonCompact}
                  onPress={() => {
                    const newLocal = { ...safeObject.variables.local, [`var_${Object.keys(safeObject.variables.local || {}).length}`]: 0 };
                    updateField('variables.local', newLocal);
                  }}
                >
                  <Plus size={14} color={theme.colors.primary} />
                  <Text style={styles.addButtonTextSmall}>Add Local Variable</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.subSectionTitleCompact}>Global Variables (Project-wide)</Text>
                {Object.entries(globalVars).map(([key, value], index) => (
                  <VariableRow
                    key={`global-${index}`}
                    varKey={key}
                    value={value}
                    isGlobal={true}
                    onChangeValue={(v: string) => {
                      const newGlobals = { ...currentProject.variables.global, [key]: v };
                      useProjectStore.getState().updateProject({ variables: { global: newGlobals } });
                    }}
                    onDelete={() => useProjectStore.getState().deleteGlobalVariable(key)}
                  />
                ))}
                <Text style={styles.infoTextSmall}>Global variables can be managed in Project Settings.</Text>
              </Section>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Event Picker Modal */}
      <Modal visible={eventPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '100%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Event Trigger</Text>
              <TouchableOpacity onPress={() => setEventPickerVisible(false)}>
                <X color={theme.colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.subSectionTitleCompact}>Engine Events</Text>
              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => handleEventSelect('on_tick')}
              >
                <Activity size={14} color={theme.colors.primary} />
                <Text style={[styles.actionPresetText, { fontWeight: 'bold', color: theme.colors.primary }]}>Every Frame (on tick)</Text>
              </TouchableOpacity>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Built-in Movements</Text>
              {[
                { id: 'builtin_jump', label: 'When Player Jumps' },
                { id: 'builtin_left', label: 'When Player Moves Left' },
                { id: 'builtin_right', label: 'When Player Moves Right' },
                { id: 'builtin_tap', label: 'When Screen Tapped' },
              ].map(ev => (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.actionPresetItem}
                  onPress={() => handleEventSelect(ev.id)}
                >
                  {ev.id === 'builtin_jump' && <ChevronUp size={14} color={theme.colors.primary} />}
                  {ev.id === 'builtin_left' && <ArrowLeft size={14} color={theme.colors.primary} />}
                  {ev.id === 'builtin_right' && <ArrowRight size={14} color={theme.colors.primary} />}
                  {ev.id === 'builtin_tap' && <MousePointer2 size={14} color={theme.colors.primary} />}
                  <Text style={styles.actionPresetText}>{ev.label}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Collisions & Interactions</Text>
              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => handleEventSelect('on_collision')}
              >
                <Bolt size={14} color="#FFAC00" />
                <Text style={styles.actionPresetText}>On Any Collision</Text>
              </TouchableOpacity>

              <Text style={[styles.subSectionTitleCompact, { marginTop: 12, marginBottom: 8, fontSize: 11, opacity: 0.8 }]}>When hitting specific Object:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(currentProject?.objects || []).map((obj: GameObject) => (
                  <TouchableOpacity
                    key={obj.id}
                    style={styles.objectPickerItemSmall}
                    onPress={() => handleEventSelect(`collision:${obj.name}`)}
                  >
                    <View style={styles.objectPickerSpriteBox}>
                      {renderSpritePreview(obj.appearance?.spriteId, 32)}
                    </View>
                    <Text style={styles.objectPickerNameSmall} numberOfLines={1}>{obj.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Broadcast Triggers (from other objects)</Text>
              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => handleEventSelect('on_tap')}
              >
                <Target size={14} color={theme.colors.secondary} />
                <Text style={styles.actionPresetText}>On Tap Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => handleEventSelect('on_collision')}
              >
                <Zap size={14} color={theme.colors.warning} />
                <Text style={styles.actionPresetText}>On Collision Event</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Property Picker Modal */}
      <Modal visible={propertyPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Insert Property / Variable</Text>
              <TouchableOpacity onPress={() => setPropertyPickerVisible(false)}>
                <X color={theme.colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.subSectionTitleCompact}>Current Object (this)</Text>
              <View style={styles.pickerRowSmall}>
                {['this.x', 'this.y', 'this.vx', 'this.vy'].map(p => (
                  <TouchableOpacity key={p} style={styles.pickerChip} onPress={() => handlePropertySelect(p)}>
                    <Text style={styles.pickerChipText}>{p.split('.')[1].toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Project Variables</Text>
              <View style={styles.pickerRowSmall}>
                {Object.keys(currentProject?.variables?.global || {}).map(v => (
                  <TouchableOpacity key={v} style={styles.pickerChip} onPress={() => handlePropertySelect(v)}>
                    <Text style={styles.pickerChipText}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {otherObjects.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subSectionTitleCompact}>Other Project Objects</Text>
                  {otherObjects.map((obj: GameObject) => {
                    const displayName = obj.name || obj.behavior || 'Unnamed Object';
                    const targetId = obj.name || obj.behavior || obj.id;
                    return (
                      <View key={obj.id} style={{ marginBottom: 12 }}>
                        <Text style={[styles.miniLabel, { color: theme.colors.primary }]}>{displayName.toUpperCase()}</Text>
                        <View style={styles.pickerRowSmall}>
                          {['x', 'y', 'vx', 'vy'].map(p => (
                            <TouchableOpacity key={p} style={styles.pickerChipSecondary} onPress={() => handlePropertySelect(`${targetId}.${p}`)}>
                              <Text style={styles.pickerChipTextSmall}>{p.toUpperCase()}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Operators</Text>
              <View style={styles.pickerRowSmall}>
                {['>', '<', '==', '!=', '+', '-'].map(op => (
                  <TouchableOpacity key={op} style={[styles.pickerChip, { backgroundColor: theme.colors.surfaceElevated }]} onPress={() => handlePropertySelect(op)}>
                    <Text style={styles.pickerChipText}>{op}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Action Picker Modal */}
      <Modal visible={actionPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
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
                onPress={() => handleActionSelect('jump')}
              >
                <ChevronUp size={14} color={theme.colors.primary} />
                <Text style={styles.actionPresetText}>Jump</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => handleActionSelect('move_left')}
              >
                <ArrowLeft size={14} color={theme.colors.secondary} />
                <Text style={styles.actionPresetText}>Move Left</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => handleActionSelect('move_right')}
              >
                <ArrowRight size={14} color={theme.colors.secondary} />
                <Text style={styles.actionPresetText}>Move Right</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionPresetItem}
                onPress={() => handleActionSelect('stop_x')}
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
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect(`var_add:${v}:1`)}>
                      <Text style={styles.pickerChipTextSmall}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect(`var_add:${v}:-1`)}>
                      <Text style={styles.pickerChipTextSmall}>-1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect(`var_set:${v}:0`)}>
                      <Text style={styles.pickerChipTextSmall}>SET 0</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Movement & Rotation</Text>
              <View style={styles.pickerRowSmall}>
                <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect('add_x:1')}>
                  <Text style={styles.pickerChipTextSmall}>X + 1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect('add_x:-1')}>
                  <Text style={styles.pickerChipTextSmall}>X - 1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect('add_y:1')}>
                  <Text style={styles.pickerChipTextSmall}>Y + 1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect('add_y:-1')}>
                  <Text style={styles.pickerChipTextSmall}>Y - 1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect('add_angle:5')}>
                  <Text style={styles.pickerChipTextSmall}>ROT + 5°</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect('add_angle:-5')}>
                  <Text style={styles.pickerChipTextSmall}>ROT - 5°</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Local Variables (This Object Only)</Text>
              {Object.keys(safeObject.variables.local || {}).map(v => (
                <View key={v} style={{ marginBottom: 12 }}>
                  <Text style={[styles.miniLabel, { color: theme.colors.secondary }]}>{v.toUpperCase()}</Text>
                  <View style={styles.pickerRowSmall}>
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect(`lvar_add:${v}:1`)}>
                      <Text style={styles.pickerChipTextSmall}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect(`lvar_add:${v}:-1`)}>
                      <Text style={styles.pickerChipTextSmall}>-1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect(`lvar_set:${v}:0`)}>
                      <Text style={styles.pickerChipTextSmall}>SET 0</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Scene Control</Text>
              <View style={styles.pickerRowSmall}>
                <TouchableOpacity style={styles.pickerChipSecondary} onPress={() => handleActionSelect('restart_room')}>
                  <Text style={styles.pickerChipTextSmall}>RESTART ROOM</Text>
                </TouchableOpacity>
                {(currentProject?.rooms || []).map((room: any) => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.pickerChipSecondary}
                    onPress={() => handleActionSelect(`go_to_room:${room.name}`)}
                  >
                    <Text style={styles.pickerChipTextSmall}>GO TO {room.name?.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
              <Text style={styles.subSectionTitleCompact}>Spawn Objects</Text>
              <View style={styles.pickerRowSmall}>
                {(currentProject?.objects || []).map((obj: GameObject) => (
                  <TouchableOpacity
                    key={obj.id}
                    style={styles.pickerChipSecondary}
                    onPress={() => handleActionSelect(`create_instance:${obj.id}:0:0`)}
                  >
                    <Text style={styles.pickerChipTextSmall}>SPAWN {obj.name?.toUpperCase() || 'OBJ'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Sub-components for cleaner JSX
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Section = ({ title, icon, expanded, onToggle, children }: SectionProps) => (
  <View style={styles.inspectorSectionCompact}>
    <TouchableOpacity style={styles.sectionHeaderAccordion} onPress={onToggle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon}
        <Text style={styles.sectionLabel}>{title}</Text>
      </View>
      <X size={14} color={theme.colors.textMuted} style={{ transform: [{ rotate: expanded ? '45deg' : '0deg' }] }} />
    </TouchableOpacity>
    {expanded && <View style={styles.sectionContent}>{children}</View>}
  </View>
);

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
}

const InputGroup = ({ label, value, onChange, keyboardType = 'default' }: InputGroupProps) => (
  <View style={styles.inputGroupCompact}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.inspectorInputCompact} value={value} onChangeText={onChange} keyboardType={keyboardType} />
  </View>
);

interface SwitchRowProps {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

const SwitchRow = ({ label, value, onToggle }: SwitchRowProps) => (
  <View style={styles.switchRowCompact}>
    <Text style={styles.inputLabel}>{label}</Text>
    <Switch value={value} onValueChange={onToggle} />
  </View>
);

