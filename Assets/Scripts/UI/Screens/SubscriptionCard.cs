using UnityEngine;
using UnityEngine.UI;
using TMPro;
using BlockGlass.Core;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Subscription card component for tier display
    /// </summary>
    public class SubscriptionCard : MonoBehaviour
    {
        [Header("Visual")]
        [SerializeField] private GlassPanel glassPanel;
        [SerializeField] private Image highlightBorder;
        [SerializeField] private GameObject recommendedBadge;

        [Header("Content")]
        [SerializeField] private TextMeshProUGUI tierNameText;
        [SerializeField] private TextMeshProUGUI priceText;
        [SerializeField] private Transform featuresContainer;
        [SerializeField] private GameObject featureItemPrefab;

        [Header("Action")]
        [SerializeField] private GlassButton subscribeButton;
        [SerializeField] private GameObject currentTierIndicator;

        private SubscriptionTierInfo tierInfo;
        private bool isCurrentTier = false;

        public event System.Action OnSubscribe;

        private void Awake()
        {
            if (subscribeButton != null)
            {
                subscribeButton.onClick.AddListener(HandleSubscribeClick);
            }
        }

        public void Setup(SubscriptionTierInfo info)
        {
            tierInfo = info;

            if (tierNameText != null)
            {
                tierNameText.text = info.Name;
                tierNameText.color = ColorPalette.TextPrimary;
            }

            if (priceText != null)
            {
                priceText.text = info.Price;
                priceText.color = ColorPalette.Accent;
            }

            // Setup features list
            SetupFeatures(info.Features);

            // Show recommended badge
            if (recommendedBadge != null)
            {
                recommendedBadge.SetActive(info.IsRecommended);
            }

            // Highlight border for recommended
            if (highlightBorder != null)
            {
                highlightBorder.color = info.IsRecommended
                    ? ColorPalette.Accent
                    : ColorPalette.GlassBorder;
            }
        }

        private void SetupFeatures(string[] features)
        {
            if (featuresContainer == null || featureItemPrefab == null) return;

            // Clear existing
            foreach (Transform child in featuresContainer)
            {
                Destroy(child.gameObject);
            }

            // Add feature items
            foreach (string feature in features)
            {
                GameObject item = Instantiate(featureItemPrefab, featuresContainer);
                TextMeshProUGUI text = item.GetComponentInChildren<TextMeshProUGUI>();
                if (text != null)
                {
                    text.text = $"✓ {feature}";
                    text.color = ColorPalette.TextSecondary;
                }
            }
        }

        public void SetCurrentTier(bool isCurrent)
        {
            isCurrentTier = isCurrent;

            if (currentTierIndicator != null)
            {
                currentTierIndicator.SetActive(isCurrent);
            }

            if (subscribeButton != null)
            {
                subscribeButton.Interactable = !isCurrent;
                subscribeButton.SetText(isCurrent ? "Current" : "Subscribe");
            }
        }

        private void HandleSubscribeClick()
        {
            if (!isCurrentTier)
            {
                OnSubscribe?.Invoke();
            }
        }
    }
}
