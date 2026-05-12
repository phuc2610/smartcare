import './style.css'

// Configuration
const REPO_OWNER = 'phuc2610';
const REPO_NAME = 'smartcare';

document.addEventListener('DOMContentLoaded', () => {
  fetchLatestRelease();
  initSmoothScrolling();
});

/**
 * Fetch the latest release from GitHub and update the download button.
 */
async function fetchLatestRelease() {
  const downloadBtn = document.getElementById('download-btn');
  const versionText = document.getElementById('version-text');

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    
    // Find the APK asset
    const apkAsset = data.assets.find(asset => asset.name.endsWith('.apk'));
    const qrCodeImg = document.getElementById('qr-code-img');
    
    if (apkAsset) {
      // Update the button link to the APK download URL
      downloadBtn.href = apkAsset.browser_download_url;
      // Update QR Code to point to APK
      if (qrCodeImg) {
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(apkAsset.browser_download_url)}`;
      }
      // Update the text to show the version and file size
      const sizeMB = (apkAsset.size / (1024 * 1024)).toFixed(1);
      versionText.textContent = `Phiên bản ${data.tag_name} • ${sizeMB} MB`;
    } else {
      // Fallback to the release page if no APK is found
      downloadBtn.href = data.html_url;
      versionText.textContent = `Phiên bản ${data.tag_name} (Xem trên GitHub)`;
    }
  } catch (error) {
    console.error('Error fetching latest release:', error);
    // Fallback URL if API fails
    downloadBtn.href = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
    versionText.textContent = 'Phiên bản mới nhất (Trên GitHub)';
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
