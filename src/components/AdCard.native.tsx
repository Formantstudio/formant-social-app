import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

const AD_UNIT_ID = Platform.OS === "ios"
  ? (process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS || TestIds.BANNER)
  : (process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || TestIds.BANNER);

export default function AdCard() {
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.MEDIUM_RECTANGLE}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111",
  },
});
