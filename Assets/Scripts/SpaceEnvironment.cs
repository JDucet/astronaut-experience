using UnityEngine;

public class SpaceEnvironment : MonoBehaviour
{
    public Material skyboxMaterial;
    public float nebulaBrightness = 0.8f;
    public Color nebulaColor1 = new Color(0.2f, 0.1f, 0.4f); // Purple
    public Color nebulaColor2 = new Color(0.4f, 0.1f, 0.2f); // Red
    
    void Start()
    {
        // Create or assign skybox
        if (skyboxMaterial == null)
        {
            skyboxMaterial = new Material(Shader.Find("Skybox/Cubemap"));
            RenderSettings.skybox = skyboxMaterial;
        }
        else
        {
            RenderSettings.skybox = skyboxMaterial;
        }
        
        // Setup lighting for space
        RenderSettings.ambientLight = new Color(0.1f, 0.1f, 0.15f);
        RenderSettings.ambientIntensity = 0.3f;
        
        // Create background nebula effect with particles
        CreateNebulaParticles();
    }

    void CreateNebulaParticles()
    {
        GameObject nebula = new GameObject("NebulaParticles");
        nebula.transform.position = Vector3.zero;
        
        ParticleSystem ps = nebula.AddComponent<ParticleSystem>();
        var renderer = nebula.GetComponent<ParticleSystemRenderer>();
        
        // Configure particles
        var main = ps.main;
        main.startLifetime = 1000f;
        main.startSize = 200f;
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        main.loop = true;
        
        var emission = ps.emission;
        emission.rateOverTime = 0.5f;
        
        var shape = ps.shape;
        shape.shapeType = ParticleSystemShapeType.Sphere;
        shape.radius = 100f;
        
        var colorOverLifetime = ps.colorOverLifetime;
        colorOverLifetime.enabled = true;
        
        Gradient grad = new Gradient();
        grad.SetKeys(
            new GradientColorKey[] {
                new GradientColorKey(nebulaColor1, 0f),
                new GradientColorKey(nebulaColor2, 1f)
            },
            new GradientAlphaKey[] {
                new GradientAlphaKey(0.2f, 0f),
                new GradientAlphaKey(0f, 1f)
            }
        );
        colorOverLifetime.color = new ParticleSystem.MinMaxGradient(grad);
    }
}
