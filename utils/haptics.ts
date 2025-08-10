/**
 * Triggers a short haptic feedback vibration on supported devices.
 * Checks for navigator.vibrate support before attempting to vibrate.
 */
export const triggerHapticFeedback = () => {
  // Check if the Vibration API is supported
  if ('vibrate' in navigator) {
    // A short, simple vibration is usually sufficient for feedback.
    navigator.vibrate(10); // Vibrate for 10 milliseconds
  }
};
