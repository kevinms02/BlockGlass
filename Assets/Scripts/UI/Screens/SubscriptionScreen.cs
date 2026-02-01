using UnityEngine;
using UnityEngine.UI;
using TMPro;
using BlockGlass.Core;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Subscription screen with tier comparison
    /// Lite: Removes interstitial ads
    /// Pro: No ads + free helpers
    /// Premium: All Pro + cosmetics + badge
    /// 
    /// HONEST MESSAGING - No tricks, no fake urgency
    /// "Subscriptions remove friction, not challenge."
    /// </summary>
    public class SubscriptionScreen : MonoBehaviour
    {
        [Header("Cards")]
        [SerializeField] private SubscriptionCard liteCard;
        [SerializeField] private SubscriptionCard proCard;
        [SerializeField] private SubscriptionCard premiumCard;

        [Header("Header")]
        [SerializeField] private TextMeshProUGUI titleText;
        [SerializeField] private TextMeshProUGUI subtitleText;

        [Header("Footer Message")]
        [SerializeField] private TextMeshProUGUI fairnessMessage;

        [Header("Actions")]
        [SerializeField] private Button closeButton;
        [SerializeField] private Button restorePurchasesButton;

        private ScreenManager screenManager;

        private void Awake()
        {
            screenManager = FindObjectOfType<ScreenManager>();
            SetupButtons();
            SetupCards();
            ApplyStyle();
        }

        private void OnEnable()
        {
            UpdateCurrentTierDisplay();
        }

        private void SetupButtons()
        {
            if (closeButton != null)
            {
                closeButton.onClick.AddListener(OnClosePressed);
            }

            if (restorePurchasesButton != null)
            {
                restorePurchasesButton.onClick.AddListener(OnRestorePurchasesPressed);
            }
        }

        private void SetupCards()
        {
            // Lite tier
            if (liteCard != null)
            {
                liteCard.Setup(new SubscriptionTierInfo
                {
                    Tier = SubscriptionTier.Lite,
                    Name = "Lite",
                    Price = "$0.99/week",
                    Features = new string[]
                    {
                        "Remove interstitial ads",
                        "Cleaner game over flow"
                    }
                });
                liteCard.OnSubscribe += () => OnSubscribePressed(SubscriptionTier.Lite);
            }

            // Pro tier
            if (proCard != null)
            {
                proCard.Setup(new SubscriptionTierInfo
                {
                    Tier = SubscriptionTier.Pro,
                    Name = "Pro",
                    Price = "$2.99/week",
                    Features = new string[]
                    {
                        "All Lite benefits",
                        "Remove ALL ads",
                        "Free helper uses (no ads required)"
                    },
                    IsRecommended = true
                });
                proCard.OnSubscribe += () => OnSubscribePressed(SubscriptionTier.Pro);
            }

            // Premium tier
            if (premiumCard != null)
            {
                premiumCard.Setup(new SubscriptionTierInfo
                {
                    Tier = SubscriptionTier.Premium,
                    Name = "Premium",
                    Price = "$4.99/week",
                    Features = new string[]
                    {
                        "All Pro benefits",
                        "Exclusive block themes",
                        "Profile badge",
                        "Early access to new modes"
                    }
                });
                premiumCard.OnSubscribe += () => OnSubscribePressed(SubscriptionTier.Premium);
            }
        }

        private void ApplyStyle()
        {
            if (titleText != null)
            {
                titleText.text = "Upgrade Your Experience";
                titleText.color = ColorPalette.TextPrimary;
            }

            if (subtitleText != null)
            {
                subtitleText.text = "Play without interruptions. Keep the challenge.";
                subtitleText.color = ColorPalette.TextSecondary;
            }

            // CRITICAL: Fair messaging - visible and honest
            if (fairnessMessage != null)
            {
                fairnessMessage.text = "Subscriptions remove friction, not challenge.\nYour skill determines your score.";
                fairnessMessage.color = ColorPalette.TextSecondary;
            }
        }

        private void UpdateCurrentTierDisplay()
        {
            SubscriptionTier currentTier = SaveSystem.GetSubscriptionTier();

            if (liteCard != null)
            {
                liteCard.SetCurrentTier(currentTier >= SubscriptionTier.Lite);
            }

            if (proCard != null)
            {
                proCard.SetCurrentTier(currentTier >= SubscriptionTier.Pro);
            }

            if (premiumCard != null)
            {
                premiumCard.SetCurrentTier(currentTier >= SubscriptionTier.Premium);
            }
        }

        private void OnSubscribePressed(SubscriptionTier tier)
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);

            // In a real app, this would trigger IAP flow
            Debug.Log($"[Subscription] Subscribe to {tier} requested");

            // For demo, directly set subscription (in real app, this comes from IAP validation)
            // SaveSystem.SetSubscriptionTier(tier);
            // UpdateCurrentTierDisplay();
        }

        private void OnRestorePurchasesPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            // In a real app, trigger IAP restore
            Debug.Log("[Subscription] Restore purchases requested");
        }

        private void OnClosePressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);

            GameState state = GameManager.Instance?.CurrentState ?? GameState.Menu;

            if (state == GameState.Menu)
            {
                screenManager?.ShowScreen(ScreenType.Dashboard);
            }
            else
            {
                screenManager?.ShowScreen(ScreenType.Profile);
            }
        }
    }

    [System.Serializable]
    public struct SubscriptionTierInfo
    {
        public SubscriptionTier Tier;
        public string Name;
        public string Price;
        public string[] Features;
        public bool IsRecommended;
    }
}
