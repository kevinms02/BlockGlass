using UnityEngine;
using System.Collections.Generic;

namespace BlockGlass.Gameplay
{
    /// <summary>
    /// Manages the 8x8 game grid, cell states, and line clearing detection
    /// </summary>
    public class GridManager : MonoBehaviour
    {
        public static GridManager Instance { get; private set; }

        [Header("Grid Settings")]
        [SerializeField] private int gridWidth = 8;
        [SerializeField] private int gridHeight = 8;
        [SerializeField] private float cellSize = 1f;
        [SerializeField] private float cellSpacing = 0.1f;

        [Header("Visual References")]
        [SerializeField] private Transform gridParent;
        [SerializeField] private GameObject cellPrefab;
        [SerializeField] private GameObject blockPrefab;

        [Header("Colors")]
        [SerializeField] private Color emptyCellColor = new Color(0.15f, 0.18f, 0.22f, 1f);
        [SerializeField] private Color validPlacementColor = new Color(0.2f, 0.8f, 0.8f, 0.3f);
        [SerializeField] private Color invalidPlacementColor = new Color(0.8f, 0.2f, 0.2f, 0.3f);

        private Cell[,] cells;
        private List<GameObject> placedBlocks = new List<GameObject>();
        private int filledCellCount = 0;

        public int GridWidth => gridWidth;
        public int GridHeight => gridHeight;
        public float CellSize => cellSize;
        public int FilledCellCount => filledCellCount;
        public float FillPercentage => (float)filledCellCount / (gridWidth * gridHeight);

        public event System.Action<int> OnLinesCleared;
        public event System.Action OnGridUpdated;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        public void InitializeGrid()
        {
            ClearGrid();
            cells = new Cell[gridWidth, gridHeight];

            for (int x = 0; x < gridWidth; x++)
            {
                for (int y = 0; y < gridHeight; y++)
                {
                    cells[x, y] = new Cell(x, y);
                    CreateCellVisual(x, y);
                }
            }

            filledCellCount = 0;
            OnGridUpdated?.Invoke();
        }

        private void CreateCellVisual(int x, int y)
        {
            if (cellPrefab == null || gridParent == null) return;

            Vector3 position = GetWorldPosition(x, y);
            GameObject cellObj = Instantiate(cellPrefab, position, Quaternion.identity, gridParent);
            cellObj.name = $"Cell_{x}_{y}";
            cells[x, y].Visual = cellObj;

            // Set empty cell color
            SpriteRenderer sr = cellObj.GetComponent<SpriteRenderer>();
            if (sr != null)
            {
                sr.color = emptyCellColor;
            }
        }

        public Vector3 GetWorldPosition(int x, int y)
        {
            float totalWidth = gridWidth * (cellSize + cellSpacing) - cellSpacing;
            float totalHeight = gridHeight * (cellSize + cellSpacing) - cellSpacing;

            float startX = -totalWidth / 2f + cellSize / 2f;
            float startY = -totalHeight / 2f + cellSize / 2f;

            return new Vector3(
                startX + x * (cellSize + cellSpacing),
                startY + y * (cellSize + cellSpacing),
                0f
            );
        }

        public Vector2Int GetGridPosition(Vector3 worldPosition)
        {
            float totalWidth = gridWidth * (cellSize + cellSpacing) - cellSpacing;
            float totalHeight = gridHeight * (cellSize + cellSpacing) - cellSpacing;

            float startX = -totalWidth / 2f;
            float startY = -totalHeight / 2f;

            int x = Mathf.FloorToInt((worldPosition.x - startX) / (cellSize + cellSpacing));
            int y = Mathf.FloorToInt((worldPosition.y - startY) / (cellSize + cellSpacing));

            return new Vector2Int(x, y);
        }

        public bool IsValidPosition(int x, int y)
        {
            return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
        }

        public bool IsCellEmpty(int x, int y)
        {
            if (!IsValidPosition(x, y)) return false;
            return !cells[x, y].IsOccupied;
        }

