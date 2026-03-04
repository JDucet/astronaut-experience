using UnityEngine;
using UnityEngine.UI;

public class FloatingPhoto : MonoBehaviour
{
    public float floatSpeed = 0.5f;
    public float rotationSpeed = 10f;
    public float bounceAmount = 0.5f;
    
    private Vector3 startPos;
    private bool isSelected = false;
    private float zoomProgress = 0f;
    private Vector3 targetPosition;
    private Camera mainCamera;
    private Outline outlineComponent;

    void Start()
    {
        startPos = transform.position;
        mainCamera = Camera.main;
        outlineComponent = GetComponent<Outline>();
        
        if (outlineComponent != null)
        {
            outlineComponent.enabled = false;
        }
        
        // Random gentle floating direction
        StartCoroutine(FloatAround());
    }

    void Update()
    {
        // Slow rotation
        transform.Rotate(Vector3.up * rotationSpeed * Time.deltaTime);
        
        // Handle zoom towards camera if selected
        if (isSelected)
        {
            zoomProgress = Mathf.Min(zoomProgress + Time.deltaTime * 2f, 1f);
            
            // Move towards camera
            Vector3 targetPos = mainCamera.transform.position + mainCamera.transform.forward * 2f;
            transform.position = Vector3.Lerp(transform.position, targetPos, Time.deltaTime * 3f);
            
            // Face the camera
            transform.LookAt(mainCamera.transform.position);
        }
        else
        {
            zoomProgress = Mathf.Max(zoomProgress - Time.deltaTime * 2f, 0f);
            transform.position = Vector3.Lerp(transform.position, startPos, Time.deltaTime * 1.5f);
        }
    }

    System.Collections.IEnumerator FloatAround()
    {
        while (true)
        {
            float x = Mathf.Sin(Time.time * floatSpeed) * bounceAmount;
            float y = Mathf.Cos(Time.time * floatSpeed * 0.7f) * bounceAmount;
            float z = Mathf.Sin(Time.time * floatSpeed * 0.5f) * bounceAmount;
            
            if (!isSelected)
            {
                transform.position = startPos + new Vector3(x, y, z);
            }
            
            yield return null;
        }
    }

    public void OnPhotoClicked()
    {
        isSelected = !isSelected;
        
        if (outlineComponent != null)
        {
            outlineComponent.enabled = isSelected;
        }
    }

    public bool IsSelected()
    {
        return isSelected;
    }
}
