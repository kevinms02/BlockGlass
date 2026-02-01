using UnityEngine;
using UnityEngine.UI;
using TMPro;
using BlockGlass.Core;
using BlockGlass.Gameplay;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Main gameplay screen with grid, score, and helper tools
    /// Grid and blocks are NOT glass (high contrast)
    /// Helper tray IS glass
    /// </summary>
    public class GameplayScreen : MonoBehaviour
    {
        [Header("Score Display")]
        [SerializeField] private TextMeshProUGUI scoreText;
        [SerializeField] private TextMeshProUGUI comboText;
        [SerializeField] private TextMeshProUGUI bestScoreText;

        [Header("Helper Tool Tray")]
        [SerializeField] private GlassPanel helperTray;
        [SerializeField] private HelperButton bombButton;
        [SerializeField] private HelperButton singleBlockButton;
        [SerializeField] private HelperButton undoButton;

        [Header("Gameplay References")]
        [SerializeField] private GridManager gridManager;
        [SerializeField] private BlockSpawner blockSpawner;
        [SerializeField] private ScoreManager scoreManager;
        [SerializeField] private HelperSystem helperSystem;
        [SerializeField] private DragDropController dragDropController;

        [Header("UI")]
        [SerializeField] private Button pauseButton;

        private bool isSelectingBombTarget = false;

        private void Awake()
        {
            SetupEventListeners();
            SetupButtons();
        }

        private void OnEnable()
        {
            InitializeGame();
        }

        private void SetupEventListeners()
        {
            if (scoreManager != null)
            {
                scoreManager.OnScoreChanged += UpdateScoreDisplay;
                scoreManager.OnComboChanged += UpdateComboDisplay;
                scoreManager.OnNewHighScore += OnNewHighScore;
            }

            if (gridManager != null)
            {
                gridManager.OnLinesCleared += OnLinesCleared;
            }

            if (helperSystem != null)
            {
                helperSystem.OnHelperUsageChanged += UpdateHelperButtons;
            }
        }

        private void SetupButtons()
        {
            if (pauseButton != null)
            {
                pauseButton.onClick.AddListener(OnPausePressed);
            }

            if (bombButton != null)
            {
                bombButton.OnClick += OnBombPressed;
            }

            if (singleBlockButton != null)
            {
                singleBlockButton.OnClick += OnSingleBlockPressed;
            }

            if (undoButton != null)
            {
                undoButton.OnClick += OnUndoPressed;
            }
        }

        private void InitializeGame()
        {
            // Initialize game systems
            gridManager?.InitializeGrid();
            scoreManager?.Initialize();
            helperSystem?.ResetForNewGame();
            blockSpawner?.SpawnNewBatch();

            // Update UI
            UpdateAllHelperButtons();

            GameMode mode = GameManager.Instance?.CurrentMode ?? GameMode.Classic;
            if (bestScoreText != null)
            {
                int best = SaveSystem.GetHighScore(mode);
                bestScoreText.text = $"Best: {best:N0}";
                bestScoreText.color = ColorPalette.TextSecondary;
            }
        }

        private void UpdateScoreDisplay(int score)
        {
            if (scoreText != null)
            {
                scoreText.text = score.ToString("N0");
                scoreText.color = ColorPalette.Accent;

                // Animate score
                StartCoroutine(AnimateScoreText());
            }
        }

        private System.Collections.IEnumerator AnimateScoreText()
        {
            if (scoreText == null) yield break;

            Vector3 originalScale = scoreText.transform.localScale;
            scoreText.transform.localScale = originalScale * 1.1f;

            float elapsed = 0f;
            float duration = 0.15f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                scoreText.transform.localScale = Vector3.Lerp(originalScale * 1.1f, originalScale, t);
                yield return null;
            }

            scoreText.transform.localScale = originalScale;
        }

        private void UpdateComboDisplay(int combo)
        {
            if (comboText != null)
            {
                if (combo > 1)
                {
                    comboText.text = $"x{combo}";
                    comboText.color = ColorPalette.Success;
                    comboText.gameObject.SetActive(true);
                }
                else
                {
                    comboText.gameObject.SetActive(false);
                }
            }
        }

        private void OnNewHighScore()
        {
            if (bestScoreText != null)
            {
                bestScoreText.text = $"Best: {scoreManager.CurrentScore:N0}";
                bestScoreText.color = ColorPalette.AccentBright;
            }
        }

        private void OnLinesCleared(int lines)
        {
            scoreManager?.AddLineClearScore(lines);
        }

        private void UpdateHelperButtons(HelperType type, int used, int remaining)
        {
            HelperButton button = type switch
            {
                HelperType.Bomb => bombButton,
                HelperType.SingleBlock => singleBlockButton,
                HelperType.Undo => undoButton,
                _ => null
            };

            if (button != null && helperSystem != null)
            {
                HelperDisplayInfo info = helperSystem.GetHelperInfo(type);
                button.UpdateDisplay(info);
            }
        }

        private void UpdateAllHelperButtons()
        {
            if (helperSystem == null) return;

            if (bombButton != null)
            {
                bombButton.UpdateDisplay(helperSystem.GetHelperInfo(HelperType.Bomb));
            }

            if (singleBlockButton != null)
            {
                singleBlockButton.UpdateDisplay(helperSystem.GetHelperInfo(HelperType.SingleBlock));
            }

            if (undoButton != null)
            {
                undoButton.UpdateDisplay(helperSystem.GetHelperInfo(HelperType.Undo));
            }
        }

        private void OnBombPressed()
        {
            if (helperSystem == null || !helperSystem.CanUseBomb()) return;

            // Enable bomb targeting mode
            isSelectingBombTarget = true;
            if (dragDropController != null)
            {
                dragDropController.SetEnabled(false);
            }

            // Show targeting UI
            Debug.Log("[Gameplay] Bomb targeting mode enabled - tap grid to place bomb");
        }

        private void OnSingleBlockPressed()
        {
            helperSystem?.RequestSingleBlock((success) =>
            {
                if (success)
                {
                    Debug.Log("[Gameplay] Single block added");
                }
            });
        }

        private void OnUndoPressed()
        {
            helperSystem?.TryUseUndo((success) =>
            {
                if (success)
                {
                    Debug.Log("[Gameplay] Undo applied");
                }
            });
        }

        private void OnPausePressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            GameManager.Instance?.PauseGame();
        }

        private void Update()
        {
            if (isSelectingBombTarget)
            {
                HandleBombTargeting();
            }
        }

        private void HandleBombTargeting()
        {
            if (Input.GetMouseButtonDown(0) || (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began))
            {
                Vector2 screenPos = Input.mousePosition;
                if (Input.touchCount > 0)
                {
                    screenPos = Input.GetTouch(0).position;
                }

                Vector3 worldPos = Camera.main.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, 10f));
                Vector2Int gridPos = gridManager.GetGridPosition(worldPos);

                if (gridManager.IsValidPosition(gridPos.x, gridPos.y))
                {
                    helperSystem?.TryUseBomb(gridPos.x, gridPos.y);
                }

                // Exit targeting mode
                isSelectingBombTarget = false;
                if (dragDropController != null)
                {
                    dragDropController.SetEnabled(true);
                }
            }

            // Cancel on escape/back
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                isSelectingBombTarget = false;
                if (dragDropController != null)
                {
                    dragDropController.SetEnabled(true);
                }
            }
        }

        private void OnDisable()
        {
            // Clean up event listeners
            if (scoreManager != null)
            {
                scoreManager.OnScoreChanged -= UpdateScoreDisplay;
                scoreManager.OnComboChanged -= UpdateComboDisplay;
                scoreManager.OnNewHighScore -= OnNewHighScore;
            }

            if (gridManager != null)
            {
                gridManager.OnLinesCleared -= OnLinesCleared;
            }

            if (helperSystem != null)
            {
                helperSystem.OnHelperUsageChanged -= UpdateHelperButtons;
            }
        }
    }
}
