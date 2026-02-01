using UnityEngine;
using UnityEngine.EventSystems;

namespace BlockGlass.Gameplay
{
    /// <summary>
    /// Handles touch/mouse drag for placing blocks on the grid
    /// </summary>
    public class DragDropController : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Camera gameCamera;
        [SerializeField] private GridManager gridManager;
        [SerializeField] private BlockSpawner blockSpawner;
        [SerializeField] private ScoreManager scoreManager;

        [Header("Drag Settings")]
        [SerializeField] private float dragScale = 1.2f;
        [SerializeField] private float dragOffsetY = 1.5f; // Offset so finger doesn't cover block
        [SerializeField] private LayerMask blockLayer;

        private DraggableBlock currentDragBlock;
        private Vector3 originalPosition;
        private Vector3 originalScale;
        private bool isDragging = false;

        private void Update()
        {
            HandleInput();
        }

        private void HandleInput()
        {
#if UNITY_EDITOR || UNITY_STANDALONE
            HandleMouseInput();
#else
            HandleTouchInput();
#endif
        }

        private void HandleMouseInput()
        {
            if (Input.GetMouseButtonDown(0))
            {
                TryStartDrag(Input.mousePosition);
            }
            else if (Input.GetMouseButton(0) && isDragging)
            {
                UpdateDrag(Input.mousePosition);
            }
            else if (Input.GetMouseButtonUp(0) && isDragging)
            {
                EndDrag(Input.mousePosition);
            }
        }

        private void HandleTouchInput()
        {
            if (Input.touchCount == 0) return;

            Touch touch = Input.GetTouch(0);

            switch (touch.phase)
            {
                case TouchPhase.Began:
                    TryStartDrag(touch.position);
                    break;
                case TouchPhase.Moved:
                case TouchPhase.Stationary:
                    if (isDragging) UpdateDrag(touch.position);
                    break;
                case TouchPhase.Ended:
                case TouchPhase.Canceled:
                    if (isDragging) EndDrag(touch.position);
                    break;
            }
        }

        private void TryStartDrag(Vector2 screenPosition)
        {
            // Check if clicking on UI
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject())
            {
                return;
            }

            Vector3 worldPos = GetWorldPosition(screenPosition);

            // Find if we clicked on a draggable block
            foreach (var block in blockSpawner.CurrentBlocks)
            {
                if (!block.IsAvailable || block.Visual == null) continue;

                float distance = Vector3.Distance(worldPos, block.Visual.transform.position);
                if (distance < 1.5f) // Click radius
                {
                    StartDrag(block);
                    return;
                }
            }
        }

        private void StartDrag(DraggableBlock block)
        {
            currentDragBlock = block;
            isDragging = true;

            if (block.Visual != null)
            {
                originalPosition = block.Visual.transform.position;
                originalScale = block.Visual.transform.localScale;
                block.Visual.transform.localScale = originalScale * dragScale;
            }

            Core.AudioManager.Instance?.PlaySfx(Core.SoundType.ButtonClick);
        }

        private void UpdateDrag(Vector2 screenPosition)
        {
            if (currentDragBlock?.Visual == null) return;

            Vector3 worldPos = GetWorldPosition(screenPosition);
            worldPos.y += dragOffsetY;
            worldPos.z = 0;

            currentDragBlock.Visual.transform.position = worldPos;

            // Show placement preview
            Vector2Int gridPos = gridManager.GetGridPosition(worldPos);
            bool canPlace = gridManager.CanPlaceShape(currentDragBlock.Shape, gridPos.x, gridPos.y);
            gridManager.ShowPlacementPreview(currentDragBlock.Shape, gridPos.x, gridPos.y, canPlace);
        }

        private void EndDrag(Vector2 screenPosition)
        {
            if (currentDragBlock == null)
            {
                isDragging = false;
                return;
            }

            gridManager.ClearPlacementPreview();

            Vector3 worldPos = GetWorldPosition(screenPosition);
            worldPos.y += dragOffsetY;

            Vector2Int gridPos = gridManager.GetGridPosition(worldPos);

            if (gridManager.CanPlaceShape(currentDragBlock.Shape, gridPos.x, gridPos.y))
            {
                // Place the block
                PlaceBlock(gridPos);
            }
            else
            {
                // Return to original position
                ReturnBlockToSpawn();
            }

            isDragging = false;
            currentDragBlock = null;
        }

        private void PlaceBlock(Vector2Int gridPos)
        {
            if (currentDragBlock == null) return;

            // Place on grid
            bool placed = gridManager.PlaceShape(
                currentDragBlock.Shape,
                gridPos.x,
                gridPos.y,
                currentDragBlock.Shape.ShapeColor
            );

            if (placed)
            {
                // Add score based on cells placed
                scoreManager?.AddPlacementScore(currentDragBlock.Shape.CellCount);

                // Remove the block
                blockSpawner.RemoveBlock(currentDragBlock);

                Core.AudioManager.Instance?.PlaySfx(Core.SoundType.BlockPlace);
                Core.AudioManager.Instance?.Vibrate(Core.VibrationType.Light);

                // Check for game over
                CheckGameOver();
            }
            else
            {
                ReturnBlockToSpawn();
            }
        }

        private void ReturnBlockToSpawn()
        {
            if (currentDragBlock?.Visual == null) return;

            currentDragBlock.Visual.transform.position = originalPosition;
            currentDragBlock.Visual.transform.localScale = originalScale;
        }

        private void CheckGameOver()
        {
            if (!blockSpawner.CanPlaceAnyBlock())
            {
                Core.GameManager.Instance?.GameOver();
            }
        }

        private Vector3 GetWorldPosition(Vector2 screenPosition)
        {
            if (gameCamera == null)
            {
                gameCamera = Camera.main;
            }

            Vector3 worldPos = gameCamera.ScreenToWorldPoint(new Vector3(screenPosition.x, screenPosition.y, 10f));
            worldPos.z = 0;
            return worldPos;
        }

        public void SetEnabled(bool enabled)
        {
            this.enabled = enabled;
            if (!enabled && isDragging)
            {
                ReturnBlockToSpawn();
                isDragging = false;
                currentDragBlock = null;
            }
        }
    }
}
