using UnityEngine;

public class PhotoSpawner : MonoBehaviour
{
    public GameObject photoPrefab;
    public int photoCount = 15;
    public float spawnRadius = 50f;
    public float minDistance = 5f;
    
    private Camera mainCamera;

    void Start()
    {
        mainCamera = Camera.main;
        SpawnPhotos();
    }

    void SpawnPhotos()
    {
        for (int i = 0; i < photoCount; i++)
        {
            Vector3 randomPosition = Random.onUnitSphere * spawnRadius;
            
            // Ensure minimum distance from camera
            if (Vector3.Distance(randomPosition, mainCamera.transform.position) < minDistance)
            {
                randomPosition = mainCamera.transform.position + Random.onUnitSphere * minDistance;
            }
            
            Instantiate(photoPrefab, randomPosition, Random.rotation);
        }
    }

    public void SpawnPhoto()
    {
        Vector3 randomPosition = Random.onUnitSphere * spawnRadius;
        Instantiate(photoPrefab, randomPosition, Random.rotation);
    }

    public void SetPhotoCount(int count)
    {
        photoCount = count;
    }
}
