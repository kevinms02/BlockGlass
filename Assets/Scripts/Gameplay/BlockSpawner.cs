using UnityEngine;
using System.Collections.Generic;
using System.Linq;

namespace BlockGlass.Gameplay
{
    /// <summary>
    /// Handles block spawning with fairness rules:
    /// - At least one valid move must always exist
    /// - Emergency easy blocks when grid >70% filled
    /// - Max one hard shape per spawn batch
    /// </summary>
    public class BlockSpawner : MonoBehaviour
    {
        [Header("Shape Library")]
        [SerializeField] private BlockShape[] allShapes;
        [SerializeField] private BlockShape[] easyShapes;
        [SerializeField] private BlockShape singleBlockShape; // 1x1 emergency shape

        [Header("Spawn Settings")]
        [SerializeField] private int shapesPerBatch = 3;
        [SerializeField] private float emergencyFillThreshold = 0.7f;

        [Header("Visual")]
        [SerializeField] private Transform spawnArea;
        [SerializeField] private GameObject blockPreviewPrefab;
        [SerializeField] private float previewSpacing = 2.5f;

        private List<DraggableBlock> currentBlocks = new List<DraggableBlock>();
        private GridManager gridManager;

        public List<DraggableBlock> CurrentBlocks => currentBlocks;
        public event System.Action<List<DraggableBlock>> OnBlocksSpawned;

        private void Start()
        {
            gridManager = GridManager.Instance;
        }

        /// <summary>
        /// Spawn a new batch of blocks with fairness guarantees
        /// </summary>
        public void SpawnNewBatch()
        {
            ClearCurrentBlocks();
            currentBlocks = GenerateFairBatch();
            CreateBlockVisuals();

            OnBlocksSpawned?.Invoke(currentBlocks);
        }

        private List<DraggableBlock> GenerateFairBatch()
        {
            List<DraggableBlock> batch = new List<DraggableBlock>();
            int hardShapeCount = 0;
            int attempts = 0;
            const int maxAttempts = 100;

            bool isEmergencyMode = gridManager != null && gridManager.FillPercentage > emergencyFillThreshold;

            while (batch.Count < shapesPerBatch && attempts < maxAttempts)
            {
                attempts++;

                BlockShape shape = SelectShape(isEmergencyMode, hardShapeCount);
                if (shape == null) continue;

                // Check if this shape is hard
                if (shape.IsHardShape)
                {
                    if (hardShapeCount >= 1)
                    {
                        // Already have a hard shape, skip
                        continue;
                    }
                    hardShapeCount++;
                }

                batch.Add(new DraggableBlock(shape));
            }

            // FAIRNESS CHECK: Ensure at least one valid move exists
            if (gridManager != null && !gridManager.HasValidMove(batch.Select(b => b.Shape).ToList()))
            {
                // Emergency: inject an easy shape that definitely fits
                batch = InjectValidShape(batch);
            }

            return batch;
        }

        private BlockShape SelectShape(bool isEmergencyMode, int hardShapeCount)
        {
            if (isEmergencyMode)
            {
                // In emergency mode, prefer easy shapes
                if (easyShapes != null && easyShapes.Length > 0)
                {
                    return easyShapes[Random.Range(0, easyShapes.Length)];
                }
            }

            // Normal selection from all shapes
            if (allShapes != null && allShapes.Length > 0)
            {
                BlockShape selected = allShapes[Random.Range(0, allShapes.Length)];

                // Limit hard shapes
                if (selected.IsHardShape && hardShapeCount >= 1)
                {
                    // Try to get a non-hard shape
                    return GetNonHardShape();
                }

                return selected;
            }

            return singleBlockShape;
        }

        private BlockShape GetNonHardShape()
        {
            if (allShapes == null || allShapes.Length == 0) return singleBlockShape;

            var nonHardShapes = allShapes.Where(s => !s.IsHardShape).ToArray();
            if (nonHardShapes.Length > 0)
            {
                return nonHardShapes[Random.Range(0, nonHardShapes.Length)];
            }

            return singleBlockShape;
        }

