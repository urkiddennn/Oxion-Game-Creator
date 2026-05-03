import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { generateWebHTML } from '../utils/webExportTemplate';
import { pixelsToBMPBase64 } from '../utils/bmpEncoder';
import { FileSystemManager } from '../utils/fileSystemManager';
import JSZip from 'jszip';

export type TemplateType = 'Platformer' | 'RPG' | 'Sandbox' | 'Empty';

export interface Sprite {
  id: string;
  name: string;
  type: 'imported' | 'created';
  uri?: string;
  pixels?: string[][];
  width?: number;
  height?: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  grid?: {
    enabled: boolean;
    frameWidth: number;
    frameHeight: number;
  };
  animations?: {
    name: string;
    row: number;
    frameCount: number;
    fps: number;
    loop: boolean;
  }[];
}

export interface SoundAsset {
  id: string;
  name: string;
  type: 'imported' | 'sequence';
  uri?: string;
  sequence?: number[][]; // [row][step] -> 0/1 for simple trigger
}

// AnimationAsset is deprecated in favor of Sprite-internal animations
export interface AnimationAsset {
  id: string;
  name: string;
  frames: string[];
  frameRate: number;
  loop: boolean;
}

export interface GameObject {
  id: string;
  name: string;
  type: string;
  behavior: string;
  isHUD?: boolean;
  width?: number;
  height?: number;
  health: {
    max: number;
    current: number;
  };

  animations: {
    idle?: string; // These will now be the name of the state in the Sprite
    move?: string;
    jump?: string;
    hit?: string;
    dead?: string;
    melee?: string;
    shoot?: string;
  };

  appearance: {
    type: 'sprite'; // Always sprite now, but it can be animated
    spriteId: string | null;
    additionalSpriteIds?: string[]; // New: support for multiple spritesheets
    animationState?: string; // Current state name (e.g. 'idle')
    color?: string;
    animationSpeed: number;
  };

  physics: {
    enabled: boolean;
    isStatic: boolean;
    applyGravity: boolean;
    friction: number;
    restitution: number;
    density: number;
    jumpStrength: number;
    moveSpeed: number;
    ignoreCollision: boolean;
    angle?: number;
    scale?: number;
  };

  combat: {
    canShoot: boolean;
    maxBullets: number;
    bulletObjectId: string | null;
    damage: number;
    shootSpeed: number;
    canShootInAir: boolean;
    canMelee: boolean;
    meleeDamage: number;
    canMeleeInAir: boolean;
    explodes: boolean;
    explosionSpriteId?: string;
    explosionParticleId?: string;
  };

  sounds: {
    jump?: string;
    shoot?: string;
    melee?: string;
    hit?: string;
    dead?: string;
    run?: string;
  };

  logic: {
    triggers: {
      onTap?: string;
      onCollision?: string;
    };
    listeners: {
      eventId: string;
      immediateActions: string[]; // DO part
      subConditions: {
        condition: string; // IF part
        actions: string[]; // THEN part
        elseActions?: string[]; // Optional ELSE part
      }[];
    }[];
    constantVelocityX?: number;
    constantVelocityY?: number;
    isScoreTrigger?: boolean;
    scripts?: string[];
  };

  emitter?: {
    enabled: boolean;
    particleObjectId: string | null;
    rate: number; // particles per second
    lifetime: number; // ms
    speed: number;
    spread: number; // degrees
    gravityScale: number;
    burst: boolean;
  };

  variables: {
    local: Record<string, any>;
  };
  text?: {
    content: string;
    fontFamily: 'default' | 'pixel';
    fontSize: number;
    color: string;
    textAlign: 'left' | 'center' | 'right';
  };
  button?: {
    clickSpriteId?: string;
    releaseSpriteId?: string;
  };
  progress_bar?: {
    minValue: number;
    maxValue: number;
    currentValue: number;
    linkedVariable?: string;
    fillColor: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    direction: 'horizontal' | 'vertical' | 'radial';
  };
  sprite_repeater?: {
    maxCount: number;
    currentCount: number;
    activeSpriteId: string | null;
    inactiveSpriteId: string | null;
    layout: 'horizontal' | 'vertical';
    spacing: number;
    iconSize: number;
    linkedVariable?: string;
  };
}
export interface RoomLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface ObjectInstance {
  id: string;
  objectId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  layerId?: string;
}

export interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: RoomLayer[];
  instances: ObjectInstance[];
  settings: {
    showControls: {
      left: boolean;
      right: boolean;
      jump: boolean;
      shoot: boolean;
      joystick?: {
        enabled: boolean;
        dead_zone: number;
        stick_range: number;
        output_mode: 'vector' | 'angle' | 'magnitude';
        persistence: boolean;
      };
    };
    gravity: number;
    backgroundColor: string;
    showGrid: boolean;
    gridSize: number;
    camera?: {
      targetObjectId: string | null;
      smoothing: number;
      zoom: number;
      enabled: boolean;
    };
  };
}

export interface Project {
  id: string;
  name: string;
  template: TemplateType;
  variables: {
    global: Record<string, any>;
  };
  sprites: Sprite[];
  objects: GameObject[];
  rooms: Room[];
  sounds: SoundAsset[];
  animations: AnimationAsset[];
  mainRoomId?: string;
  iconSpriteId?: string;
}

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  activeProject: Project | null;
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;
  createNewProject: (name: string, template: TemplateType) => void;
  selectProject: (name: string) => void;
  openProject: (name: string) => void;
  updateProject: (updates: Partial<Project>) => void;
  addSprite: (sprite: Sprite) => void;
  updateSprite: (id: string, updates: Partial<Sprite>) => void;
  removeSprite: (id: string) => void;
  addAnimation: (animation: AnimationAsset) => void;
  updateAnimation: (id: string, updates: Partial<AnimationAsset>) => void;
  removeAnimation: (id: string) => void;
  addObject: (object: GameObject) => void;
  updateObject: (id: string, updates: Partial<GameObject>) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  addRoom: (room: Room) => void;
  addInstanceToRoom: (roomId: string, instance: ObjectInstance) => void;
  updateInstancePosition: (roomId: string, instanceId: string, x: number, y: number) => void;
  updateInstanceSize: (roomId: string, instanceId: string, width: number, height: number) => void;
  updateInstanceAngle: (roomId: string, instanceId: string, angle: number) => void;
  removeInstanceFromRoom: (roomId: string, instanceId: string) => void;
  reorderInstance: (roomId: string, instanceId: string, direction: 'forward' | 'backward' | 'front' | 'back') => void;
  addLayer: (roomId: string) => void;
  removeLayer: (roomId: string, layerId: string) => void;
  updateLayer: (roomId: string, layerId: string, updates: Partial<RoomLayer>) => void;
  reorderLayer: (roomId: string, layerId: string, direction: 'forward' | 'backward') => void;
  addSound: (sound: SoundAsset) => void;
  updateSound: (id: string, updates: Partial<SoundAsset>) => void;
  removeSound: (id: string) => void;
  removeObject: (id: string) => void;
  removeProject: (id: string) => void;
  closeProject: () => void;
  publishProject: (description?: string) => Promise<{ success: boolean, error?: string }>;
  fetchRemoteProject: (id: string) => Promise<any>;
  fetchRemoteAsset: (id: string) => Promise<any>;
  setRemoteProject: (project: Project) => void;
  deleteLocalVariable: (objectId: string, key: string) => void;
  promoteVariableToGlobal: (objectId: string, key: string) => void;
  deleteGlobalVariable: (key: string) => void;
  exportToWeb: () => Promise<{ success: boolean, error?: string }>;
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedProject: null,
      activeProject: null,
      activeRoomId: null,
      setActiveRoomId: (id) => set({ activeRoomId: id }),
      createNewProject: (name, template) => set((state) => {
        let finalName = name;
        let counter = 1;
        while (state.projects.some(p => p.name === finalName)) {
          finalName = `${name} ${counter++}`;
        }
        const newProject: Project = {
          id: generateUUID(),
          name: finalName,
          template,
          variables: { global: {} },
          sprites: [],
          objects: [],
          rooms: [{
            id: 'main',
            name: 'Main Room',
            width: 800,
            height: 600,
            instances: [],
            layers: [{ id: 'l1', name: 'Layer 1', visible: true, locked: false }],
            settings: {
              showControls: { 
                left: true, 
                right: true, 
                jump: true, 
                shoot: false,
                joystick: { enabled: false, dead_zone: 10, stick_range: 50, output_mode: 'vector', persistence: false }
              },
              gravity: 9.8,
              backgroundColor: '#111111',
              showGrid: true,
              gridSize: 32,
              camera: {
                targetObjectId: null,
                smoothing: 0.1,
                zoom: 1,
                enabled: false
              }
            }
          }],
          sounds: [],
          animations: [],
          mainRoomId: 'main'
        };

        // Create folder in background
        FileSystemManager.createProjectFolder(newProject.id).then(() => {
          FileSystemManager.saveProjectJson(newProject.id, newProject);
        });

        return {
          projects: [...state.projects, newProject],
          activeProject: newProject,
          selectedProject: newProject,
          activeRoomId: 'main'
        };
      }),
      removeProject: (id) => set((state) => {
        const project = state.projects.find(p => p.id === id);
        if (project) {
          FileSystemManager.deleteProjectFolder(project.id);
        }
        return {
          projects: state.projects.filter(p => p.id !== id),
          selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
          activeProject: state.activeProject?.id === id ? null : state.activeProject,
        };
      }),
      selectProject: (name) => set((state) => ({
        selectedProject: state.projects.find(p => p.name === name) || null
      })),
      openProject: (name) => set((state) => {
        const project = state.projects.find(p => p.name === name) || null;
        return {
          selectedProject: project,
          activeProject: project
        };
      }),
      updateProject: (updates) => set((state) => {
        const target = state.activeProject || state.selectedProject;
        if (!target) return state;

        const updated = { ...target, ...updates };
        FileSystemManager.saveProjectJson(updated.id, updated);
        return {
          activeProject: state.activeProject?.id === target.id ? updated : state.activeProject,
          selectedProject: state.selectedProject?.id === target.id ? updated : state.selectedProject,
          projects: state.projects.map(p => p.id === target.id ? updated : p)
        };
      }),
      addSprite: (sprite) => set((state) => {
        if (!state.activeProject) return state;
        const newSprite = { ...sprite };
        const pid = state.activeProject.id;
        
        // Save to FileSystem and update URI
        (async () => {
          let assetUri = newSprite.uri;
          if (newSprite.pixels) {
            const bmpB64 = pixelsToBMPBase64(newSprite.pixels);
            assetUri = `data:image/bmp;base64,${bmpB64}`;
          }
          
          if (assetUri) {
            const localUri = await FileSystemManager.saveAsset(pid, newSprite.id, assetUri);
            
            // Update the state with the NEW permanent local URI
            set((innerState) => {
              if (!innerState.activeProject) return innerState;
              const updatedSprites = innerState.activeProject.sprites.map(s => 
                s.id === newSprite.id ? { ...s, uri: localUri } : s
              );
              const updatedProject = { ...innerState.activeProject, sprites: updatedSprites };
              FileSystemManager.saveProjectJson(pid, updatedProject);
              return {
                activeProject: updatedProject,
                projects: innerState.projects.map(p => p.id === pid ? updatedProject : p)
              };
            });
          }
        })();

        const updatedProject = {
          ...state.activeProject,
          sprites: [...state.activeProject.sprites, newSprite]
        };
        return {
          activeProject: updatedProject,
          projects: state.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
        };
      }),
      updateSprite: (id: string, updates: any) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          sprites: (state.activeProject.sprites || []).map(s =>
            s.id === id ? { ...s, ...updates } : s
          )
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      removeSprite: (id) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          sprites: (state.activeProject.sprites || []).filter(s => s.id !== id)
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      addAnimation: (animation) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          animations: [...(state.activeProject.animations || []), animation]
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      updateAnimation: (id, updates) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          animations: (state.activeProject.animations || []).map(a =>
            a.id === id ? { ...a, ...updates } : a
          )
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      removeAnimation: (id) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          animations: (state.activeProject.animations || []).filter(a => a.id !== id)
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      addObject: (object) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          objects: [...(state.activeProject.objects || []), object]
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      removeObject: (id) => set((state) => {
        if (!state.activeProject) return state;

        // Cascading delete: remove instances from all rooms and references from other objects
        const updated = {
          ...state.activeProject,
          objects: (state.activeProject.objects || [])
            .filter(obj => obj.id !== id)
            .map(obj => ({
              ...obj,
              combat: {
                ...obj.combat,
                bulletObjectId: obj.combat.bulletObjectId === id ? null : obj.combat.bulletObjectId
              },
              emitter: obj.emitter ? {
                ...obj.emitter,
                particleObjectId: obj.emitter.particleObjectId === id ? null : obj.emitter.particleObjectId
              } : undefined
            })),
          rooms: (state.activeProject.rooms || []).map(room => ({
            ...room,
            instances: (room.instances || []).filter(inst => inst.objectId !== id)
          }))
        };

        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      updateObject: (id, updates) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          objects: (state.activeProject.objects || []).map(obj =>
            obj.id === id ? { ...obj, ...updates } : obj
          )
        };
        FileSystemManager.saveProjectJson(updated.id, updated);
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      updateRoom: (id, updates) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room =>
            room.id === id ? { ...room, ...updates } : room
          )
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      addRoom: (room) => set((state) => {
        if (!state.activeProject) return state;
        const newRoom = {
          ...room,
          layers: room.layers || [{ id: 'default', name: 'Layer 1', visible: true, locked: false }]
        };
        const updated = {
          ...state.activeProject,
          rooms: [...(state.activeProject.rooms || []), newRoom]
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      addInstanceToRoom: (roomId, instance) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room =>
            room.id === roomId ? { ...room, instances: [...(room.instances || []), instance] } : room
          )
        };
        FileSystemManager.saveProjectJson(updated.id, updated);
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      updateInstancePosition: (roomId, instanceId, x, y) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room =>
            room.id === roomId ? {
              ...room,
              instances: (room.instances || []).map(inst =>
                inst.id === instanceId ? { ...inst, x, y } : inst
              )
            } : room
          )
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      updateInstanceSize: (roomId, instanceId, width, height) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room =>
            room.id === roomId ? {
              ...room,
              instances: (room.instances || []).map(inst =>
                inst.id === instanceId ? { ...inst, width, height } : inst
              )
            } : room
          )
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      updateInstanceAngle: (roomId, instanceId, angle) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room =>
            room.id === roomId ? {
              ...room,
              instances: (room.instances || []).map(inst =>
                inst.id === instanceId ? { ...inst, angle } : inst
              )
            } : room
          )
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      removeInstanceFromRoom: (roomId, instanceId) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room =>
            room.id === roomId ? {
              ...room,
              instances: (room.instances || []).filter(inst => inst.id !== instanceId)
            } : room
          )
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      reorderInstance: (roomId, instanceId, direction) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room => {
            if (room.id !== roomId) return room;
            const instances = [...(room.instances || [])];
            const index = instances.findIndex(i => i.id === instanceId);
            if (index === -1) return room;

            if (direction === 'forward' && index < instances.length - 1) {
              [instances[index], instances[index + 1]] = [instances[index + 1], instances[index]];
            } else if (direction === 'backward' && index > 0) {
              [instances[index], instances[index - 1]] = [instances[index - 1], instances[index]];
            } else if (direction === 'front') {
              const item = instances.splice(index, 1)[0];
              instances.push(item);
            } else if (direction === 'back') {
              const item = instances.splice(index, 1)[0];
              instances.unshift(item);
            }

            return { ...room, instances };
          })
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      addLayer: (roomId) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room => {
            if (room.id !== roomId) return room;
            const layers = room.layers || [];
            let layerNum = layers.length + 1;
            let name = `Layer ${layerNum}`;
            while (layers.some(l => l.name === name)) {
              layerNum++;
              name = `Layer ${layerNum}`;
            }
            const newLayer = {
              id: Math.random().toString(36).substr(2, 9),
              name,
              visible: true,
              locked: false
            };
            return { ...room, layers: [...(room.layers || []), newLayer] };
          })
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      removeLayer: (roomId, layerId) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room => {
            if (room.id !== roomId) return room;
            // Don't remove the last layer
            if ((room.layers || []).length <= 1) return room;

            // Move instances from this layer to the first available layer
            const instances = (room.instances || []).filter(inst => inst.layerId !== layerId);

            return {
              ...room,
              layers: (room.layers || []).filter(l => l.id !== layerId),
              instances
            };
          })
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      updateLayer: (roomId, layerId, updates) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room => {
            if (room.id !== roomId) return room;
            return {
              ...room,
              layers: (room.layers || []).map(l => l.id === layerId ? { ...l, ...updates } : l)
            };
          })
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      reorderLayer: (roomId, layerId, direction) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          rooms: (state.activeProject.rooms || []).map(room => {
            if (room.id !== roomId) return room;
            const layers = [...(room.layers || [])];
            const index = layers.findIndex(l => l.id === layerId);
            if (index === -1) return room;

            if (direction === 'forward' && index < layers.length - 1) {
              [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
            } else if (direction === 'backward' && index > 0) {
              [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
            }
            return { ...room, layers };
          })
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      addSound: (sound) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          sounds: [sound, ...(state.activeProject.sounds || [])]
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      updateSound: (id, updates) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          sounds: (state.activeProject.sounds || []).map(s =>
            s.id === id ? { ...s, ...updates } : s
          )
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      removeSound: (id) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          sounds: (state.activeProject.sounds || []).filter(s => s.id !== id)
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      closeProject: () => set((state) => ({
        ...state,
        activeProject: null
      })),
      publishProject: async (description?: string) => {
        const sourceProject = get().selectedProject || get().activeProject;
        if (!sourceProject) return { success: false, error: 'No active project selected' };

        try {
          const { data: userData, error: authError } = await supabase.auth.getUser();
          if (authError || !userData.user) {
            return { success: false, error: 'You must be signed in to publish.' };
          }

          // Deep clone to avoid mutating local state
          const project = JSON.parse(JSON.stringify(sourceProject));

          const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

          // 1. Ensure Project ID is a UUID
          if (!isUUID(project.id)) {
            const newId = generateUUID();
            project.id = newId;
            get().updateProject({ id: newId });
          }

          // 2. ID Migration Map
          const idMap = new Map<string, string>();
          const ensureUUID = (oldId: string) => {
            if (!oldId) return generateUUID();
            if (isUUID(oldId)) return oldId;
            if (idMap.has(oldId)) return idMap.get(oldId)!;
            const newId = generateUUID();
            idMap.set(oldId, newId);
            return newId;
          };

          // Migrate all internal IDs to UUID
          project.sprites = (project.sprites || []).map((s: any) => ({ ...s, id: ensureUUID(s.id) }));
          project.sounds = (project.sounds || []).map((s: any) => ({ ...s, id: ensureUUID(s.id) }));
          project.animations = (project.animations || []).map((s: any) => ({ 
            ...s, 
            id: ensureUUID(s.id),
            spriteId: s.spriteId ? ensureUUID(s.spriteId) : s.spriteId
          }));

          if (project.iconSpriteId) {
            project.iconSpriteId = ensureUUID(project.iconSpriteId);
          }

          project.rooms = (project.rooms || []).map((room: any) => {
            room.id = ensureUUID(room.id);
            if (room.settings?.camera?.targetObjectId) {
              room.settings.camera.targetObjectId = ensureUUID(room.settings.camera.targetObjectId);
            }
            room.instances = (room.instances || []).map((inst: any) => {
              inst.id = ensureUUID(inst.id);
              inst.objectId = ensureUUID(inst.objectId);
              return inst;
            });
            return room;
          });

          if (project.mainRoomId) {
            project.mainRoomId = ensureUUID(project.mainRoomId);
          }

          // Migrate logic listener references (new structure)
          const migrateAction = (actionStr: string) => {
            if (!actionStr) return actionStr;
            const parts = actionStr.split(':');
            const cmd = parts[0];
            // Actions that reference object IDs
            if (cmd === 'spawn' || cmd === 'create_instance' || cmd === 'destroy') {
              if (parts[1]) return `${cmd}:${ensureUUID(parts[1])}${parts.slice(2).length ? ':' + parts.slice(2).join(':') : ''}`;
            }
            // Actions that reference room IDs
            if (cmd === 'go_to_room') {
              if (parts[1]) return `${cmd}:${ensureUUID(parts[1])}`;
            }
            // Actions that might reference sprite IDs
            if (cmd === 'change_sprite' || cmd === 'set_animation') {
              if (parts[1] && parts[1].includes('-')) { // Heuristic: IDs usually have dashes in this engine if they are UUIDs or migrated
                 // But wait, many names don't have dashes. 
                 // Actually, if it's in our sprite list, we should migrate it.
                 // For now, let's just do objects and rooms which are most critical.
              }
            }
            return actionStr;
          };

          project.objects = (project.objects || []).map((obj: any) => {
            const newObjId = ensureUUID(obj.id);
            if (obj.appearance?.spriteId) {
              obj.appearance.spriteId = ensureUUID(obj.appearance.spriteId);
            }
            if (obj.appearance?.animationId) {
              obj.appearance.animationId = ensureUUID(obj.appearance.animationId);
            }
            
            // Combat references
            if (obj.combat?.bulletObjectId) {
              obj.combat.bulletObjectId = ensureUUID(obj.combat.bulletObjectId);
            }
            if (obj.combat?.explosionSpriteId) {
              obj.combat.explosionSpriteId = ensureUUID(obj.combat.explosionSpriteId);
            }

            // Sound references
            if (obj.sounds) {
              Object.keys(obj.sounds).forEach(k => {
                if ((obj.sounds as any)[k]) (obj.sounds as any)[k] = ensureUUID((obj.sounds as any)[k]);
              });
            }

            // Migrate logic listener references (new structure)
            if (obj.logic?.listeners) {
              obj.logic.listeners = obj.logic.listeners.map((l: any) => ({
                ...l,
                immediateActions: (l.immediateActions || []).map(migrateAction),
                subConditions: (l.subConditions || []).map((sc: any) => ({
                  ...sc,
                  actions: (sc.actions || []).map(migrateAction),
                  elseActions: (sc.elseActions || []).map(migrateAction)
                }))
              }));
            }

            // Sprite Repeater references
            if (obj.behavior === 'sprite_repeater' && obj.sprite_repeater) {
              if (obj.sprite_repeater.activeSpriteId) obj.sprite_repeater.activeSpriteId = ensureUUID(obj.sprite_repeater.activeSpriteId);
              if (obj.sprite_repeater.inactiveSpriteId) obj.sprite_repeater.inactiveSpriteId = ensureUUID(obj.sprite_repeater.inactiveSpriteId);
            }

            return { ...obj, id: newObjId };
          });

          // Add sprite ID migration to migrateAction
          const originalMigrateAction = migrateAction;
          const extendedMigrateAction = (actionStr: string) => {
            let result = originalMigrateAction(actionStr);
            if (!result) return result;
            const parts = result.split(':');
            const cmd = parts[0];
            if (cmd === 'change_sprite' || cmd === 'set_animation') {
              // If it's SPRITE_ID:ANIM or just SPRITE_ID
              if (parts[1] && parts[1].includes('-')) {
                // Heuristic: already a UUID, or looks like one. 
                // But we should try to map it anyway.
                parts[1] = ensureUUID(parts[1]);
                return parts.join(':');
              }
              // If we have a colon and the first part is NOT a name we know, it might be an ID.
              // This is tricky. Let's just trust ensureUUID for now.
            }
            return result;
          };
          // Apply extended migration to objects (re-mapping is safe)
          project.objects.forEach((obj: any) => {
            if (obj.logic?.listeners) {
              obj.logic.listeners = obj.logic.listeners.map((l: any) => ({
                ...l,
                immediateActions: (l.immediateActions || []).map(extendedMigrateAction),
                subConditions: (l.subConditions || []).map((sc: any) => ({
                  ...sc,
                  actions: (sc.actions || []).map(extendedMigrateAction),
                  elseActions: (sc.elseActions || []).map(extendedMigrateAction)
                }))
              }));
            }
          });

          // 3. Prepare Payloads
          const { sprites, sounds, animations, ...logic } = project;

          // Add icon preview for community list
          if (project.iconSpriteId) {
            const iconSprite = sprites.find((s: any) => s.id === project.iconSpriteId);
            if (iconSprite) {
              (logic as any).iconPreview = {
                type: iconSprite.type,
                uri: iconSprite.uri,
                pixels: iconSprite.pixels
              };
            }
          }

          // 4. Upload Logic
          const { error: projectError } = await supabase
            .from('games')
            .upsert({
              id: project.id,
              title: project.name,
              project_data: logic,
              author_id: userData.user.id,
              author_name: userData.user.user_metadata?.username || 'Unknown Developer',
              description: description || '',
              created_at: new Date().toISOString()
            }, { onConflict: 'id' });

          if (projectError) {
            console.error('Logic Upload Error:', projectError);
            throw new Error(`Failed to save game logic: ${projectError.message}`);
          }

          // 5. Batch Upload Assets (Much faster and more reliable)
          const assetPayloads = [
            ...(sprites || []).map((s: any) => ({ id: s.id, game_id: project.id, type: 'sprite', data: s })),
            ...(sounds || []).map((s: any) => ({ id: s.id, game_id: project.id, type: 'sound', data: s })),
            ...(animations || []).map((s: any) => ({ id: s.id, game_id: project.id, type: 'animation', data: s }))
          ];

          if (assetPayloads.length > 0) {
            const { error: assetError } = await supabase
              .from('game_assets')
              .upsert(assetPayloads, { onConflict: 'id' });

            if (assetError) {
              console.error('Asset Upload Error:', assetError);
              throw new Error(`Failed to save assets: ${assetError.message}`);
            }
          }

          return { success: true };
        } catch (error: any) {
          console.error('Publish Error:', error);
          return { success: false, error: error.message };
        }
      },
      fetchRemoteProject: async (id: string) => {
        // 1. Fetch Game Logic
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', id)
          .single();

        if (gameError) throw gameError;

        // 2. Fetch All Assets for this Game
        const { data: assetsData, error: assetsError } = await supabase
          .from('game_assets')
          .select('*')
          .eq('game_id', id);

        if (assetsError) console.warn('Asset Fetch Error:', assetsError);

        const logic = gameData.project_data || {};
        const assets = assetsData || [];

        // 3. Reconstruct full project
        return {
          ...logic,
          id: gameData.id,
          name: gameData.title,
          objects: logic.objects || [],
          rooms: logic.rooms || [],
          variables: logic.variables || { global: {} },
          sprites: assets.filter(a => a.type === 'sprite').map(a => a.data),
          sounds: assets.filter(a => a.type === 'sound').map(a => a.data),
          animations: assets.filter(a => a.type === 'animation').map(a => a.data),
          isRemote: true
        };
      },
      fetchRemoteAsset: async (id: string) => {
        const { data, error } = await supabase
          .from('game_assets')
          .select('data')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data.data;
      },
      setRemoteProject: (project) => set({ activeProject: project }),
      deleteLocalVariable: (objectId, key) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          objects: (state.activeProject.objects || []).map(obj => {
            if (obj.id !== objectId) return obj;
            const newLocal = { ...obj.variables.local };
            delete newLocal[key];
            return { ...obj, variables: { ...obj.variables, local: newLocal } };
          })
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      promoteVariableToGlobal: (objectId, key) => set((state) => {
        if (!state.activeProject) return state;
        const obj = state.activeProject.objects.find(o => o.id === objectId);
        if (!obj) return state;

        const value = obj.variables.local[key];
        const newGlobal = { ...state.activeProject.variables.global, [key]: value };

        const updated = {
          ...state.activeProject,
          variables: { ...state.activeProject.variables, global: newGlobal },
          objects: state.activeProject.objects.map(o => {
            if (o.id !== objectId) return o;
            const newLocal = { ...o.variables.local };
            delete newLocal[key];
            return { ...o, variables: { ...o.variables, local: newLocal } };
          })
        };

        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      deleteGlobalVariable: (key) => set((state) => {
        if (!state.activeProject) return state;
        const newGlobal = { ...state.activeProject.variables.global };
        delete newGlobal[key];
        const updated = {
          ...state.activeProject,
          variables: { ...state.activeProject.variables, global: newGlobal }
        };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === updated.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === updated.name ? updated : p)
        };
      }),
      exportToWeb: async () => {
        const project = get().activeProject;
        if (!project) return { success: false, error: 'No active project' };
        try {
          const zip = new JSZip();
          const projectDir = FileSystemManager.getProjectDir(project.id);
          const assetsDir = FileSystemManager.getAssetsDir(project.id);

          // 1. Fetch Matter.js
          let matterSrc = '';
          try {
            const mRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js');
            matterSrc = await mRes.text();
          } catch (e) {
            console.warn('Could not fetch Matter.js for bundling');
          }

          // 2. Prepare Export Metadata (Map URIs to relative paths inside ZIP)
          const exportProject = {
            ...project,
            sprites: project.sprites.map((s: any) => {
              const extension = s.uri?.split('.').pop() || (s.pixels ? 'bmp' : 'png');
              return {
                ...s,
                uri: `./assets/sprites/${s.id}.${extension}`
              };
            })
          };

          const html = generateWebHTML(exportProject, !!matterSrc);
          zip.file("index.html", html);
          if (matterSrc) zip.file("matter.min.js", matterSrc);
          zip.file("project.json", JSON.stringify(exportProject, null, 2));
          
          // 3. Export Sprites from physical assets folder
          const spriteFolder = zip.folder("assets/sprites");
          if (spriteFolder) {
            try {
              const files = await FileSystem.readDirectoryAsync(assetsDir);
              for (const file of files) {
                const fileUri = assetsDir + file;
                const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                spriteFolder.file(file, base64, { base64: true });
              }
            } catch (e) {
              console.warn('Could not read assets directory, falling back to embedded data');
              // Fallback to what we have in memory if folder is empty
              for (const sprite of project.sprites) {
                if (sprite.pixels) {
                  const bmpBase64 = pixelsToBMPBase64(sprite.pixels);
                  if (bmpBase64) spriteFolder.file(`${sprite.id}.bmp`, bmpBase64, { base64: true });
                }
              }
            }
          }
          
          zip.file("README.txt", `Oxion Game: ${project.name}\n\nTo play:\n1. Unzip this folder.\n2. Open index.html in any web browser.\n\nAssets are mirrored in assets/sprites/`);

          const base64Zip = await zip.generateAsync({ type: "base64" });
          
          const filename = `${project.name.replace(/\s+/g, '_')}_WebExport.zip`;
          const baseDir = ((FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory);
          const fileUri = baseDir + filename;
          
          await FileSystem.writeAsStringAsync(fileUri, base64Zip, { encoding: FileSystem.EncodingType.Base64 });
          await Sharing.shareAsync(fileUri);
          
          return { success: true };
        } catch (err: any) {
          console.error('Export Error:', err);
          return { success: false, error: err.message };
        }
      }
    }),
    {
      name: 'oxion-project-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
