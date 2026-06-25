// Shared mouse tracking coordinate
let mouse = { x: null, y: null, radius: 140 };

// Track mouse position on screen
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

// Background Slideshow Animation Logic
const initSlideshow = () => {
  const slides = document.querySelectorAll('.slide');
  if (slides.length === 0) return;

  let currentSlide = 0;
  const slideInterval = 5500; // Switch image every 5.5 seconds

  const nextSlide = () => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  };

  setInterval(nextSlide, slideInterval);
};

// Custom Glowing Cursor Follower Logic
const initCustomCursor = () => {
  const dot = document.querySelector('.cursor-dot');
  const outline = document.querySelector('.cursor-outline');
  if (!dot || !outline) return;

  let mouseX = 0, mouseY = 0;
  let outlineX = 0, outlineY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    dot.style.opacity = '1';
    outline.style.opacity = '1';
    
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';
  });

  window.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    outline.style.opacity = '0';
  });

  const animateOutline = () => {
    outlineX += (mouseX - outlineX) * 0.12;
    outlineY += (mouseY - outlineY) * 0.12;
    
    outline.style.left = outlineX + 'px';
    outline.style.top = outlineY + 'px';
    
    requestAnimationFrame(animateOutline);
  };
  
  animateOutline();

  // Highlight outline on hovering interactive items
  const hoverables = document.querySelectorAll('a, button, input, .footer-item');
  hoverables.forEach(item => {
    item.addEventListener('mouseenter', () => {
      outline.style.transform = 'translate(-50%, -50%) scale(1.3)';
      outline.style.borderColor = 'var(--primary)';
      outline.style.backgroundColor = 'rgba(255, 107, 0, 0.03)';
      dot.style.transform = 'translate(-50%, -50%) scale(0.6)';
    });
    
    item.addEventListener('mouseleave', () => {
      outline.style.transform = 'translate(-50%, -50%) scale(1)';
      outline.style.borderColor = 'rgba(255, 255, 255, 0.4)';
      outline.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
      dot.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  });
};

// Initialize everything on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initSlideshow();
  initCustomCursor();

  // Cinematic preloader timer dismiss
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 2200); // 2.2 seconds loader duration
});

// Form Submit Handler
const notifyForm = document.getElementById('notifyForm');
const emailInput = document.getElementById('emailInput');
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('statusMsg');
const formWrapper = document.getElementById('formWrapper');
const successWrapper = document.getElementById('successWrapper');
const successEmail = document.getElementById('successEmail');
const successTitle = document.getElementById('successTitle');
const successSubtitle = document.getElementById('successSubtitle');
const dismissSuccessBtn = document.getElementById('dismissSuccessBtn');

if (notifyForm && formWrapper && successWrapper) {
  notifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    if (!email) return;

    submitBtn.disabled = true;
    statusMsg.className = 'status-msg';
    statusMsg.innerText = 'Registering email... ⏳';

    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Transition to success screen
        formWrapper.style.opacity = '0';
        formWrapper.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
          formWrapper.style.display = 'none';
          
          if (data.alreadyRegistered) {
            if (successTitle) successTitle.innerHTML = 'Already Registered! ✨';
            if (successSubtitle) {
              successSubtitle.innerHTML = `You're already on our early access list. We've already sent your welcome discount voucher <strong class="discount-badge">PASSWALA50</strong> to <span id="successEmail" class="highlight-email">${email}</span>.`;
            }
          } else {
            if (successTitle) successTitle.innerHTML = 'Welcome to the Club! 🎉';
            if (successSubtitle) {
              successSubtitle.innerHTML = `We've sent your welcome discount voucher <strong class="discount-badge">PASSWALA50</strong> to <span id="successEmail" class="highlight-email">${email}</span>. Check your inbox!`;
            }
          }

          successWrapper.style.display = 'flex';
          emailInput.value = '';
          statusMsg.innerText = '';
        }, 300);
      } else {
        statusMsg.className = 'status-msg error';
        statusMsg.innerText = data.error || 'Failed to register. Please try again.';
      }
    } catch (err) {
      console.error('Notify error:', err);
      statusMsg.className = 'status-msg error';
      statusMsg.innerText = 'Network error. Please check your connection and try again.';
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Dismiss success card and return to form
if (dismissSuccessBtn && formWrapper && successWrapper) {
  dismissSuccessBtn.addEventListener('click', () => {
    successWrapper.style.opacity = '0';
    successWrapper.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      successWrapper.style.display = 'none';
      successWrapper.style.opacity = '';
      successWrapper.style.transform = '';
      
      formWrapper.style.display = 'block';
      formWrapper.style.opacity = '1';
      formWrapper.style.transform = 'scale(1)';
    }, 300);
  });
}

// Privacy Policy Modal Open/Close Event Handlers
const privacyLink = document.getElementById('privacyLink');
const privacyModal = document.getElementById('privacyModal');
const closeModalBtn = document.getElementById('closeModalBtn');

if (privacyLink && privacyModal && closeModalBtn) {
  // Open Modal
  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    privacyModal.classList.add('active');
  });

  // Close Modal via Button
  closeModalBtn.addEventListener('click', () => {
    privacyModal.classList.remove('active');
  });

  // Close Modal by clicking outer overlay
  privacyModal.addEventListener('click', (e) => {
    if (e.target === privacyModal) {
      privacyModal.classList.remove('active');
    }
  });
}
