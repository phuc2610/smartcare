import './style.css'

// Configuration
const REPO_OWNER = 'phuc2610';
const REPO_NAME = 'smartcare';

document.addEventListener('DOMContentLoaded', () => {
  setupLocalDownload();
  initSmoothScrolling();
  initCounterAnimation();
});

/**
 * Setup download link for the APK from GitHub Releases
 */
function setupLocalDownload() {
  const apkUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v1.0.0/app-release.apk`;

  const downloadBtn = document.getElementById('download-btn');
  const versionText = document.getElementById('version-text');

  if (downloadBtn) {
    downloadBtn.href = apkUrl;
  }

  if (versionText) {
    versionText.textContent = 'Phiên bản v1.0.0 • Sẵn sàng tải về';
  }

  const qrCodeImgMain = document.getElementById('qr-code-img-main');
  if (qrCodeImgMain) {
    qrCodeImgMain.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(apkUrl)}`;
  }
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
}


/**
 * Initialize counter animation for statistics section
 */
function initCounterAnimation() {
  const counters = document.querySelectorAll(".counter");
  let hasAnimated = false;

  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasAnimated) {
        hasAnimated = true;
        counters.forEach(counter => {
          const target = +counter.getAttribute("data-target");
          const duration = 2000; // 2 seconds
          const increment = target / (duration / 16); // 60fps
          
          let current = 0;
          const updateCounter = () => {
            current += increment;
            if (current < target) {
              counter.innerText = Math.ceil(current);
              requestAnimationFrame(updateCounter);
            } else {
              counter.innerText = target;
            }
          };
          updateCounter();
        });
      }
    });
  }, observerOptions);

  const statsSection = document.getElementById("stats");
  if (statsSection) {
    observer.observe(statsSection);
  }
}

