class ImageComparator {
  constructor() {
    this.imageA = null;
    this.imageB = null;
    this.canvasA = document.getElementById("canvasA");
    this.canvasB = document.getElementById("canvasB");
    this.canvasSlider = document.getElementById("canvasSlider");
    this.canvasDiff = document.getElementById("canvasDiff");
    this.ctxA = this.canvasA.getContext("2d");
    this.ctxB = this.canvasB.getContext("2d");
    this.ctxSlider = this.canvasSlider.getContext("2d");
    this.ctxDiff = this.canvasDiff.getContext("2d");

    this.currentMode = "sideBySide";
    this.sliderPosition = 50;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // File input handlers
    document
      .getElementById("imageA")
      .addEventListener("change", (e) => this.handleFileSelect(e, "A"));
    document
      .getElementById("imageB")
      .addEventListener("change", (e) => this.handleFileSelect(e, "B"));

    // Drag and drop handlers
    this.setupDragAndDrop("uploadA", "imageA");
    this.setupDragAndDrop("uploadB", "imageB");

    // Button handlers
    document
      .getElementById("compareBtn")
      .addEventListener("click", () => this.compareImages());
    document
      .getElementById("resetBtn")
      .addEventListener("click", () => this.resetComparison());

    // Upload button handlers
    document.querySelectorAll(".upload-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const uploadArea = e.target.closest(".upload-area");
        const target = uploadArea.dataset.target;
        document.getElementById(target).click();
      });
    });

    // Remove button handlers
    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.target.dataset.target;
        this.removeImage(target);
      });
    });

    // Comparison mode handlers
    document
      .querySelectorAll('input[name="comparisonMode"]')
      .forEach((radio) => {
        radio.addEventListener("change", (e) => {
          this.currentMode = e.target.value;
          this.updateComparisonView();
        });
      });

    // Slider handler
    document.getElementById("slider").addEventListener("input", (e) => {
      this.sliderPosition = e.target.value;
      this.updateSliderView();
    });
  }

  setupDragAndDrop(uploadBoxId, inputId) {
    const uploadBox = document.getElementById(uploadBoxId);
    const uploadArea = uploadBox.querySelector(".upload-area");

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      uploadArea.addEventListener(eventName, this.preventDefaults, false);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      uploadArea.addEventListener(
        eventName,
        () => uploadArea.classList.add("dragover"),
        false
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      uploadArea.addEventListener(
        eventName,
        () => uploadArea.classList.remove("dragover"),
        false
      );
    });

    uploadArea.addEventListener("drop", (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const input = document.getElementById(inputId);
        input.files = files;
        this.handleFileSelect(
          { target: input },
          inputId === "imageA" ? "A" : "B"
        );
      }
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleFileSelect(event, imageType) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (imageType === "A") {
          this.imageA = img;
          this.showImagePreview("A", e.target.result);
        } else {
          this.imageB = img;
          this.showImagePreview("B", e.target.result);
        }
        this.checkBothImagesLoaded();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showImagePreview(imageType, src) {
    const preview = document.getElementById(`preview${imageType}`);
    const uploadArea = preview.previousElementSibling;
    const img = document.getElementById(`img${imageType}`);

    img.src = src;
    uploadArea.style.display = "none";
    preview.style.display = "block";
    preview.classList.add("fade-in");
  }

  removeImage(inputId) {
    const imageType = inputId === "imageA" ? "A" : "B";
    const preview = document.getElementById(`preview${imageType}`);
    const uploadArea = preview.previousElementSibling;
    const input = document.getElementById(inputId);

    // Reset image data
    if (imageType === "A") {
      this.imageA = null;
    } else {
      this.imageB = null;
    }

    // Reset UI
    input.value = "";
    preview.style.display = "none";
    uploadArea.style.display = "flex";

    // Hide comparison section if no images
    this.checkBothImagesLoaded();

    // Reset comparison view
    document.getElementById("comparisonSection").style.display = "none";
  }

  checkBothImagesLoaded() {
    const controlsSection = document.getElementById("controlsSection");
    if (this.imageA && this.imageB) {
      controlsSection.style.display = "block";
      controlsSection.classList.add("fade-in");
    } else {
      controlsSection.style.display = "none";
      document.getElementById("comparisonSection").style.display = "none";
    }
  }

  compareImages() {
    if (!this.imageA || !this.imageB) {
      alert("Please upload both images first.");
      return;
    }

    // Show loading state
    const compareBtn = document.getElementById("compareBtn");
    const originalText = compareBtn.textContent;
    compareBtn.innerHTML = '<span class="loading"></span>Comparing...';
    compareBtn.disabled = true;

    // Delay to show loading animation
    setTimeout(() => {
      this.setupCanvases();
      this.updateComparisonView();

      // Show comparison section
      const comparisonSection = document.getElementById("comparisonSection");
      comparisonSection.style.display = "block";
      comparisonSection.classList.add("fade-in");

      // Reset button state
      compareBtn.textContent = originalText;
      compareBtn.disabled = false;

      // Scroll to comparison section
      comparisonSection.scrollIntoView({ behavior: "smooth" });
    }, 500);
  }

  setupCanvases() {
    // Calculate dimensions to maintain aspect ratio
    const maxWidth = 600;
    const maxHeight = 400;

    const imgAWidth = this.imageA.width;
    const imgAHeight = this.imageA.height;
    const imgBWidth = this.imageB.width;
    const imgBHeight = this.imageB.height;

    // Use the larger dimensions to ensure both images fit
    const aspectRatioA = imgAWidth / imgAHeight;
    const aspectRatioB = imgBWidth / imgBHeight;

    let canvasWidth, canvasHeight;

    if (aspectRatioA > aspectRatioB) {
      canvasWidth = Math.min(maxWidth, Math.max(imgAWidth, imgBWidth));
      canvasHeight = canvasWidth / aspectRatioA;
    } else {
      canvasHeight = Math.min(maxHeight, Math.max(imgAHeight, imgBHeight));
      canvasWidth = canvasHeight * aspectRatioB;
    }

    // Set canvas dimensions
    [this.canvasA, this.canvasB, this.canvasSlider, this.canvasDiff].forEach(
      (canvas) => {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }
    );

    // Draw images on canvases
    this.ctxA.drawImage(this.imageA, 0, 0, canvasWidth, canvasHeight);
    this.ctxB.drawImage(this.imageB, 0, 0, canvasWidth, canvasHeight);
  }

  updateComparisonView() {
    // Hide all views
    document.getElementById("sideBySideView").style.display = "none";
    document.getElementById("sliderView").style.display = "none";
    document.getElementById("diffView").style.display = "none";

    // Show selected view
    switch (this.currentMode) {
      case "sideBySide":
        document.getElementById("sideBySideView").style.display = "block";
        break;
      case "slider":
        document.getElementById("sliderView").style.display = "block";
        this.updateSliderView();
        break;
      case "diff":
        document.getElementById("diffView").style.display = "block";
        this.generateDiffImage();
        break;
    }
  }

  updateSliderView() {
    if (!this.imageA || !this.imageB) return;

    const canvas = this.canvasSlider;
    const ctx = this.ctxSlider;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate split position
    const splitPos = (this.sliderPosition / 100) * width;

    // Draw left part (Image A)
    ctx.drawImage(this.imageA, 0, 0, width, height);

    // Draw right part (Image B)
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitPos, 0, width - splitPos, height);
    ctx.clip();
    ctx.drawImage(this.imageB, 0, 0, width, height);
    ctx.restore();

    // Update slider divider position
    const sliderDivider = document.getElementById("sliderDivider");
    sliderDivider.style.left = this.sliderPosition + "%";
  }

  generateDiffImage() {
    if (!this.imageA || !this.imageB) return;

    const canvas = this.canvasDiff;
    const ctx = this.ctxDiff;
    const width = canvas.width;
    const height = canvas.height;

    // Get image data
    const tempCanvasA = document.createElement("canvas");
    const tempCanvasB = document.createElement("canvas");
    tempCanvasA.width = tempCanvasB.width = width;
    tempCanvasA.height = tempCanvasB.height = height;

    const tempCtxA = tempCanvasA.getContext("2d");
    const tempCtxB = tempCanvasB.getContext("2d");

    tempCtxA.drawImage(this.imageA, 0, 0, width, height);
    tempCtxB.drawImage(this.imageB, 0, 0, width, height);

    const imageDataA = tempCtxA.getImageData(0, 0, width, height);
    const imageDataB = tempCtxB.getImageData(0, 0, width, height);
    const diffImageData = ctx.createImageData(width, height);

    let differentPixels = 0;
    const threshold = 30; // Sensitivity threshold

    for (let i = 0; i < imageDataA.data.length; i += 4) {
      const rA = imageDataA.data[i];
      const gA = imageDataA.data[i + 1];
      const bA = imageDataA.data[i + 2];

      const rB = imageDataB.data[i];
      const gB = imageDataB.data[i + 1];
      const bB = imageDataB.data[i + 2];

      // Calculate difference
      const diff = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB);

      if (diff > threshold) {
        // Highlight difference in red
        diffImageData.data[i] = 255; // R
        diffImageData.data[i + 1] = 0; // G
        diffImageData.data[i + 2] = 0; // B
        diffImageData.data[i + 3] = 255; // A
        differentPixels++;
      } else {
        // Show original image (desaturated)
        const gray = (rA + gA + bA) / 3;
        diffImageData.data[i] = gray;
        diffImageData.data[i + 1] = gray;
        diffImageData.data[i + 2] = gray;
        diffImageData.data[i + 3] = 255;
      }
    }

    // Draw diff image
    ctx.putImageData(diffImageData, 0, 0);

    // Update statistics
    const totalPixels = width * height;
    const diffPercentage = ((differentPixels / totalPixels) * 100).toFixed(2);

    document.getElementById("diffStats").innerHTML = `
            <strong>Difference Analysis:</strong><br>
            Different pixels: ${differentPixels.toLocaleString()}<br>
            Total pixels: ${totalPixels.toLocaleString()}<br>
            Difference: ${diffPercentage}%
        `;
  }

  resetComparison() {
    // Reset images
    this.imageA = null;
    this.imageB = null;

    // Reset file inputs
    document.getElementById("imageA").value = "";
    document.getElementById("imageB").value = "";

    // Reset UI
    document.getElementById("previewA").style.display = "none";
    document.getElementById("previewB").style.display = "none";
    document.querySelector('[data-target="imageA"]').style.display = "flex";
    document.querySelector('[data-target="imageB"]').style.display = "flex";

    // Hide sections
    document.getElementById("controlsSection").style.display = "none";
    document.getElementById("comparisonSection").style.display = "none";

    // Reset comparison mode
    document.querySelector('input[value="sideBySide"]').checked = true;
    this.currentMode = "sideBySide";

    // Reset slider
    document.getElementById("slider").value = 50;
    this.sliderPosition = 50;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ImageComparator();

  // Add some nice entrance animations
  document.querySelector(".container").classList.add("fade-in");
});

// Add keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "r":
        e.preventDefault();
        document.getElementById("resetBtn").click();
        break;
      case "Enter":
        e.preventDefault();
        document.getElementById("compareBtn").click();
        break;
    }
  }
});

// Add window resize handler for responsive canvas
window.addEventListener("resize", () => {
  const comparator = window.imageComparator;
  if (comparator && comparator.imageA && comparator.imageB) {
    setTimeout(() => {
      comparator.setupCanvases();
      comparator.updateComparisonView();
    }, 100);
  }
});

// Export for global access
window.ImageComparator = ImageComparator;
