using UnityEngine;

namespace BlockGlass
{
    /// <summary>
    /// Main scene controller - coordinates gameplay UI and systems
    /// </summary>
    public class MainSceneController : MonoBehaviour
    {
        [Header("Screen Manager")]
        [SerializeField] private Core.ScreenManager screenManager;

        [Header("Gameplay")]
        [SerializeField] private Gameplay.GridManager gridManager;
        [SerializeField] private Gameplay.BlockSpawner blockSpawner;
        [SerializeField] private Gameplay.ScoreManager scoreManager;
        [SerializeField] private Gameplay.HelperSystem helperSystem;
        [SerializeField] private Gameplay.DragDropController dragDropController;
        [SerializeField] private Gameplay.AdventureController adventureController;

        private void Start()
        {
            // Play splash and transition to dashboard
            if (screenManager != null)
            {
                StartCoroutine(screenManager.PlaySplashTransition());
            }
        }

        private void OnEnable()
        {
            SubscribeToEvents();
        }

        private void OnDisable()
        {
            UnsubscribeFromEvents();
        }

        private void SubscribeToEvents()
        {
            if (Core.GameManager.Instance != null)
            {
                Core.GameManager.Instance.OnStateChanged += OnGameStateChanged;
                Core.GameManager.Instance.OnModeChanged += OnGameModeChanged;
            }
        }

        private void UnsubscribeFromEvents()
        {
            if (Core.GameManager.Instance != null)
            {
                Core.GameManager.Instance.OnStateChanged -= OnGameStateChanged;
                Core.GameManager.Instance.OnModeChanged -= OnGameModeChanged;
            }
        }

        private void OnGameStateChanged(Core.GameState newState)
        {
            switch (newState)
            {
                case Core.GameState.Playing:
                    EnableGameplay(true);
                    break;
                case Core.GameState.Paused:
                case Core.GameState.GameOver:
                    EnableGameplay(false);
                    break;
            }
        }

        private void OnGameModeChanged(Core.GameMode mode)
        {
            if (adventureController != null)
            {
                adventureController.gameObject.SetActive(mode == Core.GameMode.Adventure);

                if (mode == Core.GameMode.Adventure)
                {
                    adventureController.Initialize();
                }
            }
        }

        private void EnableGameplay(bool enabled)
        {
            if (dragDropController != null)
            {
                dragDropController.enabled = enabled;
            }
        }
    }
}
