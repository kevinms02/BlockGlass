using UnityEngine;
using BlockGlass.Core;
using BlockGlass.Ads;

namespace BlockGlass.Gameplay
{
    /// <summary>
    /// Helper tools system: Bomb, Single Block, Undo
    /// RULES (STRICTLY ENFORCED):
    /// - 1 free use per game per helper
    /// - Max 3 total uses per game per helper
    /// - NEVER modifies score
    /// - Requires rewarded ad after free use (or subscription)
    /// </summary>
    public class HelperSystem : MonoBehaviour
    {
        public static HelperSystem Instance { get; private set; }

        [Header("References")]
        [SerializeField] private GridManager gridManager;
        [SerializeField] private BlockSpawner blockSpawner;
        [SerializeField] private ScoreManager scoreManager;

        [Header("Settings")]
        [SerializeField] private int freeUsesPerGame = 1;
        [SerializeField] private int maxUsesPerGame = 3;

        [Header("Single Block Shape")]
        [SerializeField] private BlockShape singleBlockShape;
        [SerializeField] private Color singleBlockColor = new Color(0.2f, 0.8f, 0.8f, 1f);

        // Usage tracking per helper type
        private int bombUsesThisGame = 0;
        private int singleBlockUsesThisGame = 0;
        private int undoUsesThisGame = 0;

        // Undo state
        private GridState lastGridState;
        private int lastScore;

        public int BombUsesRemaining => maxUsesPerGame - bombUsesThisGame;
        public int SingleBlockUsesRemaining => maxUsesPerGame - singleBlockUsesThisGame;
        public int UndoUsesRemaining => maxUsesPerGame - undoUsesThisGame;

        public bool BombHasFreeUse => bombUsesThisGame < freeUsesPerGame;
        public bool SingleBlockHasFreeUse => singleBlockUsesThisGame < freeUsesPerGame;
        public bool UndoHasFreeUse => undoUsesThisGame < freeUsesPerGame;

        public event System.Action<HelperType, int, int> OnHelperUsageChanged; // type, used, remaining
        public event System.Action<HelperType> OnHelperActivated;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        public void ResetForNewGame()
        {
            bombUsesThisGame = 0;
            singleBlockUsesThisGame = 0;
            undoUsesThisGame = 0;
            lastGridState = null;
            lastScore = 0;

            NotifyUsageChanged(HelperType.Bomb);
            NotifyUsageChanged(HelperType.SingleBlock);
            NotifyUsageChanged(HelperType.Undo);
        }

        /// <summary>
        /// Save state before each player action (for undo)
        /// </summary>
        public void SaveStateForUndo()
        {
            if (gridManager != null)
            {
                lastGridState = gridManager.SaveState();
            }
            if (scoreManager != null)
            {
                lastScore = scoreManager.CurrentScore;
            }
        }

        #region Bomb Helper

        public bool CanUseBomb()
        {
            return bombUsesThisGame < maxUsesPerGame;
        }

        public bool TryUseBomb(int targetX, int targetY)
        {
            if (!CanUseBomb()) return false;

            bool needsAd = bombUsesThisGame >= freeUsesPerGame && !SaveSystem.HasFreeHelpers();

            if (needsAd)
            {
                // Show rewarded ad first
                AdManager.Instance?.ShowRewardedAd(
                    onSuccess: () => ExecuteBomb(targetX, targetY),
                    onFailed: () => Debug.Log("[HelperSystem] Ad failed, bomb not used")
                );
                return true;
            }
            else
            {
                ExecuteBomb(targetX, targetY);
                return true;
            }
        }

        private void ExecuteBomb(int targetX, int targetY)
        {
            int scoreBefore = scoreManager?.CurrentScore ?? 0;

            int cleared = gridManager.UseBomb(targetX, targetY);

            // CRITICAL: Verify score wasn't modified
            int scoreAfter = scoreManager?.CurrentScore ?? 0;
            scoreManager?.VerifyNoScoreChange(scoreBefore, scoreAfter);

            bombUsesThisGame++;
            NotifyUsageChanged(HelperType.Bomb);
            OnHelperActivated?.Invoke(HelperType.Bomb);

            AudioManager.Instance?.PlaySfx(SoundType.HelperUse);
            AudioManager.Instance?.Vibrate(VibrationType.Heavy);

            Debug.Log($"[HelperSystem] Bomb used at ({targetX}, {targetY}), cleared {cleared} cells");
        }

        #endregion

        #region Single Block Helper

        public bool CanUseSingleBlock()
        {
            return singleBlockUsesThisGame < maxUsesPerGame;
        }

