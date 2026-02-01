Shader "BlockGlass/LiquidGlass"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Base Color", Color) = (0.1, 0.12, 0.18, 0.85)
        _BorderColor ("Border Color", Color) = (0.25, 0.28, 0.35, 0.6)
        _BorderWidth ("Border Width", Range(0, 0.1)) = 0.02
        _CornerRadius ("Corner Radius", Range(0, 0.5)) = 0.1
        _BlurAmount ("Blur Amount", Range(0, 1)) = 0.3
        _HighlightIntensity ("Highlight Intensity", Range(0, 1)) = 0.05
    }
    
    SubShader
    {
        Tags 
        { 
            "Queue" = "Transparent" 
            "RenderType" = "Transparent"
            "IgnoreProjector" = "True"
        }
        
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off
        
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            
            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                float4 color : COLOR;
            };
            
            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
                float4 color : COLOR;
            };
            
            sampler2D _MainTex;
            float4 _MainTex_ST;
            fixed4 _Color;
            fixed4 _BorderColor;
            float _BorderWidth;
            float _CornerRadius;
            float _BlurAmount;
            float _HighlightIntensity;
            
            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.color = v.color;
                return o;
            }
            
            // Signed distance function for rounded rectangle
            float roundedRectSDF(float2 centerPos, float2 size, float radius)
            {
                float2 q = abs(centerPos) - size + radius;
                return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
            }
            
            fixed4 frag (v2f i) : SV_Target
            {
                // Center UV coordinates
                float2 centeredUV = i.uv - 0.5;
                
                // Calculate rounded rectangle
                float2 size = float2(0.5, 0.5);
                float dist = roundedRectSDF(centeredUV, size - _BorderWidth, _CornerRadius);
                
                // Anti-aliased edge
                float edgeSmoothness = 0.01;
                float alpha = 1.0 - smoothstep(-edgeSmoothness, edgeSmoothness, dist);
                
                // Border
                float borderDist = roundedRectSDF(centeredUV, size, _CornerRadius);
                float borderMask = smoothstep(-edgeSmoothness, edgeSmoothness, dist) * 
                                   (1.0 - smoothstep(-edgeSmoothness, edgeSmoothness, borderDist + _BorderWidth));
                
                // Highlight (top edge)
                float highlight = max(0, 1.0 - (i.uv.y * 4.0)) * _HighlightIntensity;
                
                // Combine colors
                fixed4 col = _Color;
                col.rgb += highlight;
                col = lerp(col, _BorderColor, borderMask);
                col.a *= alpha * i.color.a;
                
                return col;
            }
            ENDCG
        }
    }
    
    Fallback "UI/Default"
}
