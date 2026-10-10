/**
 * P7.1 — Logo EchriMheni (spec UI/UX §3) : bouclier + coche, point orange.
 * `tone="white"` pour splash / headers bleus, `tone="color"` sinon.
 */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, font } from '../theme/tokens';

type LogoProps = {
  variant?: 'full' | 'icon';
  tone?: 'color' | 'white';
  height?: number;
};

export function Logo({ variant = 'full', tone = 'color', height = 32 }: LogoProps) {
  const main = tone === 'white' ? '#FFFFFF' : colors.primary[600];
  const sec = tone === 'white' ? '#5EEAD4' : colors.secondary[500];
  const dot = colors.accent[500];
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: height * 0.3 }}
      accessibilityRole="image"
      accessibilityLabel="EchriMheni"
    >
      <Svg width={height} height={height} viewBox="0 0 48 48">
        <Path d="M24 3 6 10v13c0 11 7.5 19.5 18 22 10.5-2.5 18-11 18-22V10L24 3Z" fill={main} />
        <Path
          d="m15.5 24.5 6 6 11-12"
          stroke={sec}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="37" cy="9" r="4.5" fill={dot} />
      </Svg>
      {variant === 'full' && (
        <Text style={{ fontFamily: font.headingXL, fontSize: height * 0.62, letterSpacing: -0.3 }}>
          <Text style={{ color: main }}>Echri</Text>
          <Text style={{ color: tone === 'white' ? '#5EEAD4' : colors.secondary[600] }}>Mheni</Text>
        </Text>
      )}
    </View>
  );
}
