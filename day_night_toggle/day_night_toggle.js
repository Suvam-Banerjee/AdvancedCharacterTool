function initializeDayNightToggle() {
  const themeSwitch = document.getElementById('themeSwitch');
  const sunIcon = document.querySelector('.icon.sun');
  const moonIcon = document.querySelector('.icon.moon');
  const orbitWrapper = document.querySelector('.orbit-wrapper');

  // Start rotation angle at 0 so moon starts at top position
  let rotationAngle = 0;

  const styles = getComputedStyle(document.querySelector('.theme-toggle'));
  const desiredTranslateX = styles.getPropertyValue('--translate-x').trim() || '15px';
  const desiredTranslateY = styles.getPropertyValue('--translate-y').trim() || '22px';

  function updateIcons() {
    if (themeSwitch.checked) {
      sunIcon.style.opacity = '0';
      sunIcon.style.pointerEvents = 'none';
      sunIcon.style.filter = 'drop-shadow(0 0 2px rgba(255,210,100,0)) drop-shadow(0 0 6px rgba(255,180,80,0))';

      moonIcon.style.opacity = '1';
      moonIcon.style.pointerEvents = 'auto';
      moonIcon.style.filter = 'drop-shadow(0 0 18px rgba(180,210,255,0.9)) drop-shadow(0 0 36px rgba(120,160,255,0.7))';
    } else {
      sunIcon.style.opacity = '1';
      sunIcon.style.pointerEvents = 'auto';
      sunIcon.style.filter = 'drop-shadow(0 0 10px rgba(255,210,100,0.6)) drop-shadow(0 0 20px rgba(255,180,80,0.4))';

      moonIcon.style.opacity = '0';
      moonIcon.style.pointerEvents = 'none';
      moonIcon.style.filter = 'drop-shadow(0 0 12px rgba(180,210,255,0.7)) drop-shadow(0 0 24px rgba(120,160,255,0.5))';
    }
  }

  function setRotation(angle) {
    orbitWrapper.style.transform = `translate(${desiredTranslateX}, ${desiredTranslateY}) rotate(${angle}deg)`;
  }

  // On each toggle, rotate anticlockwise by -180 degrees cumulatively
  themeSwitch.addEventListener('change', () => {
    rotationAngle -= 180;
    setRotation(rotationAngle);
    updateIcons();
  });

  // Initialize starting rotation and icons (moon at top)
  setRotation(rotationAngle);
  updateIcons();
}