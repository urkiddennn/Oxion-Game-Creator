import React from 'react';
import { Image } from 'react-native';

interface OxionLogoProps {
  size?: number;
}

export const OxionLogo: React.FC<OxionLogoProps> = ({ size = 120 }) => {
  return (
    <Image 
      source={require('../../assets/oxion2.png')} 
      style={{ width: size, height: size, resizeMode: 'contain' }} 
    />
  );
};
