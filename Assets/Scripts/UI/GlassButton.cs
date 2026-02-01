using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;

namespace BlockGlass.UI
{
    /// <summary>
    /// Liquid Glass styled button with tactile feedback
    /// </summary>
    [RequireComponent(typeof(Image))]
    public class GlassButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerEnterHandler, IPointerExitHandler
    {
        [Header("Button Settings")]
        [SerializeField] private bool interactable = true;
        [SerializeField] private float pressScale = 0.95f;
        [SerializeField] private float animationDuration = 0.1f;

        [Header("Visual References")]
        [SerializeField] private TextMeshProUGUI buttonText;
        [SerializeField] private Image iconImage;
        [SerializeField] private Image glowImage;

        [Header("Colors")]
        [SerializeField] private bool useAccentColor = true;

        private Image backgroundImage;
        private RectTransform rectTransform;
        private Vector3 originalScale;
        private Color normalColor;
        private Color pressedColor;
        private Color disabledColor;

        private bool isPressed = false;
        private bool isHovered = false;

        public UnityEngine.Events.UnityEvent onClick;
        public bool Interactable
        {
            get => interactable;
            set
            {
                interactable = value;
                UpdateVisualState();
            }
        }

        private void Awake()
        {
            backgroundImage = GetComponent<Image>();
            rectTransform = GetComponent<RectTransform>();
            originalScale = rectTransform.localScale;

            SetupColors();
            UpdateVisualState();
        }

        private void SetupColors()
        {
            if (useAccentColor)
            {
                normalColor = ColorPalette.WithAlpha(ColorPalette.Accent, 0.9f);
                pressedColor = ColorPalette.AccentDim;
            }
            else
            {
                normalColor = ColorPalette.GetGlassColor(0.85f);
                pressedColor = ColorPalette.GetGlassColor(0.9f);
            }

            disabledColor = ColorPalette.WithAlpha(ColorPalette.TextDisabled, 0.5f);
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (!interactable) return;

            isPressed = true;
            AnimatePress();

            Core.AudioManager.Instance?.PlaySfx(Core.SoundType.ButtonClick);
            Core.AudioManager.Instance?.Vibrate(Core.VibrationType.Light);
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (!interactable) return;

            bool wasPressed = isPressed;
            isPressed = false;
            AnimateRelease();

            if (wasPressed)
            {
                onClick?.Invoke();
            }
        }

        public void OnPointerEnter(PointerEventData eventData)
        {
            if (!interactable) return;

            isHovered = true;
            ShowGlow(true);
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            isPressed = false;
            isHovered = false;

            ShowGlow(false);
            AnimateRelease();
        }

        private void AnimatePress()
        {
            StopAllCoroutines();
            StartCoroutine(AnimateScale(originalScale * pressScale));

            if (backgroundImage != null)
            {
                backgroundImage.color = pressedColor;
            }
        }

        private void AnimateRelease()
        {
            StopAllCoroutines();
            StartCoroutine(AnimateScale(originalScale));

            if (backgroundImage != null && interactable)
            {
                backgroundImage.color = normalColor;
            }
        }

        private System.Collections.IEnumerator AnimateScale(Vector3 targetScale)
        {
            Vector3 startScale = rectTransform.localScale;
            float elapsed = 0f;

            while (elapsed < animationDuration)
            {
                elapsed += Time.unscaledDeltaTime;
                float t = elapsed / animationDuration;
                // Ease out cubic
                t = 1f - Mathf.Pow(1f - t, 3f);
                rectTransform.localScale = Vector3.Lerp(startScale, targetScale, t);
                yield return null;
            }

            rectTransform.localScale = targetScale;
        }

        private void ShowGlow(bool show)
        {
            if (glowImage == null) return;

            Color targetColor = show
                ? ColorPalette.WithAlpha(ColorPalette.Accent, 0.3f)
                : Color.clear;

            glowImage.color = targetColor;
        }

        private void UpdateVisualState()
        {
            if (backgroundImage != null)
            {
                backgroundImage.color = interactable ? normalColor : disabledColor;
            }

            if (buttonText != null)
            {
                buttonText.color = interactable ? ColorPalette.TextPrimary : ColorPalette.TextDisabled;
            }

            if (iconImage != null)
            {
                iconImage.color = interactable ? ColorPalette.TextPrimary : ColorPalette.TextDisabled;
            }
        }

        public void SetText(string text)
        {
            if (buttonText != null)
            {
                buttonText.text = text;
            }
        }

        public void SetIcon(Sprite icon)
        {
            if (iconImage != null)
            {
                iconImage.sprite = icon;
                iconImage.gameObject.SetActive(icon != null);
            }
        }
    }
}