        public void RequestSingleBlock(System.Action<bool> callback)
        {
            if (!CanUseSingleBlock())
            {
                callback?.Invoke(false);
                return;
            }

            bool needsAd = singleBlockUsesThisGame >= freeUsesPerGame && !SaveSystem.HasFreeHelpers();

            if (needsAd)
            {
                AdManager.Instance?.ShowRewardedAd(
                    onSuccess: () =>
                    {
                        ExecuteSingleBlock();
                        callback?.Invoke(true);
                    },
                    onFailed: () => callback?.Invoke(false)
                );
            }
            else
            {
                ExecuteSingleBlock();
                callback?.Invoke(true);
            }
        }

        private void ExecuteSingleBlock()
        {
            // Add single block to available blocks (doesn't place automatically)
            if (singleBlockShape != null && blockSpawner != null)
            {
                // Create a new draggable single block
                DraggableBlock singleBlock = new DraggableBlock(singleBlockShape);
                singleBlock.Shape.GetType(); // Just accessing to validate

                singleBlockUsesThisGame++;
                NotifyUsageChanged(HelperType.SingleBlock);
                OnHelperActivated?.Invoke(HelperType.SingleBlock);

                AudioManager.Instance?.PlaySfx(SoundType.HelperUse);
            }
        }

        #endregion

        #region Undo Helper

        public bool CanUseUndo()
        {
            return undoUsesThisGame < maxUsesPerGame && lastGridState != null;
        }

        public void TryUseUndo(System.Action<bool> callback)
        {
            if (!CanUseUndo())
            {
                callback?.Invoke(false);
                return;
            }

            bool needsAd = undoUsesThisGame >= freeUsesPerGame && !SaveSystem.HasFreeHelpers();

            if (needsAd)
            {
                AdManager.Instance?.ShowRewardedAd(
                    onSuccess: () =>
                    {
                        ExecuteUndo();
                        callback?.Invoke(true);
                    },
                    onFailed: () => callback?.Invoke(false)
                );
            }
            else
            {
                ExecuteUndo();
                callback?.Invoke(true);
            }
        }

        private void ExecuteUndo()
        {
            if (lastGridState == null) return;

            // Restore grid state (score remains unchanged - undo doesn't restore score)
            gridManager.RestoreState(lastGridState);

            undoUsesThisGame++;
            NotifyUsageChanged(HelperType.Undo);
            OnHelperActivated?.Invoke(HelperType.Undo);

            AudioManager.Instance?.PlaySfx(SoundType.HelperUse);

            // Clear the undo state (can't undo twice in a row)
            lastGridState = null;
        }

        #endregion

        private void NotifyUsageChanged(HelperType type)
        {
            int used = 0;
            int remaining = 0;

            switch (type)
            {
                case HelperType.Bomb:
                    used = bombUsesThisGame;
                    remaining = BombUsesRemaining;
                    break;
                case HelperType.SingleBlock:
                    used = singleBlockUsesThisGame;
                    remaining = SingleBlockUsesRemaining;
                    break;
                case HelperType.Undo:
                    used = undoUsesThisGame;
                    remaining = UndoUsesRemaining;
                    break;
            }

            OnHelperUsageChanged?.Invoke(type, used, remaining);
        }

        /// <summary>
        /// Get display info for helper button
        /// </summary>
        public HelperDisplayInfo GetHelperInfo(HelperType type)
        {
            return type switch
            {
                HelperType.Bomb => new HelperDisplayInfo
                {
                    UsesRemaining = BombUsesRemaining,
                    HasFreeUse = BombHasFreeUse,
                    NeedsAd = !BombHasFreeUse && !SaveSystem.HasFreeHelpers(),
                    IsAvailable = CanUseBomb()
                },
                HelperType.SingleBlock => new HelperDisplayInfo
                {
                    UsesRemaining = SingleBlockUsesRemaining,
                    HasFreeUse = SingleBlockHasFreeUse,
                    NeedsAd = !SingleBlockHasFreeUse && !SaveSystem.HasFreeHelpers(),
                    IsAvailable = CanUseSingleBlock()
                },
                HelperType.Undo => new HelperDisplayInfo
                {
                    UsesRemaining = UndoUsesRemaining,
                    HasFreeUse = UndoHasFreeUse,
                    NeedsAd = !UndoHasFreeUse && !SaveSystem.HasFreeHelpers(),
                    IsAvailable = CanUseUndo()
                },
                _ => new HelperDisplayInfo()
            };
        }
    }

    public enum HelperType
    {
        Bomb,
        SingleBlock,
        Undo
    }

    public struct HelperDisplayInfo
    {
        public int UsesRemaining;
        public bool HasFreeUse;
        public bool NeedsAd;
        public bool IsAvailable;
    }
}
