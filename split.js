const fs = require('fs');

const code = fs.readFileSync('src/features/objects/ObjectsScreen.tsx', 'utf8');

const creationStart = code.indexOf('{/* Creation Modal */}');
const endOfReturn = code.lastIndexOf('</View>\n  );\n}');

const modalsCode = code.slice(creationStart, endOfReturn);

const remainingCode = code.slice(0, creationStart) + 
  '      {createModalVisible || inspectorVisible || spritePickerVisible ? (\n' +
  '        <React.Suspense fallback={null}>\n' +
  '          <ObjectModals \n' +
  '            createModalVisible={createModalVisible} \n' +
  '            setCreateModalVisible={setCreateModalVisible} \n' +
  '            inspectorVisible={inspectorVisible} \n' +
  '            setInspectorVisible={setInspectorVisible} \n' +
  '            spritePickerVisible={spritePickerVisible} \n' +
  '            setSpritePickerVisible={setSpritePickerVisible} \n' +
  '            selectedObject={selectedObject} \n' +
  '            setSelectedObject={setSelectedObject} \n' +
  '            currentProject={currentProject} \n' +
  '            updateObject={updateObject} \n' +
  '            handleCreateObject={handleCreateObject} \n' +
  '            renderSpritePreview={renderSpritePreview} \n' +
  '          />\n' +
  '        </React.Suspense>\n' +
  '      ) : null}\n' +
  code.slice(endOfReturn);

const lazyImportStr = 'const ObjectModals = React.lazy(() => import(\'./components/ObjectModals\'));\n';
const modifiedRemainingCode = remainingCode.replace('export default function ObjectsScreen() {', lazyImportStr + '\nexport default function ObjectsScreen() {');

const stylesStart = code.indexOf('const styles = StyleSheet.create({');
const stylesCode = code.slice(stylesStart);

const modalComponentCode = `import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Switch, Image, StyleSheet } from 'react-native';
import { Box, User, MousePointer2, Timer, Heart, Move, Zap, Layout, Info, Palette, Settings, Image as ImageIcon, X, Share2, Trash2 } from 'lucide-react-native';
import { theme } from '../../../theme';

export const BEHAVIORS = [
  { id: 'player', label: 'Player', icon: User, color: '#00D1FF' },
  { id: 'solid', label: 'Solid', icon: Box, color: '#94A3B8' },
  { id: 'button', label: 'Button', icon: MousePointer2, color: '#FF00D1' },
  { id: 'timer', label: 'Timer', icon: Timer, color: '#FFD700' },
  { id: 'health', label: 'Health/Lives', icon: Heart, color: '#EF4444' },
  { id: 'moveable', label: 'Moveable', icon: Move, color: '#10B981' },
  { id: 'particle', label: 'Particle Emitter', icon: Zap, color: '#7000FF' },
  { id: 'popup', label: 'Pop-up Text', icon: Layout, color: '#94A3B8' },
];

export default function ObjectModals({
  createModalVisible, setCreateModalVisible,
  inspectorVisible, setInspectorVisible,
  spritePickerVisible, setSpritePickerVisible,
  selectedObject, setSelectedObject,
  currentProject, updateObject, handleCreateObject, renderSpritePreview
}: any) {
  return (
    <>
      ${modalsCode}
    </>
  );
}

${stylesCode}
`;

fs.mkdirSync('src/features/objects/components', { recursive: true });
fs.writeFileSync('src/features/objects/components/ObjectModals.tsx', modalComponentCode);
fs.writeFileSync('src/features/objects/ObjectsScreen.tsx', modifiedRemainingCode);

console.log('Modals extracted successfully!');