        public bool CanPlaceShape(BlockShape shape, int originX, int originY)
        {
            if (shape == null) return false;

            foreach (Vector2Int offset in shape.Cells)
            {
                int x = originX + offset.x;
                int y = originY + offset.y;

                if (!IsValidPosition(x, y) || !IsCellEmpty(x, y))
                {
                    return false;
                }
            }
            return true;
        }

        public bool PlaceShape(BlockShape shape, int originX, int originY, Color blockColor)
        {
            if (!CanPlaceShape(shape, originX, originY)) return false;

            foreach (Vector2Int offset in shape.Cells)
            {
                int x = originX + offset.x;
                int y = originY + offset.y;

                cells[x, y].IsOccupied = true;
                cells[x, y].BlockColor = blockColor;
                filledCellCount++;

                // Create block visual
                CreateBlockVisual(x, y, blockColor);
            }

            OnGridUpdated?.Invoke();

            // Check for line clears
            int clearedLines = CheckAndClearLines();
            if (clearedLines > 0)
            {
                OnLinesCleared?.Invoke(clearedLines);
            }

            return true;
        }

        private void CreateBlockVisual(int x, int y, Color color)
        {
            if (blockPrefab == null || gridParent == null) return;

            Vector3 position = GetWorldPosition(x, y);
            GameObject blockObj = Instantiate(blockPrefab, position, Quaternion.identity, gridParent);
            blockObj.name = $"Block_{x}_{y}";

            SpriteRenderer sr = blockObj.GetComponent<SpriteRenderer>();
            if (sr != null)
            {
                sr.color = color;
                sr.sortingOrder = 1;
            }

            cells[x, y].BlockVisual = blockObj;
            placedBlocks.Add(blockObj);
        }

        private int CheckAndClearLines()
        {
            List<int> rowsToClear = new List<int>();
            List<int> colsToClear = new List<int>();

            // Check rows
            for (int y = 0; y < gridHeight; y++)
            {
                bool rowFull = true;
                for (int x = 0; x < gridWidth; x++)
                {
                    if (!cells[x, y].IsOccupied)
                    {
                        rowFull = false;
                        break;
                    }
                }
                if (rowFull) rowsToClear.Add(y);
            }

            // Check columns
            for (int x = 0; x < gridWidth; x++)
            {
                bool colFull = true;
                for (int y = 0; y < gridHeight; y++)
                {
                    if (!cells[x, y].IsOccupied)
                    {
                        colFull = false;
                        break;
                    }
                }
                if (colFull) colsToClear.Add(x);
            }

            // Clear rows
            foreach (int y in rowsToClear)
            {
                for (int x = 0; x < gridWidth; x++)
                {
                    ClearCell(x, y);
                }
            }

            // Clear columns
            foreach (int x in colsToClear)
            {
                for (int y = 0; y < gridHeight; y++)
                {
                    ClearCell(x, y);
                }
            }

            return rowsToClear.Count + colsToClear.Count;
        }

        private void ClearCell(int x, int y)
        {
            if (!cells[x, y].IsOccupied) return;

            cells[x, y].IsOccupied = false;
            filledCellCount--;

            if (cells[x, y].BlockVisual != null)
            {
                placedBlocks.Remove(cells[x, y].BlockVisual);
                Destroy(cells[x, y].BlockVisual);
                cells[x, y].BlockVisual = null;
            }
        }

        /// <summary>
        /// Check if any valid move exists for a list of available shapes
        /// CRITICAL: Used for fairness - must always return true after spawn
        /// </summary>
        public bool HasValidMove(List<BlockShape> availableShapes)
        {
            if (availableShapes == null || availableShapes.Count == 0) return false;

            foreach (BlockShape shape in availableShapes)
            {
                if (HasValidMoveForShape(shape))
                {
                    return true;
                }
            }
            return false;
        }

        public bool HasValidMoveForShape(BlockShape shape)
        {
            if (shape == null) return false;

            for (int x = 0; x < gridWidth; x++)
            {
                for (int y = 0; y < gridHeight; y++)
                {
                    if (CanPlaceShape(shape, x, y))
                    {
                        return true;
                    }
                }
            }
            return false;
        }

