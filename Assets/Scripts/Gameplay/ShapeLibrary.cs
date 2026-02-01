using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace BlockGlass.Gameplay
{
    /// <summary>
    /// Create default block shapes for the game
    /// Run this from Unity Editor menu to generate shape assets
    /// </summary>
    public class ShapeLibrary : MonoBehaviour
    {
#if UNITY_EDITOR
        [MenuItem("BlockGlass/Create Default Shapes")]
        public static void CreateDefaultShapes()
        {
            string path = "Assets/ScriptableObjects/Shapes/";

            // Ensure directory exists
            if (!AssetDatabase.IsValidFolder("Assets/ScriptableObjects"))
            {
                AssetDatabase.CreateFolder("Assets", "ScriptableObjects");
            }
            if (!AssetDatabase.IsValidFolder("Assets/ScriptableObjects/Shapes"))
            {
                AssetDatabase.CreateFolder("Assets/ScriptableObjects", "Shapes");
            }

            // Create shapes
            CreateShape("Single", new Vector2Int[] { new(0, 0) }, 1, new Color(0.2f, 0.85f, 0.9f), path);

            CreateShape("Line2", new Vector2Int[] { new(0, 0), new(1, 0) }, 2, new Color(0.55f, 0.35f, 0.9f), path);

            CreateShape("Line3", new Vector2Int[] { new(0, 0), new(1, 0), new(2, 0) }, 3, new Color(0.9f, 0.55f, 0.3f), path);

            CreateShape("Line4", new Vector2Int[] { new(0, 0), new(1, 0), new(2, 0), new(3, 0) }, 5, new Color(0.35f, 0.8f, 0.5f), path);

            CreateShape("Line5", new Vector2Int[] { new(0, 0), new(1, 0), new(2, 0), new(3, 0), new(4, 0) }, 7, new Color(0.9f, 0.45f, 0.55f), path);

            CreateShape("Square2x2", new Vector2Int[] { new(0, 0), new(1, 0), new(0, 1), new(1, 1) }, 3, new Color(0.95f, 0.8f, 0.3f), path);

            CreateShape("Square3x3", new Vector2Int[] {
                new(0, 0), new(1, 0), new(2, 0),
                new(0, 1), new(1, 1), new(2, 1),
                new(0, 2), new(1, 2), new(2, 2)
            }, 8, new Color(0.2f, 0.85f, 0.9f), path);

            CreateShape("L_Shape", new Vector2Int[] { new(0, 0), new(0, 1), new(0, 2), new(1, 2) }, 4, new Color(0.9f, 0.55f, 0.3f), path);

            CreateShape("L_Shape_Mirror", new Vector2Int[] { new(1, 0), new(1, 1), new(1, 2), new(0, 2) }, 4, new Color(0.35f, 0.8f, 0.5f), path);

            CreateShape("T_Shape", new Vector2Int[] { new(0, 0), new(1, 0), new(2, 0), new(1, 1) }, 5, new Color(0.55f, 0.35f, 0.9f), path);

            CreateShape("S_Shape", new Vector2Int[] { new(1, 0), new(2, 0), new(0, 1), new(1, 1) }, 6, new Color(0.9f, 0.45f, 0.55f), path);

            CreateShape("Z_Shape", new Vector2Int[] { new(0, 0), new(1, 0), new(1, 1), new(2, 1) }, 6, new Color(0.95f, 0.8f, 0.3f), path);

            CreateShape("Corner", new Vector2Int[] { new(0, 0), new(1, 0), new(0, 1) }, 2, new Color(0.2f, 0.85f, 0.9f), path);

            CreateShape("BigL", new Vector2Int[] {
                new(0, 0), new(0, 1), new(0, 2),
                new(1, 0), new(2, 0)
            }, 7, new Color(0.9f, 0.55f, 0.3f), path);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[ShapeLibrary] Created default shapes at " + path);
        }

        private static void CreateShape(string name, Vector2Int[] cells, int difficulty, Color color, string path)
        {
            BlockShape shape = ScriptableObject.CreateInstance<BlockShape>();

            // Use reflection or serialized object to set private fields
            var so = new SerializedObject(shape);
            so.FindProperty("shapeName").stringValue = name;

            var cellsProperty = so.FindProperty("cellOffsets");
            cellsProperty.arraySize = cells.Length;
            for (int i = 0; i < cells.Length; i++)
            {
                cellsProperty.GetArrayElementAtIndex(i).vector2IntValue = cells[i];
            }

            so.FindProperty("difficulty").intValue = difficulty;
            so.FindProperty("shapeColor").colorValue = color;

            so.ApplyModifiedPropertiesWithoutUndo();

            AssetDatabase.CreateAsset(shape, path + "Shape_" + name + ".asset");
        }
#endif

        /// <summary>
        /// Get all shapes from Resources at runtime
        /// </summary>
        public static BlockShape[] LoadAllShapes()
        {
            return Resources.LoadAll<BlockShape>("Shapes");
        }

        /// <summary>
        /// Get shapes filtered by difficulty
        /// </summary>
        public static BlockShape[] GetEasyShapes(BlockShape[] allShapes)
        {
            return System.Array.FindAll(allShapes, s => s.IsEasyShape);
        }

        public static BlockShape[] GetMediumShapes(BlockShape[] allShapes)
        {
            return System.Array.FindAll(allShapes, s => !s.IsEasyShape && !s.IsHardShape);
        }

        public static BlockShape[] GetHardShapes(BlockShape[] allShapes)
        {
            return System.Array.FindAll(allShapes, s => s.IsHardShape);
        }
    }
}
