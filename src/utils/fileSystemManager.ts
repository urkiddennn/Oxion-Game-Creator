import * as FileSystem from 'expo-file-system/legacy';

const PROJECTS_DIR = FileSystem.documentDirectory + 'projects/';

export const FileSystemManager = {
  /**
   * Ensures the root projects directory exists
   */
  init: async () => {
    const info = await FileSystem.getInfoAsync(PROJECTS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(PROJECTS_DIR, { intermediates: true });
    }
  },

  /**
   * Creates a folder for a specific project
   */
  createProjectFolder: async (projectId: string) => {
    const projectDir = PROJECTS_DIR + projectId + '/';
    const assetsDir = projectDir + 'assets/';
    await FileSystem.makeDirectoryAsync(assetsDir, { intermediates: true });
    return projectDir;
  },

  /**
   * Saves an asset (base64 or local URI) to the project assets folder
   */
  saveAsset: async (projectId: string, assetId: string, sourceUri: string) => {
    const extension = sourceUri.includes('data:image/png') ? 'png' : 
                    sourceUri.includes('data:image/jpeg') ? 'jpg' : 
                    sourceUri.includes('data:image/bmp') ? 'bmp' : 'png';
    
    const fileName = `${assetId}.${extension}`;
    const destUri = PROJECTS_DIR + projectId + '/assets/' + fileName;

    if (sourceUri.startsWith('data:')) {
      const base64 = sourceUri.split(',')[1];
      await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    } else {
      await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    }

    return destUri;
  },

  /**
   * Saves project metadata to project.json
   */
  saveProjectJson: async (projectId: string, data: any) => {
    const projectDir = PROJECTS_DIR + projectId + '/';
    await FileSystem.writeAsStringAsync(projectDir + 'project.json', JSON.stringify(data, null, 2));
  },

  /**
   * Gets the full path for a project folder
   */
  getProjectDir: (projectId: string) => PROJECTS_DIR + projectId + '/',

  /**
   * Gets the assets directory for a project
   */
  getAssetsDir: (projectId: string) => PROJECTS_DIR + projectId + '/assets/',

  /**
   * Deletes a project folder
   */
  deleteProjectFolder: async (projectId: string) => {
    const projectDir = PROJECTS_DIR + projectId + '/';
    await FileSystem.deleteAsync(projectDir, { idempotent: true });
  }
};
