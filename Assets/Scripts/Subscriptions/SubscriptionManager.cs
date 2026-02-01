using UnityEngine;
using BlockGlass.Core;

namespace BlockGlass.Subscriptions
{
    /// <summary>
    /// Subscription manager for IAP integration
    /// Handles tier status and feature unlocks
    /// 
    /// FAIRNESS RULE: Subscriptions remove FRICTION, not CHALLENGE
    /// - No gameplay advantages
    /// - No score boosts
    /// - No easier puzzles
    /// </summary>
    public class SubscriptionManager : MonoBehaviour
    {
        public static SubscriptionManager Instance { get; private set; }

        [Header("Product IDs (Replace with real IDs)")]
        [SerializeField] private string liteProductId = "com.blockglass.lite";
        [SerializeField] private string proProductId = "com.blockglass.pro";
        [SerializeField] private string premiumProductId = "com.blockglass.premium";

        public event System.Action<SubscriptionTier> OnTierChanged;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeIAP();
        }

        private void InitializeIAP()
        {
            // In a real implementation, initialize Unity IAP here:
            // var builder = ConfigurationBuilder.Instance(StandardPurchasingModule.Instance());
            // builder.AddProduct(liteProductId, ProductType.Subscription);
            // builder.AddProduct(proProductId, ProductType.Subscription);
            // builder.AddProduct(premiumProductId, ProductType.Subscription);
            // UnityPurchasing.Initialize(this, builder);

            Debug.Log("[SubscriptionManager] IAP initialized (simulated mode)");

            // Check stored subscription status
            ValidateSubscription();
        }

        /// <summary>
        /// Validate subscription status (would check with app store in production)
        /// </summary>
        private void ValidateSubscription()
        {
            // In production, this would verify receipts with app stores
            // For now, trust stored value
            SubscriptionTier tier = SaveSystem.GetSubscriptionTier();
            Debug.Log($"[SubscriptionManager] Current tier: {tier}");
        }

        #region Purchase Methods

        public void PurchaseLite()
        {
            Purchase(liteProductId, SubscriptionTier.Lite);
        }

        public void PurchasePro()
        {
            Purchase(proProductId, SubscriptionTier.Pro);
        }

        public void PurchasePremium()
        {
            Purchase(premiumProductId, SubscriptionTier.Premium);
        }

        private void Purchase(string productId, SubscriptionTier tier)
        {
            Debug.Log($"[SubscriptionManager] Initiating purchase: {productId}");

            // In real implementation:
            // storeController.InitiatePurchase(productId);

            // For demo, simulate successful purchase
            OnPurchaseSuccess(tier);
        }

        private void OnPurchaseSuccess(SubscriptionTier tier)
        {
            SaveSystem.SetSubscriptionTier(tier);
            OnTierChanged?.Invoke(tier);

            Debug.Log($"[SubscriptionManager] Purchase successful: {tier}");

            // Update ad manager
            if (tier >= SubscriptionTier.Lite)
            {
                // Lite removes interstitials, but keeps rewarded
            }
            if (tier >= SubscriptionTier.Pro)
            {
                // Pro removes all ads
                Ads.AdManager.Instance?.DisableAds();
            }
        }

        private void OnPurchaseFailed(string reason)
        {
            Debug.LogWarning($"[SubscriptionManager] Purchase failed: {reason}");
        }

        #endregion

        #region Restore Purchases

        public void RestorePurchases()
        {
            Debug.Log("[SubscriptionManager] Restoring purchases...");

            // In real implementation:
            // storeController.RestoreTransactions((success) => { ... });

            // Simulate restore
            StartCoroutine(SimulateRestore());
        }

        private System.Collections.IEnumerator SimulateRestore()
        {
            yield return new WaitForSecondsRealtime(1f);

            // In production, this would check app store for active subscriptions
            SubscriptionTier restoredTier = SaveSystem.GetSubscriptionTier();

            if (restoredTier > SubscriptionTier.Free)
            {
                Debug.Log($"[SubscriptionManager] Restored subscription: {restoredTier}");
                OnTierChanged?.Invoke(restoredTier);
            }
            else
            {
                Debug.Log("[SubscriptionManager] No subscription to restore");
            }
        }

        #endregion

        #region Feature Checks

        /// <summary>
        /// Check if interstitial ads should be shown
        /// </summary>
        public bool ShouldShowInterstitials()
        {
            return SaveSystem.GetSubscriptionTier() < SubscriptionTier.Lite;
        }

        /// <summary>
        /// Check if rewarded ads are needed for helpers
        /// </summary>
        public bool NeedsAdsForHelpers()
        {
            return SaveSystem.GetSubscriptionTier() < SubscriptionTier.Pro;
        }

        /// <summary>
        /// Check if user has premium cosmetics
        /// </summary>
        public bool HasPremiumCosmetics()
        {
            return SaveSystem.GetSubscriptionTier() >= SubscriptionTier.Premium;
        }

        #endregion

        #region Tier Info

        public SubscriptionTier GetCurrentTier()
        {
            return SaveSystem.GetSubscriptionTier();
        }

        public string GetTierDisplayName()
        {
            return GetCurrentTier() switch
            {
                SubscriptionTier.Lite => "Lite",
                SubscriptionTier.Pro => "Pro",
                SubscriptionTier.Premium => "Premium",
                _ => "Free"
            };
        }

        public string GetTierBenefitsSummary()
        {
            return GetCurrentTier() switch
            {
                SubscriptionTier.Lite => "No interstitial ads",
                SubscriptionTier.Pro => "No ads, free helpers",
                SubscriptionTier.Premium => "All benefits + cosmetics",
                _ => "Free with ads"
            };
        }

        #endregion
    }
}
