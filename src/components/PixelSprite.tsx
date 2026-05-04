import React from 'react';
import { View, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const PixelSprite = React.memo(({ 
  sprite, 
  size, 
  originalSize = false,
  animationState,
  frameIndex = 0
}: { 
  sprite: any, 
  size: number, 
  originalSize?: boolean,
  animationState?: string,
  frameIndex?: number
}) => {
  const [dimensions, setDimensions] = React.useState({ 
    w: sprite?.width || 0, 
    h: sprite?.height || 0 
  });

  React.useEffect(() => {
    if (sprite?.uri && (!sprite.width || !sprite.height)) {
      Image.getSize(sprite.uri, (width, height) => {
        setDimensions({ w: width, h: height });
      });
    } else if (sprite?.width && sprite?.height) {
      setDimensions({ w: sprite.width, h: sprite.height });
    }
  }, [sprite?.uri, sprite?.width, sprite?.height]);

  if (!sprite) return <View style={{ width: size, height: size, backgroundColor: '#4ade80', borderRadius: 4, borderWidth: 1, borderColor: '#22c55e' }} />;

  if (sprite.type === 'imported') {
    // If it's an imported sprite, we ALMOST ALWAYS want slicing logic active if it has animations
    // or if the dimensions are larger than a typical single frame.
    const hasAnimations = sprite.animations && sprite.animations.length > 0;
    const isGrid = sprite.grid?.enabled || hasAnimations || (dimensions.w > 64 || dimensions.h > 64);
    
    // Default to image dimensions IF it's not a grid. 
    // If it is a grid (or assumed to be), use the specified frame size or fallback to the provided 'size' prop.
    const fw = (sprite.grid?.frameWidth && sprite.grid.frameWidth > 0) ? sprite.grid.frameWidth : (isGrid ? size : (dimensions.w || size));
    const fh = (sprite.grid?.frameHeight && sprite.grid.frameHeight > 0) ? sprite.grid.frameHeight : (isGrid ? size : (dimensions.h || size));
    
    const sheetW = dimensions.w || fw;
    const sheetH = dimensions.h || fh;

    // Calculate which frame to show
    let row = 0;
    let col = frameIndex;

    if (animationState && sprite.animations) {
      const anim = sprite.animations.find((a: any) => a.name === animationState);
      if (anim) {
        row = anim.row || 0;
        col = (frameIndex % (anim.frameCount || 1));
      }
    } else if (isGrid) {
      const cols = Math.floor(sheetW / fw) || 1;
      row = Math.floor(frameIndex / cols);
      col = frameIndex % cols;
    }

    const displayWidth = originalSize ? fw : (fw > fh ? size : (fw / fh) * size);
    const displayHeight = originalSize ? fh : (fh > fw ? size : (fh / fw) * size);
    const scale = displayWidth / fw;

    return (
      <View style={{ 
        width: displayWidth, 
        height: displayHeight, 
        overflow: 'hidden',
        backgroundColor: 'transparent'
      }}>
        <Image 
          source={{ uri: sprite.uri }} 
          style={{ 
            width: sheetW * scale, 
            height: sheetH * scale,
            position: 'absolute',
            left: -col * fw * scale,
            top: -row * fh * scale,
            // Use 'stretch' to ensure it follows our calculated pixels exactly
            resizeMode: 'stretch',
            // @ts-ignore
            resizeMethod: 'scale'
          }} 
        />
      </View>
    );
  }

  const rows = sprite.pixels?.length || 1;
  const cols = sprite.pixels?.[0]?.length || 1;
  const pixelSize = size / Math.max(rows, cols);

  // Path pooling optimization
  const colorPaths: { [key: string]: string } = {};

  sprite.pixels?.forEach((row: string[], r: number) => {
    row.forEach((color: string, c: number) => {
      if (color === 'transparent' || !color) return;
      if (!colorPaths[color]) colorPaths[color] = '';

      const x = c * pixelSize;
      const y = r * pixelSize;
      colorPaths[color] += `M${x},${y}h${pixelSize}v${pixelSize}h-${pixelSize}z `;
    });
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Object.entries(colorPaths).map(([color, pathData]) => (
        <Path key={color} d={pathData} fill={color} />
      ))}
    </Svg>
  );
});
