using UnityEngine;

public class AstronautController : MonoBehaviour
{
    public float moveSpeed = 5f;
    public float lookSensitivity = 2f;
    public float sprintSpeed = 10f;
    
    private Camera playerCamera;
    private float verticalRotation = 0f;
    private Rigidbody rb;
    private Vector3 currentVelocity = Vector3.zero;

    void Start()
    {
        playerCamera = GetComponentInChildren<Camera>();
        rb = GetComponent<Rigidbody>();
        
        // Lock cursor to game window
        Cursor.lockState = CursorLockMode.Locked;
    }

    void Update()
    {
        HandleMouseLook();
        HandleMovement();
        
        // Unlock cursor with ESC key
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            Cursor.lockState = CursorLockMode.Locked ? CursorLockMode.Confined : CursorLockMode.Locked;
        }
    }

    void HandleMouseLook()
    {
        float mouseX = Input.GetAxis("Mouse X") * lookSensitivity;
        float mouseY = Input.GetAxis("Mouse Y") * lookSensitivity;

        // Rotate body left/right
        transform.Rotate(Vector3.up * mouseX);

        // Rotate camera up/down
        verticalRotation -= mouseY;
        verticalRotation = Mathf.Clamp(verticalRotation, -90f, 90f);
        playerCamera.transform.localRotation = Quaternion.Euler(verticalRotation, 0f, 0f);
    }

    void HandleMovement()
    {
        float moveX = Input.GetAxis("Horizontal");
        float moveZ = Input.GetAxis("Vertical");
        
        float speed = Input.GetKey(KeyCode.LeftShift) ? sprintSpeed : moveSpeed;
        
        Vector3 moveDirection = (transform.forward * moveZ + transform.right * moveX).normalized;
        Vector3 targetVelocity = moveDirection * speed;
        
        // Smooth acceleration in space
        currentVelocity = Vector3.Lerp(currentVelocity, targetVelocity, Time.deltaTime * 5f);
        
        rb.velocity = currentVelocity;
    }
}
