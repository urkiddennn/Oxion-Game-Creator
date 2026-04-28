import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export type TemplateType = 'Platformer' | 'RPG' | 'Sandbox' | 'Empty';

export interface Sprite {
  id: string;
  name: string;
  type: 'imported' | 'created';
  uri?: string;
  pixels?: string[][];
}

export interface SoundAsset {
  id: string;
  name: string;
  type: 'imported' | 'sequence';
  uri?: string;
  sequence?: number[][]; // [row][step] -> 0/1 for simple trigger
}

export interface GameObject {
  id: string;
  name: string;
  type: string;
  behavior: string;
  
  health: {
    max: number;
    current: number;
  };

  animations: {
    idle?: string;
    move?: string;
    jump?: string;
    hit?: string;
    dead?: string;
    melee?: string;
    shoot?: string;
  };

  appearance: {
    spriteId: string | null;
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
      action: string;
    }[];
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
}

export interface ObjectInstance {
  id: string;
  objectId: string;
  x: number;
  y: number;
}

export interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  instances: ObjectInstance[];
  settings: {
    showControls: {
      left: boolean;
      right: boolean;
      jump: boolean;
      shoot: boolean;
    };
    gravity: number;
    backgroundColor: string;
    showGrid: boolean;
    gridSize: number;
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
}

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  activeProject: Project | null;
  createNewProject: (name: string, template: TemplateType) => void;
  selectProject: (name: string) => void;
  openProject: (name: string) => void;
  updateProject: (updates: Partial<Project>) => void;
  addSprite: (sprite: Sprite) => void;
  addObject: (object: GameObject) => void;
  updateObject: (id: string, updates: Partial<GameObject>) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  addRoom: (room: Room) => void;
  addInstanceToRoom: (roomId: string, instance: ObjectInstance) => void;
  updateInstancePosition: (roomId: string, instanceId: string, x: number, y: number) => void;
  addSound: (sound: SoundAsset) => void;
  updateSound: (id: string, updates: Partial<SoundAsset>) => void;
  removeSound: (id: string) => void;
  removeObject: (id: string) => void;
  removeProject: (name: string) => void;
  closeProject: () => void;
  publishProject: () => Promise<{ success: boolean, error?: string }>;
  fetchRemoteProject: (id: string) => Promise<any>;
  fetchRemoteAsset: (id: string) => Promise<any>;
  setRemoteProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedProject: null,
      activeProject: null,
      createNewProject: (name, template) => set((state) => {
        let finalName = name;
        let counter = 1;
        while (state.projects.some(p => p.name === finalName)) {
          finalName = `${name} ${counter++}`;
        }
        const newProject: Project = {
          id: Math.random().toString(36).substr(2, 9),
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
            settings: {
              showControls: { left: true, right: true, jump: true, shoot: true },
              gravity: 9.8
            }
          }],
          sounds: [],
        };
        return {
          projects: [...state.projects, newProject],
          selectedProject: newProject,
          activeProject: newProject
        };
      }),
      removeProject: (name) => set((state) => ({
        projects: state.projects.filter(p => p.name !== name),
        selectedProject: state.selectedProject?.name === name ? null : state.selectedProject,
        activeProject: state.activeProject?.name === name ? null : state.activeProject,
      })),
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
        if (!state.activeProject) return state;
        const updated = { ...state.activeProject, ...updates };
        return {
          activeProject: updated,
          selectedProject: state.selectedProject?.name === state.activeProject?.name ? updated : state.selectedProject,
          projects: state.projects.map(p => p.name === state.activeProject?.name ? updated : p)
        };
      }),
      addSprite: (sprite) => set((state) => {
        if (!state.activeProject) return state;
        const updated = {
          ...state.activeProject,
          sprites: [sprite, ...(state.activeProject.sprites || [])]
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
        const updated = {
          ...state.activeProject,
          rooms: [...(state.activeProject.rooms || []), room]
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
      publishProject: async () => {
        const project = get().activeProject;
        if (!project) return { success: false, error: 'No active project' };

        try {
          const { data: userData } = await supabase.auth.getUser();
          
          // 1. Separate heavy assets from the project logic
          const { sprites, sounds, ...logic } = project;
          
          // 2. Publish Project Logic (Small JSON)
          const projectId = project.id || `legacy_${project.name.toLowerCase().replace(/ /g, '_')}_${Math.random().toString(36).substr(2, 5)}`;
          
          const { error: projectError } = await supabase
            .from('games')
            .upsert({
              id: projectId,
              title: project.name,
              project_data: logic,
              author_id: userData.user?.id,
              author_name: userData.user?.user_metadata?.username || 'Unknown Developer',
              created_at: new Date().toISOString()
            }, { onConflict: 'id' });

          if (projectError) throw projectError;

          // 3. Publish Assets (Sprites/Sounds) individually
          // This enables lazy-loading of only needed assets
          for (const s of project.sprites) {
            const { error: sError } = await supabase
              .from('game_assets')
              .upsert({
                id: s.id,
                game_id: projectId,
                type: 'sprite',
                data: s,
                created_at: new Date().toISOString()
              }, { onConflict: 'id' });
            if (sError) console.warn('Asset Sync Error:', sError);
          }

          for (const snd of project.sounds) {
            const { error: sndError } = await supabase
              .from('game_assets')
              .upsert({
                id: snd.id,
                game_id: projectId,
                type: 'sound',
                data: snd,
                created_at: new Date().toISOString()
              }, { onConflict: 'id' });
            if (sndError) console.warn('Asset Sync Error:', sndError);
          }

          return { success: true };
        } catch (error: any) {
          console.error('Publish Error:', error);
          return { success: false, error: error.message };
        }
      },
      fetchRemoteProject: async (id: string) => {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        // Reconstruct project with streaming markers
        const logic = data.project_data || {};
        return {
          ...logic,
          id: data.id,
          name: data.title,
          objects: logic.objects || [],
          rooms: logic.rooms || [],
          sprites: logic.sprites || [], 
          sounds: logic.sounds || [],
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
    }),
    {
      name: 'oxion-project-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
