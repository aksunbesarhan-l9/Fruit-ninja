    // 🔈 Музыканы қолданушы басқанда ғана ойнату
    window.addEventListener('click', () => {
      const music = document.getElementById('bgMusic');
      music.volume = 0.5;
      music.play().catch(err => console.log('Музыка ойнатылмады:', err));
    });