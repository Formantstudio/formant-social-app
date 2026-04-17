import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import LogoStamp from "./LogoStamp";

const ACCENT = "#00e6e6";

interface Props {
  loggingIn?: boolean;
  size?: number;
}

export default function LogoAnimation({ loggingIn = false, size = 100 }: Props) {
  const s = size / 100;
  const sz = (n: number) => n * s;

  const spin  = useRef(new Animated.Value(0)).current;
  const align = useRef(new Animated.Value(0)).current;
  const fade  = useRef(new Animated.Value(0)).current; // starts invisible

  useEffect(() => {
    if (!loggingIn) {
      spin.setValue(0);
      align.setValue(0);
      fade.setValue(0);
      return;
    }

    // Flash in, spin, collapse, fade out
    Animated.sequence([
      Animated.timing(fade,  { toValue: 1, duration: 150, easing: Easing.out(Easing.quad),    useNativeDriver: false }),
      Animated.timing(spin,  { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic),   useNativeDriver: false }),
      Animated.timing(align, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(fade,  { toValue: 0, duration: 400, easing: Easing.in(Easing.quad),     useNativeDriver: false }),
    ]).start();
  }, [loggingIn, spin, align, fade]);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const orbOffset = (x: number, y: number) => ({
    transform: [
      { rotate: rotation },
      { translateX: align.interpolate({ inputRange: [0, 1], outputRange: [x * s, x * s * 3] }) },
      { translateY: align.interpolate({ inputRange: [0, 1], outputRange: [y * s, 0] }) },
    ],
  });

  return (
    <View style={{ width: sz(100), height: sz(100) }}>
      {/* Static stamp — always visible */}
      <LogoStamp size={size} />

      {/* Animated overlay — only visible during login */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, alignItems: "center", justifyContent: "center" }]}>
        <View style={{ width: sz(100), height: sz(100), position: "relative", alignItems: "center", justifyContent: "center" }}>

          {/* Spinning orbs */}
          <Animated.View style={[orb(sz(33), sz(-8),  undefined, sz(-8),  undefined, sz(3)), orbOffset(-6, -6)]} />
          <Animated.View style={[orb(sz(33), sz(-10), undefined, undefined, sz(-10), sz(3)), orbOffset(6,  -6)]} />
          <Animated.View style={[orb(sz(33), undefined, sz(-11), sz(-10), undefined, sz(3)), orbOffset(-6, 6)]} />
          <Animated.View style={[orb(sz(33), undefined, sz(-7),  undefined, sz(-7),  sz(3)), orbOffset(6,  6)]} />

          {/* Micro dots */}
          <Animated.View style={{ position: "absolute", width: sz(120), height: sz(120), alignItems: "center", justifyContent: "center", transform: [{ rotate: rotation }] }}>
            {["top", "right", "bottom", "left"].map((side) => (
              <View key={side} style={{ position: "absolute", width: sz(8), height: sz(8), borderRadius: sz(4), backgroundColor: ACCENT, [side]: 0 }} />
            ))}
          </Animated.View>

        </View>
      </Animated.View>
    </View>
  );
}

function orb(size: number, top?: number, bottom?: number, left?: number, right?: number, borderWidth = 2) {
  return {
    position: "absolute" as const,
    width: size, height: size,
    borderRadius: 999,
    borderWidth,
    borderColor: ACCENT,
    backgroundColor: "#0b1114",
    zIndex: 2,
    ...(top    !== undefined && { top }),
    ...(bottom !== undefined && { bottom }),
    ...(left   !== undefined && { left }),
    ...(right  !== undefined && { right }),
  };
}
