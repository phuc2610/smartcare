import './style.css'

// Configuration
const REPO_OWNER = 'phuc2610';
const REPO_NAME = 'smartcare';

document.addEventListener('DOMContentLoaded', () => {
  setupLocalDownload();
  initSmoothScrolling();
});

/**
 * Setup local download link for the APK
 */
function setupLocalDownload() {
  const downloadBtn = document.getElementById('download-btn');
  const versionText = document.getElementById('version-text');
  const qrCodeImg = document.getElementById('qr-code-img');

  // URL of the local APK file (resolves automatically to the correct absolute URL)
  const a = document.createElement('a');
  a.href = 'smartcare-app.apk';
  const apkUrl = a.href;

  if (downloadBtn) {
    downloadBtn.href = 'smartcare-app.apk';
    downloadBtn.setAttribute('download', 'SmartCare.apk');
  }

  if (versionText) {
    versionText.textContent = 'Phiên bản mới nhất • Sẵn sàng tải về';
  }

  const qrCodeImgMain = document.getElementById('qr-code-img-main');

  if (qrCodeImg) {
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(apkUrl)}`;
  }
  
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
