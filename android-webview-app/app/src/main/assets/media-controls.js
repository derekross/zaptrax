(function() {
  // Check if AndroidMediaBridge is available
  if (typeof AndroidMediaBridge === 'undefined') {
    console.error('Zaptrax: AndroidMediaBridge not available!');
    return;
  }

  // Find the audio element
  let audio = null;
  let attempts = 0;
  const maxAttempts = 50;

  function findAudio() {
    attempts++;
    const audioElements = document.getElementsByTagName('audio');

    if (audioElements.length > 0) {
      audio = audioElements[0];
      setupMediaControls();
    } else if (attempts < maxAttempts) {
      setTimeout(findAudio, 100);
    }
  }

  function setupMediaControls() {
    // Track previous state for polling
    let wasPlaying = false;
    let lastDuration = 0;

    // Create interface for Android to control playback
    window.zaptraxMediaControls = {
      play: function() {
        if (audio) audio.play();
      },
      pause: function() {
        if (audio) audio.pause();
      },
      next: function() {
        window.dispatchEvent(new CustomEvent('android-media-next'));
      },
      previous: function() {
        window.dispatchEvent(new CustomEvent('android-media-previous'));
      },
      seekTo: function(positionMs) {
        if (audio) audio.currentTime = positionMs / 1000;
      }
    };

    // Listen to audio events and send to Android
    audio.addEventListener('play', function() {
      wasPlaying = true;
      try {
        AndroidMediaBridge.onPlaybackStateChanged(true);
      } catch (e) {
        console.error('Zaptrax: Error notifying play state:', e);
      }
    });

    audio.addEventListener('pause', function() {
      wasPlaying = false;
      try {
        AndroidMediaBridge.onPlaybackStateChanged(false);
      } catch (e) {
        console.error('Zaptrax: Error notifying pause state:', e);
      }
    });

    audio.addEventListener('ended', function() {
      wasPlaying = false;
      try {
        AndroidMediaBridge.onPlaybackEnded();
      } catch (e) {
        console.error('Zaptrax: Error notifying ended:', e);
      }
    });

    audio.addEventListener('timeupdate', function() {
      try {
        AndroidMediaBridge.onPositionChanged(Math.floor(audio.currentTime * 1000));
      } catch (e) {
        console.error('Zaptrax: Error sending position:', e);
      }
    });

    audio.addEventListener('loadedmetadata', function() {
      setTimeout(getTrackInfo, 100);
    });

    // Poll audio state as fallback (some React apps don't fire events reliably)
    setInterval(function() {
      try {
        const isPlaying = !audio.paused && !audio.ended && audio.readyState > 2;

        if (isPlaying !== wasPlaying) {
          wasPlaying = isPlaying;
          AndroidMediaBridge.onPlaybackStateChanged(isPlaying);
        }

        const currentDuration = audio.duration || 0;
        if (currentDuration !== lastDuration && currentDuration > 0) {
          lastDuration = currentDuration;
          getTrackInfo();
        }

        if (isPlaying) {
          AndroidMediaBridge.onPositionChanged(Math.floor(audio.currentTime * 1000));
        }
      } catch (e) {
        console.error('Zaptrax: Polling error:', e);
      }
    }, 1000);

    // Observe DOM for track changes
    const observer = new MutationObserver(function() {
      getTrackInfo();
    });

    const playerElement = document.querySelector('[class*="MusicPlayer"]') || document.body;
    observer.observe(playerElement, { childList: true, subtree: true });

    // Try to get initial track info
    setTimeout(getTrackInfo, 500);
  }

  function getTrackInfo() {
    try {
      const audio = document.getElementsByTagName('audio')[0];
      if (!audio) return;

      let title = 'Unknown Track';
      let artist = 'Unknown Artist';
      let album = '';
      let artwork = '';

      // Try MediaSession API first
      if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
        const metadata = navigator.mediaSession.metadata;
        title = metadata.title || title;
        artist = metadata.artist || artist;
        album = metadata.album || album;
        if (metadata.artwork && metadata.artwork.length > 0) {
          artwork = metadata.artwork[0].src;
        }
      } else {
        // Find the pause/play button and get track info near it
        const buttons = document.querySelectorAll('button, [role="button"]');
        let playButton = null;
        for (const btn of buttons) {
          const btnText = btn.textContent.toLowerCase();
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          if (btnText.includes('pause') || ariaLabel.includes('pause') ||
              btn.innerHTML.includes('pause') || btn.innerHTML.includes('Pause')) {
            playButton = btn;
            break;
          }
        }

        if (playButton) {
          let parent = playButton.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const textEls = parent.querySelectorAll('span, div, p, h1, h2, h3, h4, h5, h6');
            const nearbyText = [];
            const seenText = new Set();

            for (const el of textEls) {
              const text = el.textContent.trim();
              if (text.length > 0 && text.length < 100 && !seenText.has(text) &&
                  !text.toLowerCase().includes('play') && !text.toLowerCase().includes('pause') &&
                  !text.toLowerCase().includes('next') && !text.toLowerCase().includes('previous') &&
                  !text.match(/^\d+:\d+$/) && !text.match(/^\d+:\d+\d+:\d+$/)) {
                nearbyText.push(text);
                seenText.add(text);
              }
            }

            if (i === 1 && nearbyText.length >= 1) {
              let concatenated = null;
              for (const text of nearbyText) {
                const containsCount = nearbyText.filter(function(other) {
                  return other !== text && text.includes(other);
                }).length;
                if (containsCount >= 1) {
                  concatenated = text;
                  break;
                }
              }

              const filtered = nearbyText.filter(function(text) {
                return !nearbyText.some(function(other) {
                  return other !== text && text.includes(other) && text.length > other.length + 5;
                });
              });

              if (concatenated && filtered.length >= 1) {
                const sorted = filtered.sort(function(a, b) { return a.length - b.length; });
                title = sorted[0];

                let remainingText = concatenated;
                for (const part of filtered) {
                  remainingText = remainingText.replace(part, '');
                }
                if (remainingText.length > 0 && remainingText.length < 50) {
                  artist = remainingText;
                }

                if (sorted.length >= 2) album = sorted[1];
                break;
              } else if (filtered.length >= 2) {
                const sorted = filtered.slice(0, 4).sort(function(a, b) { return a.length - b.length; });
                title = sorted[0];
                artist = sorted[1];
                if (sorted.length >= 3) album = sorted[2];
                break;
              }
            }

            parent = parent.parentElement;
          }
        }

        // Find artwork near the play controls
        if (playButton) {
          let parent = playButton.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const images = parent.querySelectorAll('img');
            for (const img of images) {
              if (img.src && !img.src.includes('icon') && img.width > 40 && img.height > 40) {
                artwork = img.src;
                break;
              }
            }
            if (artwork) break;
            parent = parent.parentElement;
          }
        }
      }

      const duration = audio.duration ? Math.floor(audio.duration * 1000) : 0;

      if (title !== 'Unknown Track') {
        AndroidMediaBridge.onTrackChanged(title, artist, album, artwork, duration);
      }
    } catch (e) {
      console.error('Zaptrax: Error getting track info:', e);
    }
  }

  // Start finding the audio element
  findAudio();
})();
