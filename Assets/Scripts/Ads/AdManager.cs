using UnityEngine;
using System;

namespace BlockGlass.Ads
{
    /// <summary>
    /// AdMob integration manager
    /// Graceful offline failure - ads never break gameplay
    /// Rewarded ads are always OPTIONAL
    /// Interstitial only on game over (for non-subscribers)
    /// </summary>
    public class AdManager : MonoBehaviour
    {
        public static AdManager Instance { get; private set; }

        [Header("Ad Unit IDs (Replace with real IDs for production)")]
        [SerializeField] private string rewardedAdUnitId = "ca-app-pub-3940256099942544/5224354917"; // Test ID
        [SerializeField] private string interstitialAdUnitId = "ca-app-pub-3940256099942544/1033173712"; // Test ID
        [SerializeField] private string bannerAdUnitId = "ca-app-pub-3940256099942544/6300978111"; // Test ID

        [Header("Settings")]
        [SerializeField] private bool testMode = true;
        [SerializeField] private float interstitialCooldown = 60f; // Minimum time between interstitials

        private bool isInitialized = false;
        private bool rewardedAdLoaded = false;
        private bool interstitialLoaded = false;
        private float lastInterstitialTime = 0f;

        private Action onRewardedSuccess;
        private Action onRewardedFailed;
        private Action onInterstitialClosed;

        // Simulated ad state for when AdMob is not available
        private bool simulatedAdsEnabled = true;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeAds();
        }

        private void InitializeAds()
        {
#if UNITY_ANDROID || UNITY_IOS
            // In a real implementation, initialize Google Mobile Ads SDK here:
            // MobileAds.Initialize(initStatus => { OnAdsInitialized(); });
            
            // For now, simulate initialization
            SimulateInitialization();
#else
            Debug.Log("[AdManager] Ads not supported on this platform");
            isInitialized = false;
#endif
        }

        private void SimulateInitialization()
        {
            isInitialized = true;
            Debug.Log("[AdManager] Ads initialized (simulated mode)");

            // Pre-load ads
            LoadRewardedAd();
            LoadInterstitial();
        }

        #region Rewarded Ads

        public void LoadRewardedAd()
        {
            if (!isInitialized) return;

            // In real implementation:
            // var request = new AdRequest.Builder().Build();
            // RewardedAd.Load(rewardedAdUnitId, request, OnRewardedAdLoaded);

            // Simulated loading
            StartCoroutine(SimulateAdLoad(() =>
            {
                rewardedAdLoaded = true;
                Debug.Log("[AdManager] Rewarded ad loaded");
            }));
        }

        public bool IsRewardedAdReady()
        {
            return isInitialized && rewardedAdLoaded;
        }

        /// <summary>
        /// Show rewarded ad with callbacks
        /// IMPORTANT: If ad fails, onFailed is called - gameplay continues normally
        /// </summary>
        public void ShowRewardedAd(Action onSuccess, Action onFailed = null)
        {
            if (!IsRewardedAdReady())
            {
                Debug.Log("[AdManager] Rewarded ad not ready, failing gracefully");
                onFailed?.Invoke();
                return;
            }

            onRewardedSuccess = onSuccess;
            onRewardedFailed = onFailed;

            if (simulatedAdsEnabled)
            {
                // Simulate watching an ad
                StartCoroutine(SimulateRewardedAd());
            }
            else
            {
                // In real implementation:
                // rewardedAd.Show(OnRewardedAdCompleted);
                onFailed?.Invoke();
            }
        }

        private System.Collections.IEnumerator SimulateRewardedAd()
        {
            Debug.Log("[AdManager] Simulating rewarded ad (2 seconds)...");
            
            // Simulate ad duration
            yield return new WaitForSecondsRealtime(2f);

            // 90% success rate in simulation
            if (UnityEngine.Random.value < 0.9f)
            {
                Debug.Log("[AdManager] Rewarded ad completed - granting reward");
                rewardedAdLoaded = false;
                onRewardedSuccess?.Invoke();
                LoadRewardedAd(); // Pre-load next
            }
            else
            {
                Debug.Log("[AdManager] Rewarded ad failed (simulated failure)");
                onRewardedFailed?.Invoke();
            }

            onRewardedSuccess = null;
            onRewardedFailed = null;
        }

        #endregion

        #region Interstitial Ads

        public void LoadInterstitial()
        {
            if (!isInitialized) return;

            // In real implementation:
            // var request = new AdRequest.Builder().Build();
            // InterstitialAd.Load(interstitialAdUnitId, request, OnInterstitialLoaded);

            StartCoroutine(SimulateAdLoad(() =>
            {
                interstitialLoaded = true;
                Debug.Log("[AdManager] Interstitial loaded");
            }));
        }

        public bool IsInterstitialReady()
        {
            if (!isInitialized || !interstitialLoaded) return false;

            // Check cooldown
            if (Time.time - lastInterstitialTime < interstitialCooldown)
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Show interstitial ad (only on game over for non-subscribers)
        /// </summary>
        public void ShowInterstitial(Action onClosed = null)
        {
            // Check if user has subscription that removes interstitials
            if (Core.SaveSystem.HasNoAds())
            {
                Debug.Log("[AdManager] User has no-ads subscription, skipping interstitial");
                onClosed?.Invoke();
                return;
            }

            if (!IsInterstitialReady())
            {
                Debug.Log("[AdManager] Interstitial not ready, continuing without ad");
                onClosed?.Invoke();
                return;
            }

            onInterstitialClosed = onClosed;

            if (simulatedAdsEnabled)
            {
                StartCoroutine(SimulateInterstitial());
            }
            else
            {
                onClosed?.Invoke();
            }
        }

        private System.Collections.IEnumerator SimulateInterstitial()
        {
            Debug.Log("[AdManager] Simulating interstitial ad (1.5 seconds)...");

            yield return new WaitForSecondsRealtime(1.5f);

            interstitialLoaded = false;
            lastInterstitialTime = Time.time;

            Debug.Log("[AdManager] Interstitial closed");
            onInterstitialClosed?.Invoke();
            onInterstitialClosed = null;

            LoadInterstitial(); // Pre-load next
        }

        #endregion

        #region Helper Methods

        private System.Collections.IEnumerator SimulateAdLoad(Action onLoaded)
        {
            // Simulate network delay
            yield return new WaitForSecondsRealtime(UnityEngine.Random.Range(0.5f, 1.5f));
            onLoaded?.Invoke();
        }

        /// <summary>
        /// Check if ads are available (for UI display)
        /// </summary>
        public bool AreAdsAvailable()
        {
            return isInitialized && Application.internetReachability != NetworkReachability.NotReachable;
        }

        /// <summary>
        /// Disable ads (for testing or subscription)
        /// </summary>
        public void DisableAds()
        {
            simulatedAdsEnabled = false;
        }

        /// <summary>
        /// Enable ads
        /// </summary>
        public void EnableAds()
        {
            simulatedAdsEnabled = true;
        }

        #endregion

        private void OnApplicationPause(bool pauseStatus)
        {
            // Handle ad SDK pause/resume if needed
        }
    }
}
