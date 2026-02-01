using UnityEngine;
using UnityEngine.UI;

namespace BlockGlass.UI
{
    /// <summary>
    /// Reusable Liquid Glass panel component
    /// Applies consistent frosted glass effect to UI panels
    /// </summary>
    [RequireComponent(typeof(Image))]
    public class GlassPanel : MonoBehaviour
    {
        [Header("Glass Settings")]
        [SerializeField, Range(0.8f, 0.9f)] private float opacity = 0.85f;
        [SerializeField] private float cornerRadius = 16f;
        [SerializeField] private float borderWidth = 1f;

        [Header("Animation")]
        [SerializeField] private bool animateOnEnable = true;
        [SerializeField] private float fadeInDuration = 0.3f;

        [Header("Optional Components")]
        [SerializeField] private Image borderImage;
        [SerializeField] private Image highlightImage;

        private Image backgroundImage;
        private CanvasGroup canvasGroup;

        private void Awake()
        {
            SetupComponents();
            ApplyGlassStyle();
        }

        private void OnEnable()
        {
            if (animateOnEnable)
            {
                StartCoroutine(FadeIn());
            }
        }

        private void SetupComponents()
        {
            backgroundImage = GetComponent<Image>();

            canvasGroup = GetComponent<CanvasGroup>();
            if (canvasGroup == null)
            {
                canvasGroup = gameObject.AddComponent<CanvasGroup>();
            }
        }

        public void ApplyGlassStyle()
        {
            if (backgroundImage != null)
            {
                backgroundImage.color = ColorPalette.GetGlassColor(opacity);

                // Note: Unity's built-in Image doesn't support corner radius
                // In production, use a 9-sliced sprite with rounded corners
                // or a custom shader for true rounded corners
            }

            if (borderImage != null)
            {
                borderImage.color = ColorPalette.GlassBorder;
            }

            if (highlightImage != null)
            {
                highlightImage.color = ColorPalette.GlassHighlight;
            }
        }

        public void SetOpacity(float newOpacity)
        {
            opacity = Mathf.Clamp(newOpacity, 0.8f, 0.9f);
            ApplyGlassStyle();
        }

        private System.Collections.IEnumerator FadeIn()
        {
            if (canvasGroup == null) yield break;

            canvasGroup.alpha = 0f;
            float elapsed = 0f;

            while (elapsed < fadeInDuration)
            {
                elapsed += Time.unscaledDeltaTime;
                canvasGroup.alpha = Mathf.Lerp(0f, 1f, elapsed / fadeInDuration);
                yield return null;
            }

            canvasGroup.alpha = 1f;
        }

        public void FadeOut(System.Action onComplete = null)
        {
            StartCoroutine(FadeOutCoroutine(onComplete));
        }

        private System.Collections.IEnumerator FadeOutCoroutine(System.Action onComplete)
        {
            if (canvasGroup == null) yield break;

            float elapsed = 0f;
            float startAlpha = canvasGroup.alpha;

            while (elapsed < fadeInDuration)
            {
                elapsed += Time.unscaledDeltaTime;
                canvasGroup.alpha = Mathf.Lerp(startAlpha, 0f, elapsed / fadeInDuration);
                yield return null;
            }

            canvasGroup.alpha = 0f;
            onComplete?.Invoke();
        }

        /// <summary>
        /// Animate a subtle pulse effect for interactive feedback
        /// </summary>
        public void Pulse()
        {
            StartCoroutine(PulseCoroutine());
        }

        private System.Collections.IEnumerator PulseCoroutine()
        {
            if (backgroundImage == null) yield break;

            Color originalColor = backgroundImage.color;
            Color pulseColor = ColorPalette.WithAlpha(ColorPalette.Accent, 0.15f);

            float duration = 0.15f;
            float elapsed = 0f;

            // Pulse up
            while (elapsed < duration)
            {
                elapsed += Time.unscaledDeltaTime;
                backgroundImage.color = Color.Lerp(originalColor, pulseColor, elapsed / duration);
                yield return null;
            }

            // Pulse back
            elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.unscaledDeltaTime;
                backgroundImage.color = Color.Lerp(pulseColor, originalColor, elapsed / duration);
                yield return null;
            }

            backgroundImage.color = originalColor;
        }

        #if UNITY_EDITOR
        private void OnValidate()
        {
            if (Application.isPlaying)
            {
                ApplyGlassStyle();
            }
        }
        #endif
    }
}
