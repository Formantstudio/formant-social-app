import { Platform } from "react-native";
import { InterstitialAd, AdEventType, TestIds } from "react-native-google-mobile-ads";

const UNIT_ID = Platform.OS === "ios"
  ? (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS    || TestIds.INTERSTITIAL)
  : (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID || TestIds.INTERSTITIAL);

let ad     = InterstitialAd.createForAdRequest(UNIT_ID);
let loaded = false;
let tapCount = 0;

function attachListeners() {
  ad.addAdEventListener(AdEventType.LOADED, () => { loaded = true; });
  ad.addAdEventListener(AdEventType.ERROR,  () => { loaded = false; });
}

attachListeners();

export function preloadInterstitial() {
  ad.load();
}

export function showInterstitialIfReady(onDismiss: () => void) {
  tapCount++;
  if (tapCount % 4 === 0 && loaded) {
    const unsub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsub();
      loaded = false;
      // recreate and preload for next time
      ad = InterstitialAd.createForAdRequest(UNIT_ID);
      attachListeners();
      ad.load();
      onDismiss();
    });
    ad.show();
  } else {
    onDismiss();
  }
}