        /// <summary>
        /// Emergency injection: replace a shape with one that fits
        /// </summary>
        private List<DraggableBlock> InjectValidShape(List<DraggableBlock> batch)
        {
            // Find any shape that has a valid placement
            List<BlockShape> validShapes = FindAllValidShapes();

            if (validShapes.Count > 0)
            {
                if (batch.Count > 0)
                {
                    // Replace the last shape with a valid one
                    batch[batch.Count - 1] = new DraggableBlock(validShapes[Random.Range(0, validShapes.Count)]);
                }
                else
                {
                    batch.Add(new DraggableBlock(validShapes[0]));
                }
            }
            else if (singleBlockShape != null && gridManager.HasValidMoveForShape(singleBlockShape))
            {
                // Ultimate fallback: 1x1 block
                if (batch.Count > 0)
                {
                    batch[batch.Count - 1] = new DraggableBlock(singleBlockShape);
                }
                else
                {
                    batch.Add(new DraggableBlock(singleBlockShape));
                }
            }

            return batch;
        }

        private List<BlockShape> FindAllValidShapes()
        {
            List<BlockShape> valid = new List<BlockShape>();

            if (gridManager == null || allShapes == null) return valid;

            // Prioritize easy shapes
            if (easyShapes != null)
            {
                foreach (var shape in easyShapes)
                {
                    if (gridManager.HasValidMoveForShape(shape))
                    {
                        valid.Add(shape);
                    }
                }
            }

            // Then check all shapes
            foreach (var shape in allShapes)
            {
                if (!valid.Contains(shape) && gridManager.HasValidMoveForShape(shape))
                {
                    valid.Add(shape);
                }
            }

            return valid;
        }

        private void CreateBlockVisuals()
        {
            if (spawnArea == null || blockPreviewPrefab == null) return;

            float startX = -(shapesPerBatch - 1) * previewSpacing / 2f;

            for (int i = 0; i < currentBlocks.Count; i++)
            {
                Vector3 position = spawnArea.position + new Vector3(startX + i * previewSpacing, 0, 0);
                GameObject preview = CreateShapePreview(currentBlocks[i].Shape, position);
                currentBlocks[i].Visual = preview;
            }
        }

        private GameObject CreateShapePreview(BlockShape shape, Vector3 position)
        {
            GameObject preview = new GameObject($"Preview_{shape.ShapeName}");
            preview.transform.position = position;
            preview.transform.SetParent(spawnArea);

            // Create visual for each cell in the shape
            foreach (Vector2Int cellOffset in shape.Cells)
            {
                Vector3 cellPos = new Vector3(cellOffset.x * 0.5f, cellOffset.y * 0.5f, 0);
                GameObject cell = Instantiate(blockPreviewPrefab, preview.transform);
                cell.transform.localPosition = cellPos;

                SpriteRenderer sr = cell.GetComponent<SpriteRenderer>();
                if (sr != null)
                {
                    sr.color = shape.ShapeColor;
                }
            }

            // Center the preview
            Vector2Int bounds = shape.GetBounds();
            preview.transform.localPosition -= new Vector3((bounds.x - 1) * 0.25f, (bounds.y - 1) * 0.25f, 0);

            return preview;
        }

        public void RemoveBlock(DraggableBlock block)
        {
            if (block == null) return;

            block.IsAvailable = false;
            if (block.Visual != null)
            {
                Destroy(block.Visual);
            }

            // Check if all blocks are used
            if (currentBlocks.All(b => !b.IsAvailable))
            {
                SpawnNewBatch();
            }
        }

        public void ClearCurrentBlocks()
        {
            foreach (var block in currentBlocks)
            {
                if (block.Visual != null)
                {
                    Destroy(block.Visual);
                }
            }
            currentBlocks.Clear();
        }

        /// <summary>
        /// Check if any current block can be placed
        /// Used for game over detection
        /// </summary>
        public bool CanPlaceAnyBlock()
        {
            if (gridManager == null) return false;

            foreach (var block in currentBlocks)
            {
                if (block.IsAvailable && gridManager.HasValidMoveForShape(block.Shape))
                {
                    return true;
                }
            }
            return false;
        }
    }
}
