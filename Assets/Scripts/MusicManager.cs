using UnityEngine;

public class MusicManager : MonoBehaviour
{
    private AudioSource audioSource;
    public float volume = 0.5f;

    void Start()
    {
        audioSource = GetComponent<AudioSource>();
        
        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
        }
        
        audioSource.volume = volume;
        audioSource.loop = true;
        
        // Audio file should be placed in Assets/Audio/music.mp3 or music.wav
        AudioClip musicClip = Resources.Load<AudioClip>("Audio/music");
        if (musicClip != null)
        {
            audioSource.clip = musicClip;
            audioSource.Play();
        }
    }

    void Update()
    {
        // Adjust volume with +/- keys
        if (Input.GetKeyDown(KeyCode.Plus))
        {
            audioSource.volume = Mathf.Min(audioSource.volume + 0.1f, 1f);
        }
        if (Input.GetKeyDown(KeyCode.Minus))
        {
            audioSource.volume = Mathf.Max(audioSource.volume - 0.1f, 0f);
        }
    }

    public void SetVolume(float newVolume)
    {
        audioSource.volume = Mathf.Clamp01(newVolume);
    }
}
