using UnityEngine;
using System.Collections.Generic;

namespace BlockGlass.Gameplay
{
    /// <summary>
    /// ScriptableObject defining a block shape with cells and difficulty
    /// </summary>
    [CreateAssetMenu(fileName = "NewBlockShape", menuName = "BlockGlass/Block Shape")]
    public class BlockShape : ScriptableObject
    {
        [Header("Shape Definition")]
        [SerializeField] private string shapeName = "Shape";
        [SerializeField] private Vector2Int[] cellOffsets;
        [SerializeField] private Color shapeColor = Color.cyan;

        [Header("Difficulty")]
        [Tooltip("1-3: Easy, 4-6: Medium, 7-10: Hard")]
        [Range(1, 10)]
        [SerializeField] private int difficulty = 5;

        [Header("Visual")]
        [SerializeField] private Sprite previewSprite;

        public string ShapeName => shapeName;
        public Vector2Int[] Cells => cellOffsets;
        public Color ShapeColor => shapeColor;
        public int Difficulty => difficulty;
        public Sprite PreviewSprite => previewSprite;
        public bool IsHardShape => difficulty >= 7;
        public bool IsEasyShape => difficulty <= 3;

        public int CellCount => cellOffsets != null ? cellOffsets.Length : 0;

        /// <summary>
        /// Get the bounding box of this shape
        /// </summary>
        public Vector2Int GetBounds()
        {
            if (cellOffsets == null || cellOffsets.Length == 0)
                return Vector2Int.zero;

            int maxX = 0, maxY = 0;
            foreach (var cell in cellOffsets)
            {
                if (cell.x > maxX) maxX = cell.x;
                if (cell.y > maxY) maxY = cell.y;
            }
            return new Vector2Int(maxX + 1, maxY + 1);
        }

        /// <summary>
        /// Validate the shape data
        /// </summary>
        private void OnValidate()
        {
            if (cellOffsets == null || cellOffsets.Length == 0)
            {
                cellOffsets = new Vector2Int[] { Vector2Int.zero };
            }
        }
    }

    /// <summary>
    /// Runtime representation of a draggable block
    /// </summary>
    public class DraggableBlock
    {
        public BlockShape Shape { get; private set; }
        public GameObject Visual { get; set; }
        public bool IsAvailable { get; set; } = true;

        public DraggableBlock(BlockShape shape)
        {
            Shape = shape;
        }
    }
}