        /// <summary>
        /// Emergency bomb - clears a 3x3 area around target
        /// </summary>
        public int UseBomb(int targetX, int targetY)
        {
            int cleared = 0;

            for (int x = targetX - 1; x <= targetX + 1; x++)
            {
                for (int y = targetY - 1; y <= targetY + 1; y++)
                {
                    if (IsValidPosition(x, y) && cells[x, y].IsOccupied)
                    {
                        ClearCell(x, y);
                        cleared++;
                    }
                }
            }

            OnGridUpdated?.Invoke();
            return cleared;
        }

        /// <summary>
        /// Undo support - stores grid state
        /// </summary>
        public GridState SaveState()
        {
            GridState state = new GridState(gridWidth, gridHeight);
            for (int x = 0; x < gridWidth; x++)
            {
                for (int y = 0; y < gridHeight; y++)
                {
                    state.Cells[x, y] = cells[x, y].IsOccupied;
                    state.Colors[x, y] = cells[x, y].BlockColor;
                }
            }
            return state;
        }

        public void RestoreState(GridState state)
        {
            if (state == null) return;

            ClearAllBlocks();

            for (int x = 0; x < gridWidth; x++)
            {
                for (int y = 0; y < gridHeight; y++)
                {
                    if (state.Cells[x, y])
                    {
                        cells[x, y].IsOccupied = true;
                        cells[x, y].BlockColor = state.Colors[x, y];
                        filledCellCount++;
                        CreateBlockVisual(x, y, state.Colors[x, y]);
                    }
                }
            }

            OnGridUpdated?.Invoke();
        }

        private void ClearAllBlocks()
        {
            foreach (var block in placedBlocks)
            {
                if (block != null) Destroy(block);
            }
            placedBlocks.Clear();

            for (int x = 0; x < gridWidth; x++)
            {
                for (int y = 0; y < gridHeight; y++)
                {
                    cells[x, y].IsOccupied = false;
                    cells[x, y].BlockVisual = null;
                }
            }

            filledCellCount = 0;
        }

        public void ClearGrid()
        {
            ClearAllBlocks();

            if (gridParent != null)
            {
                foreach (Transform child in gridParent)
                {
                    Destroy(child.gameObject);
                }
            }
        }

        public void ShowPlacementPreview(BlockShape shape, int originX, int originY, bool isValid)
        {
            // Visual feedback during drag - to be implemented in DragDropController
            Color previewColor = isValid ? validPlacementColor : invalidPlacementColor;

            foreach (Vector2Int offset in shape.Cells)
            {
                int x = originX + offset.x;
                int y = originY + offset.y;

                if (IsValidPosition(x, y) && cells[x, y].Visual != null)
                {
                    SpriteRenderer sr = cells[x, y].Visual.GetComponent<SpriteRenderer>();
                    if (sr != null)
                    {
                        sr.color = IsCellEmpty(x, y) ? previewColor : invalidPlacementColor;
                    }
                }
            }
        }

        public void ClearPlacementPreview()
        {
            for (int x = 0; x < gridWidth; x++)
            {
                for (int y = 0; y < gridHeight; y++)
                {
                    if (cells[x, y].Visual != null)
                    {
                        SpriteRenderer sr = cells[x, y].Visual.GetComponent<SpriteRenderer>();
                        if (sr != null)
                        {
                            sr.color = emptyCellColor;
                        }
                    }
                }
            }
        }
    }

    [System.Serializable]
    public class Cell
    {
        public int X { get; private set; }
        public int Y { get; private set; }
        public bool IsOccupied { get; set; }
        public Color BlockColor { get; set; }
        public GameObject Visual { get; set; }
        public GameObject BlockVisual { get; set; }

        public Cell(int x, int y)
        {
            X = x;
            Y = y;
            IsOccupied = false;
            BlockColor = Color.clear;
        }
    }

    [System.Serializable]
    public class GridState
    {
        public bool[,] Cells { get; private set; }
        public Color[,] Colors { get; private set; }

        public GridState(int width, int height)
        {
            Cells = new bool[width, height];
            Colors = new Color[width, height];
        }
    }
}
