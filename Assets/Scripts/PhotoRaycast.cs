using UnityEngine;

public class PhotoRaycast : MonoBehaviour
{
    void Update()
    {
        if (Input.GetMouseButtonDown(0))
        {
            HandlePhotoClick();
        }
    }

    void HandlePhotoClick()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
        RaycastHit hit;

        if (Physics.Raycast(ray, out hit, 1000f))
        {
            FloatingPhoto photo = hit.collider.GetComponent<FloatingPhoto>();
            if (photo != null)
            {
                photo.OnPhotoClicked();
            }
        }
    }
}
