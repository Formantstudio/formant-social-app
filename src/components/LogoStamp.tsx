import React from "react";
import { View } from "react-native";

interface Props {
  size?: number;  // main circle diameter in px, default 100
  color?: string;
  bg?: string;
}

// Proportions taken directly from public/css/components/logo/logo-hero.css
// orb-sm = 34% of main, orb-md = 50% of main
// positions are percentage of main size
export default function LogoStamp({ size = 100, color = "#e8f1f2", bg = "#0a0a0a" }: Props) {
  const pct = (n: number) => Math.round(size * n);

  const circle = (diameter: number, pos: object) => ({
    position: "absolute" as const,
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    borderWidth: Math.max(1, Math.round(size * 0.025)),
    borderColor: color,
    backgroundColor: bg,
    ...pos,
  });

  return (
    <View style={{ width: size, height: size, position: "relative", alignItems: "center", justifyContent: "center" }}>
      {/* Large center circle */}
      <View style={circle(size, {})} />
      {/* orb-1: top-left, smaller (34%) */}
      <View style={circle(pct(0.34), { top: -pct(0.15), left: -pct(0.15) })} />
      {/* orb-2: top-right, medium (50%) */}
      <View style={circle(pct(0.50), { top: -pct(0.30), right: -pct(0.30) })} />
      {/* orb-3: bottom-left, medium (50%) */}
      <View style={circle(pct(0.50), { bottom: -pct(0.30), left: -pct(0.27) })} />
      {/* orb-4: bottom-right, smaller (34%) */}
      <View style={circle(pct(0.34), { bottom: -pct(0.13), right: -pct(0.13) })} />
    </View>
  );
}
