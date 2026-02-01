using UnityEngine;
using BlockGlass.Core;

namespace BlockGlass
{
    /// <summary>
    /// Boot scene initializer - entry point for the game
    /// Initializes all systems and starts splash screen
    /// </summary>
    public class BootLoader : MonoBehaviour
    {
        [Header("Managers")]
        [SerializeField] private GameObject gameManagerPrefab;
        [SerializeField] private GameObject audioManagerPrefab;
        [SerializeField] private GameObject adManagerPrefab;
        [SerializeField] private GameObject subscriptionManagerPrefab;

        [Header("Scene Loading")]
        [SerializeField] private string mainSceneName = "Main";
        [SerializeField] private bool autoLoadMainScene = true;

        private void Awake()
        {
            InitializePersistentManagers();
        }

        private void Start()
        {
            if (autoLoadMainScene)
            {
                LoadMainScene();
            }
        }

        private void InitializePersistentManagers()
        {
            // Game Manager
            if (GameManager.Instance == null && gameManagerPrefab != null)
            {
                Instantiate(gameManagerPrefab);
            }

            // Audio Manager
            if (AudioManager.Instance == null && audioManagerPrefab != null)
            {
                Instantiate(audioManagerPrefab);
            }

            // Ad Manager
            if (Ads.AdManager.Instance == null && adManagerPrefab != null)
            {
                Instantiate(adManagerPrefab);
            }

            // Subscription Manager
            if (Subscriptions.SubscriptionManager.Instance == null && subscriptionManagerPrefab != null)
            {
                Instantiate(subscriptionManagerPrefab);
            }

            Debug.Log("[BootLoader] Persistent managers initialized");
        }

        private void LoadMainScene()
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene(mainSceneName);
        }
    }
}
