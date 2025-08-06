/**
 * Enhanced Design Comparison Tool
 * Supports images, CSS, HTML, and website comparison with advanced semantic analysis
 */

class EnhancedDesignComparator {
  constructor() {
    // Core properties
    this.currentMode = "image";
    this.comparisonMode = "diff";
    this.dataA = null;
    this.dataB = null;

    // Canvas elements - will be initialized when needed
    this.canvasA = null;
    this.canvasB = null;
    this.canvasSlider = null;
    this.canvasDiff = null;

    // Analysis results
    this.enhancedResults = null;
    this.ocrWorker = null;

    // Initialize the application
    this.initializeOCR();
    this.initializeEventListeners();
    this.setupUploadModes();
  }

  async initializeOCR() {
    try {
      if (typeof Tesseract !== "undefined") {
        this.ocrWorker = await Tesseract.createWorker("eng");
        await this.ocrWorker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          preserve_interword_spaces: "1",
        });
        console.log("OCR initialized successfully");
      }
    } catch (error) {
      console.warn("OCR initialization failed:", error);
    }
  }

  initializeCanvases() {
    // Initialize canvas elements when needed
    this.canvasA = document.getElementById("canvasA");
    this.canvasB = document.getElementById("canvasB");
    this.canvasSlider = document.getElementById("canvasSlider");
    this.canvasDiff = document.getElementById("canvasDiff");
  }

  initializeEventListeners() {
    // Upload mode switching
    document.querySelectorAll('input[name="uploadMode"]').forEach((radio) => {
      radio.addEventListener("change", (e) =>
        this.switchUploadMode(e.target.value)
      );
    });

    // File uploads
    document
      .getElementById("imageA")
      .addEventListener("change", (e) => this.handleImageUpload(e, "A"));
    document
      .getElementById("imageB")
      .addEventListener("change", (e) => this.handleImageUpload(e, "B"));

    // Code uploads
    document
      .getElementById("cssCodeA")
      .addEventListener("input", () => this.handleCodeInput("css", "A"));
    document
      .getElementById("cssCodeB")
      .addEventListener("input", () => this.handleCodeInput("css", "B"));
    document
      .getElementById("htmlCodeA")
      .addEventListener("input", () => this.handleCodeInput("html", "A"));
    document
      .getElementById("htmlCodeB")
      .addEventListener("input", () => this.handleCodeInput("html", "B"));

    // URL analysis
    document.querySelectorAll(".analyze-url-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.analyzeURL(e.target.dataset.target)
      );
    });

    // Control buttons
    document
      .getElementById("compareBtn")
      .addEventListener("click", () => this.performComparison());
    document
      .getElementById("resetBtn")
      .addEventListener("click", () => this.resetComparison());

    // Comparison modes
    document
      .querySelectorAll('input[name="comparisonMode"]')
      .forEach((radio) => {
        radio.addEventListener("change", (e) => {
          this.comparisonMode = e.target.value;
          this.updateComparisonView();
        });
      });

    // Slider control
    const slider = document.getElementById("slider");
    if (slider) {
      slider.addEventListener("input", (e) => {
        this.updateSliderView(e.target.value);
      });
    }

    // Upload buttons
    document.querySelectorAll(".upload-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const uploadArea = e.target.closest(".upload-area");
        const target = uploadArea.dataset.target;
        document.getElementById(target).click();
      });
    });

    // Remove buttons
    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.target.dataset.target;
        this.removeData(target);
      });
    });
  }

  setupUploadModes() {
    // Setup drag and drop for image uploads
    this.setupDragAndDrop("uploadA", "imageA");
    this.setupDragAndDrop("uploadB", "imageB");
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
        this.handleImageUpload(
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

  switchUploadMode(mode) {
    this.currentMode = mode;

    // Hide all upload sections
    document.getElementById("imageUploadSection").style.display = "none";
    document.getElementById("cssUploadSection").style.display = "none";
    document.getElementById("urlUploadSection").style.display = "none";
    document.getElementById("htmlUploadSection").style.display = "none";

    // Show selected section
    const sectionMap = {
      image: "imageUploadSection",
      css: "cssUploadSection",
      url: "urlUploadSection",
      html: "htmlUploadSection",
    };

    document.getElementById(sectionMap[mode]).style.display = "block";

    // Update mode buttons
    document
      .querySelectorAll(".upload-mode")
      .forEach((mode) => mode.classList.remove("active"));
    document
      .querySelector(`input[value="${mode}"]`)
      .closest(".upload-mode")
      .classList.add("active");

    // Reset data
    this.dataA = null;
    this.dataB = null;
    this.updateControlsVisibility();

    // Update compare button text
    const compareBtn = document.getElementById("compareBtn");
    const buttonText = {
      image: "Start Analysis",
      css: "Compare CSS",
      url: "Compare Websites",
      html: "Compare HTML",
    };
    compareBtn.textContent = buttonText[mode];
  }

  async handleImageUpload(event, side) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      this.showError("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (side === "A") {
          this.dataA = { type: "image", data: img, src: e.target.result };
          this.showImagePreview("A", e.target.result);
        } else {
          this.dataB = { type: "image", data: img, src: e.target.result };
          this.showImagePreview("B", e.target.result);
        }
        this.updateControlsVisibility();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  handleCodeInput(type, side) {
    const elementId = `${type}Code${side}`;
    const code = document.getElementById(elementId).value;

    if (code.trim()) {
      if (side === "A") {
        this.dataA = { type: type, data: code };
      } else {
        this.dataB = { type: type, data: code };
      }
    } else {
      if (side === "A") {
        this.dataA = null;
      } else {
        this.dataB = null;
      }
    }

    this.updateControlsVisibility();
  }

  async analyzeURL(target) {
    const urlInput = document.getElementById(target);
    const url = urlInput.value.trim();

    if (!url) {
      this.showError("Please enter a valid URL.");
      return;
    }

    const btn = document.querySelector(`[data-target="${target}"]`);
    const originalText = btn.textContent;
    btn.textContent = "Analyzing...";
    btn.disabled = true;

    try {
      // In a real implementation, you'd use a proxy service or browser extension
      // For demonstration, we'll simulate the analysis
      const websiteData = await this.fetchWebsiteData(url);

      const side = target === "urlA" ? "A" : "B";
      if (side === "A") {
        this.dataA = { type: "website", data: websiteData, url: url };
      } else {
        this.dataB = { type: "website", data: websiteData, url: url };
      }

      this.updateControlsVisibility();
    } catch (error) {
      this.showError(`Failed to analyze website: ${error.message}`);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  async fetchWebsiteData(url) {
    // Note: This is a simplified implementation
    // In production, you'd need a proxy service to handle CORS
    try {
      const response = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      );
      const data = await response.json();
      const html = data.contents;

      return {
        html: html,
        css: this.extractCSSFromHTML(html),
        title: this.extractTitle(html),
        metadata: this.extractMetadata(html),
      };
    } catch (error) {
      throw new Error("Website analysis requires a proxy service");
    }
  }

  extractCSSFromHTML(html) {
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;

    let css = "";
    let match;

    while ((match = styleRegex.exec(html)) !== null) {
      css += match[1] + "\n";
    }

    return css;
  }

  extractTitle(html) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : "Untitled";
  }

  extractMetadata(html) {
    const metaTags = html.match(/<meta[^>]*>/gi) || [];
    const metadata = {};

    metaTags.forEach((tag) => {
      const nameMatch = tag.match(/name=["']([^"']+)["']/i);
      const contentMatch = tag.match(/content=["']([^"']+)["']/i);

      if (nameMatch && contentMatch) {
        metadata[nameMatch[1]] = contentMatch[1];
      }
    });

    return metadata;
  }

  showImagePreview(side, src) {
    const preview = document.getElementById(`preview${side}`);
    const uploadArea = preview.previousElementSibling;
    const img = document.getElementById(`img${side}`);

    img.src = src;
    uploadArea.style.display = "none";
    preview.style.display = "block";
    preview.classList.add("fade-in");
  }

  removeData(inputId) {
    const side = inputId.includes("A") ? "A" : "B";

    if (side === "A") {
      this.dataA = null;
    } else {
      this.dataB = null;
    }

    // Reset UI based on current mode
    if (this.currentMode === "image") {
      const preview = document.getElementById(`preview${side}`);
      const uploadArea = preview.previousElementSibling;
      const input = document.getElementById(inputId);

      input.value = "";
      preview.style.display = "none";
      uploadArea.style.display = "flex";
    }

    this.updateControlsVisibility();
    document.getElementById("comparisonSection").style.display = "none";
  }

  updateControlsVisibility() {
    const controlsSection = document.getElementById("controlsSection");
    if (this.dataA && this.dataB) {
      controlsSection.style.display = "block";
      controlsSection.classList.add("fade-in");
    } else {
      controlsSection.style.display = "none";
      document.getElementById("comparisonSection").style.display = "none";
    }
  }

  async performComparison() {
    if (!this.dataA || !this.dataB) {
      this.showError("Please provide both inputs before comparing.");
      return;
    }

    const compareBtn = document.getElementById("compareBtn");
    const originalText = compareBtn.textContent;
    compareBtn.innerHTML = '<span class="loading"></span>Analyzing...';
    compareBtn.disabled = true;

    console.log("Starting comparison process...");

    try {
      // Create a timeout promise (reduced to 15 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Analysis timed out after 15 seconds")),
          15000
        )
      );

      let comparisonPromise;

      // Perform analysis based on data type
      switch (this.currentMode) {
        case "image":
          comparisonPromise = this.performImageComparisonFast();
          break;
        case "css":
          comparisonPromise = this.performCSSComparison();
          break;
        case "html":
          comparisonPromise = this.performHTMLComparison();
          break;
        case "url":
          comparisonPromise = this.performWebsiteComparison();
          break;
        default:
          throw new Error("Unknown comparison mode: " + this.currentMode);
      }

      // Race between comparison and timeout
      await Promise.race([comparisonPromise, timeoutPromise]);

      console.log("Comparison completed successfully");

      // Show comparison section
      this.showComparisonResults();
    } catch (error) {
      console.error("Comparison failed:", error);
      this.showError("Comparison failed: " + error.message);
    } finally {
      console.log("Resetting button state...");
      compareBtn.textContent = originalText;
      compareBtn.disabled = false;
    }
  }

  async performImageComparisonFast() {
    try {
      console.log("Starting fast image comparison...");

      // Initialize canvases if not already done
      this.initializeCanvases();

      // Setup canvases for image comparison
      if (!this.setupImageCanvases()) {
        throw new Error("Failed to setup canvases");
      }

      // Skip OCR for fast comparison
      console.log("Skipping OCR for speed...");

      // Perform basic visual analysis only
      await this.performBasicVisualAnalysis();

      // Generate basic results
      this.generateBasicResults();

      console.log("Fast image comparison completed");
      console.log("Final pixel difference:", this.pixelDifference);

      // Ensure the diff view gets updated
      if (this.comparisonMode === "diff") {
        console.log("Updating diff stats after fast comparison...");
        this.updateDiffStats();
      }
    } catch (error) {
      console.error("Fast image comparison failed:", error);
      // Create simple results for basic image comparison
      this.createBasicImageResults();
    }
  }

  async performBasicVisualAnalysis() {
    console.log("Performing basic visual analysis...");

    const canvas1 = document.getElementById("canvasA");
    const canvas2 = document.getElementById("canvasB");
    const diffCanvas = document.getElementById("canvasDiff");

    if (!canvas1 || !canvas2 || !diffCanvas) {
      console.error("Canvas elements not found");
      console.log(
        "Canvas1:",
        canvas1,
        "Canvas2:",
        canvas2,
        "DiffCanvas:",
        diffCanvas
      );
      return;
    }

    const ctx1 = canvas1.getContext("2d");
    const ctx2 = canvas2.getContext("2d");
    const diffCtx = diffCanvas.getContext("2d");

    if (!ctx1 || !ctx2 || !diffCtx) {
      console.error("Cannot get canvas contexts");
      return;
    }

    const width = canvas1.width;
    const height = canvas1.height;

    console.log("Canvas dimensions:", { width, height });

    // Get image data (sample every 2nd pixel for speed)
    const imageData1 = ctx1.getImageData(0, 0, width, height);
    const imageData2 = ctx2.getImageData(0, 0, width, height);

    // Create difference image
    const diffImageData = diffCtx.createImageData(width, height);

    let differentPixels = 0;
    const step = 2; // Sample every 2nd pixel for speed
    const threshold = 30; // Difference threshold

    console.log("Starting pixel comparison...");

    for (let i = 0; i < imageData1.data.length; i += 4 * step) {
      const r1 = imageData1.data[i];
      const g1 = imageData1.data[i + 1];
      const b1 = imageData1.data[i + 2];

      const r2 = imageData2.data[i];
      const g2 = imageData2.data[i + 1];
      const b2 = imageData2.data[i + 2];

      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

      if (diff > threshold) {
        differentPixels++;
        // Fill the pixel and the skipped ones with difference color
        for (let j = 0; j < step && i + j * 4 < imageData1.data.length; j++) {
          const idx = i + j * 4;
          diffImageData.data[idx] = 255; // R (red for differences)
          diffImageData.data[idx + 1] = 0; // G
          diffImageData.data[idx + 2] = 0; // B
          diffImageData.data[idx + 3] = 255; // A (fully opaque)
        }
      } else {
        // Keep original pixels but make them slightly gray
        const gray = (r1 + g1 + b1) / 3;
        for (let j = 0; j < step && i + j * 4 < imageData1.data.length; j++) {
          const idx = i + j * 4;
          diffImageData.data[idx] = gray;
          diffImageData.data[idx + 1] = gray;
          diffImageData.data[idx + 2] = gray;
          diffImageData.data[idx + 3] = 255; // A (fully opaque)
        }
      }
    }

    // Apply difference image to canvas
    diffCtx.putImageData(diffImageData, 0, 0);

    const totalSampledPixels = Math.floor(imageData1.data.length / (4 * step));
    const percentage = (differentPixels / totalSampledPixels) * 100;

    // Store results in the format expected by the rest of the application
    this.pixelDifference = {
      percentage: percentage,
      differentPixels: differentPixels * step, // Estimate total different pixels
      totalPixels: width * height,
      samplingFactor: step,
    };

    console.log(
      `Visual analysis complete: ${percentage.toFixed(2)}% difference`
    );
    console.log("Pixel difference result:", this.pixelDifference);
  }

  generateBasicResults() {
    this.enhancedResults = {
      type: "image",
      visual: {
        message: "Fast image comparison completed",
        pixelDifference: this.pixelDifference || {
          percentage: 0,
          differentPixels: 0,
          totalPixels: 0,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Make sure canvases are properly assigned
    this.canvasA = document.getElementById("canvasA");
    this.canvasB = document.getElementById("canvasB");
    this.canvasDiff = document.getElementById("canvasDiff");

    console.log("Basic results generated:", this.enhancedResults);
    console.log("Canvas assignments:", {
      canvasA: this.canvasA,
      canvasB: this.canvasB,
      canvasDiff: this.canvasDiff,
    });
  }

  async performImageComparison() {
    try {
      // Initialize canvases if not already done
      this.initializeCanvases();

      // Setup canvases for image comparison
      if (!this.setupImageCanvases()) {
        throw new Error("Failed to setup canvases");
      }

      // Perform OCR if available
      if (this.ocrWorker) {
        await this.performOCRAnalysis();
      }

      // Perform visual analysis
      await this.performVisualAnalysis();

      // Generate enhanced results
      this.generateEnhancedResults();
    } catch (error) {
      console.error("Image comparison failed:", error);
      // Create simple results for basic image comparison
      this.createBasicImageResults();
    }
  }

  createBasicImageResults() {
    this.enhancedResults = {
      type: "image",
      visual: {
        message: "Basic image comparison completed",
        pixelDifference: { percentage: 0, differentPixels: 0, totalPixels: 0 },
      },
      timestamp: new Date().toISOString(),
    };
  }

  async performCSSComparison() {
    try {
      const cssA = this.dataA.data;
      const cssB = this.dataB.data;

      // Parse CSS using CSS Tree
      const astA = this.parseCSS(cssA);
      const astB = this.parseCSS(cssB);

      // Extract design tokens
      const tokensA = this.extractDesignTokens(astA, cssA);
      const tokensB = this.extractDesignTokens(astB, cssB);

      // Compare CSS properties
      const cssComparison = this.compareCSSProperties(astA, astB);

      // Generate results
      this.enhancedResults = {
        type: "css",
        tokens: this.compareDesignTokens(tokensA, tokensB),
        properties: cssComparison,
        structure: this.compareCSSStructure(astA, astB),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("CSS comparison failed:", error);
      this.createBasicCSSResults();
    }
  }

  createBasicCSSResults() {
    this.enhancedResults = {
      type: "css",
      message: "Basic CSS comparison completed",
      timestamp: new Date().toISOString(),
    };
  }

  async performHTMLComparison() {
    const htmlA = this.dataA.data;
    const htmlB = this.dataB.data;

    // Parse HTML structure
    const domA = this.parseHTML(htmlA);
    const domB = this.parseHTML(htmlB);

    // Compare DOM structure
    const domComparison = this.compareDOMStructure(domA, domB);

    // Extract semantic elements
    const semanticsA = this.extractSemanticElements(domA);
    const semanticsB = this.extractSemanticElements(domB);

    this.enhancedResults = {
      type: "html",
      dom: domComparison,
      semantics: this.compareSemanticElements(semanticsA, semanticsB),
      accessibility: this.compareAccessibility(domA, domB),
    };
  }

  async performWebsiteComparison() {
    const websiteA = this.dataA.data;
    const websiteB = this.dataB.data;

    // Combine HTML and CSS analysis
    await this.performHTMLComparison();

    // Add website-specific analysis
    this.enhancedResults.metadata = this.compareMetadata(
      websiteA.metadata,
      websiteB.metadata
    );
    this.enhancedResults.performance = this.analyzePerformance(
      websiteA,
      websiteB
    );
  }

  parseCSS(cssString) {
    try {
      if (typeof csstree !== "undefined") {
        return csstree.parse(cssString);
      } else {
        // Fallback parser
        return this.simpleCSSParser(cssString);
      }
    } catch (error) {
      console.warn("CSS parsing failed:", error);
      return this.simpleCSSParser(cssString);
    }
  }

  simpleCSSParser(cssString) {
    // Simple CSS parser as fallback
    const rules = [];
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(cssString)) !== null) {
      const selector = match[1].trim();
      const declarations = match[2].trim();

      const properties = {};
      declarations.split(";").forEach((decl) => {
        const [property, value] = decl.split(":").map((s) => s.trim());
        if (property && value) {
          properties[property] = value;
        }
      });

      rules.push({ selector, properties });
    }

    return { rules };
  }

  extractDesignTokens(ast, cssString) {
    const tokens = {
      colors: new Set(),
      fonts: new Set(),
      spacing: new Set(),
      sizes: new Set(),
      shadows: new Set(),
      borderRadius: new Set(),
    };

    // Extract color values
    const colorRegex =
      /#[0-9a-f]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/gi;
    const colors = cssString.match(colorRegex) || [];
    colors.forEach((color) => tokens.colors.add(color));

    // Extract font families
    const fontRegex = /font-family\s*:\s*([^;]+)/gi;
    const fonts = cssString.match(fontRegex) || [];
    fonts.forEach((font) => {
      const fontValue = font.split(":")[1].trim();
      tokens.fonts.add(fontValue);
    });

    // Extract spacing values
    const spacingRegex = /(?:margin|padding|gap)\s*:\s*([^;]+)/gi;
    const spacing = cssString.match(spacingRegex) || [];
    spacing.forEach((space) => {
      const spaceValue = space.split(":")[1].trim();
      tokens.spacing.add(spaceValue);
    });

    // Extract size values
    const sizeRegex = /(?:width|height|font-size)\s*:\s*([^;]+)/gi;
    const sizes = cssString.match(sizeRegex) || [];
    sizes.forEach((size) => {
      const sizeValue = size.split(":")[1].trim();
      tokens.sizes.add(sizeValue);
    });

    // Convert Sets to Arrays
    Object.keys(tokens).forEach((key) => {
      tokens[key] = Array.from(tokens[key]);
    });

    return tokens;
  }

  compareCSSProperties(astA, astB) {
    const propsA = this.extractAllProperties(astA);
    const propsB = this.extractAllProperties(astB);

    const comparison = {
      added: [],
      removed: [],
      changed: [],
      unchanged: [],
    };

    // Compare properties
    const allKeys = new Set([...Object.keys(propsA), ...Object.keys(propsB)]);

    allKeys.forEach((key) => {
      if (propsA[key] && propsB[key]) {
        if (propsA[key] === propsB[key]) {
          comparison.unchanged.push({ property: key, value: propsA[key] });
        } else {
          comparison.changed.push({
            property: key,
            from: propsA[key],
            to: propsB[key],
          });
        }
      } else if (propsA[key]) {
        comparison.removed.push({ property: key, value: propsA[key] });
      } else {
        comparison.added.push({ property: key, value: propsB[key] });
      }
    });

    return comparison;
  }

  extractAllProperties(ast) {
    const properties = {};

    if (ast.rules) {
      ast.rules.forEach((rule) => {
        Object.entries(rule.properties).forEach(([prop, value]) => {
          properties[`${rule.selector}::${prop}`] = value;
        });
      });
    }

    return properties;
  }

  compareDesignTokens(tokensA, tokensB) {
    const comparison = {};

    Object.keys(tokensA).forEach((category) => {
      const setA = new Set(tokensA[category]);
      const setB = new Set(tokensB[category]);

      comparison[category] = {
        added: tokensB[category].filter((token) => !setA.has(token)),
        removed: tokensA[category].filter((token) => !setB.has(token)),
        common: tokensA[category].filter((token) => setB.has(token)),
      };
    });

    return comparison;
  }

  compareCSSStructure(astA, astB) {
    const selectorsA = this.extractSelectors(astA);
    const selectorsB = this.extractSelectors(astB);

    return {
      selectorsA: selectorsA.length,
      selectorsB: selectorsB.length,
      commonSelectors: selectorsA.filter((sel) => selectorsB.includes(sel))
        .length,
      uniqueToA: selectorsA.filter((sel) => !selectorsB.includes(sel)),
      uniqueToB: selectorsB.filter((sel) => !selectorsA.includes(sel)),
    };
  }

  extractSelectors(ast) {
    if (ast.rules) {
      return ast.rules.map((rule) => rule.selector);
    }
    return [];
  }

  parseHTML(htmlString) {
    const parser = new DOMParser();
    return parser.parseFromString(htmlString, "text/html");
  }

  compareDOMStructure(domA, domB) {
    const structureA = this.extractDOMStructure(domA);
    const structureB = this.extractDOMStructure(domB);

    return {
      depthA: structureA.maxDepth,
      depthB: structureB.maxDepth,
      elementsA: structureA.elementCount,
      elementsB: structureB.elementCount,
      tagComparison: this.compareTagDistribution(
        structureA.tags,
        structureB.tags
      ),
    };
  }

  extractDOMStructure(dom) {
    const walker = document.createTreeWalker(
      dom.body || dom,
      NodeFilter.SHOW_ELEMENT
    );

    const tags = {};
    let maxDepth = 0;
    let elementCount = 0;

    function getDepth(node) {
      let depth = 0;
      while (node.parentElement) {
        depth++;
        node = node.parentElement;
      }
      return depth;
    }

    let node;
    while ((node = walker.nextNode())) {
      elementCount++;
      const tagName = node.tagName.toLowerCase();
      tags[tagName] = (tags[tagName] || 0) + 1;
      maxDepth = Math.max(maxDepth, getDepth(node));
    }

    return { tags, maxDepth, elementCount };
  }

  compareTagDistribution(tagsA, tagsB) {
    const allTags = new Set([...Object.keys(tagsA), ...Object.keys(tagsB)]);
    const comparison = {};

    allTags.forEach((tag) => {
      comparison[tag] = {
        countA: tagsA[tag] || 0,
        countB: tagsB[tag] || 0,
        difference: (tagsB[tag] || 0) - (tagsA[tag] || 0),
      };
    });

    return comparison;
  }

  extractSemanticElements(dom) {
    const semanticTags = [
      "header",
      "nav",
      "main",
      "section",
      "article",
      "aside",
      "footer",
    ];
    const elements = {};

    semanticTags.forEach((tag) => {
      elements[tag] = dom.querySelectorAll(tag).length;
    });

    // Extract headings
    elements.headings = {};
    for (let i = 1; i <= 6; i++) {
      elements.headings[`h${i}`] = dom.querySelectorAll(`h${i}`).length;
    }

    return elements;
  }

  compareSemanticElements(semanticsA, semanticsB) {
    const comparison = {};

    const allKeys = new Set([
      ...Object.keys(semanticsA),
      ...Object.keys(semanticsB),
    ]);

    allKeys.forEach((key) => {
      if (key === "headings") {
        comparison[key] = this.compareHeadings(
          semanticsA[key],
          semanticsB[key]
        );
      } else {
        comparison[key] = {
          countA: semanticsA[key] || 0,
          countB: semanticsB[key] || 0,
          difference: (semanticsB[key] || 0) - (semanticsA[key] || 0),
        };
      }
    });

    return comparison;
  }

  compareHeadings(headingsA, headingsB) {
    const comparison = {};

    for (let i = 1; i <= 6; i++) {
      const key = `h${i}`;
      comparison[key] = {
        countA: headingsA[key] || 0,
        countB: headingsB[key] || 0,
        difference: (headingsB[key] || 0) - (headingsA[key] || 0),
      };
    }

    return comparison;
  }

  compareAccessibility(domA, domB) {
    const accessibilityA = this.analyzeAccessibility(domA);
    const accessibilityB = this.analyzeAccessibility(domB);

    return {
      altTexts: {
        countA: accessibilityA.altTexts,
        countB: accessibilityB.altTexts,
        difference: accessibilityB.altTexts - accessibilityA.altTexts,
      },
      ariaLabels: {
        countA: accessibilityA.ariaLabels,
        countB: accessibilityB.ariaLabels,
        difference: accessibilityB.ariaLabels - accessibilityA.ariaLabels,
      },
      landmarks: {
        countA: accessibilityA.landmarks,
        countB: accessibilityB.landmarks,
        difference: accessibilityB.landmarks - accessibilityA.landmarks,
      },
    };
  }

  analyzeAccessibility(dom) {
    return {
      altTexts: dom.querySelectorAll("img[alt]").length,
      ariaLabels: dom.querySelectorAll("[aria-label]").length,
      landmarks: dom.querySelectorAll("[role]").length,
    };
  }

  setupImageCanvases() {
    try {
      if (
        !this.canvasA ||
        !this.canvasB ||
        !this.canvasSlider ||
        !this.canvasDiff
      ) {
        console.error("Canvas elements not found");
        return false;
      }

      if (!this.dataA || !this.dataB) {
        console.error("Image data not available");
        return false;
      }

      const imgA = this.dataA.data;
      const imgB = this.dataB.data;

      if (!imgA || !imgB) {
        console.error("Image objects not valid");
        return false;
      }

      // Calculate canvas dimensions
      const maxWidth = 600;
      const maxHeight = 400;

      const aspectRatioA = imgA.width / imgA.height;
      const aspectRatioB = imgB.width / imgB.height;

      let canvasWidth, canvasHeight;

      if (aspectRatioA > aspectRatioB) {
        canvasWidth = Math.min(maxWidth, Math.max(imgA.width, imgB.width));
        canvasHeight = canvasWidth / aspectRatioA;
      } else {
        canvasHeight = Math.min(maxHeight, Math.max(imgA.height, imgB.height));
        canvasWidth = canvasHeight * aspectRatioB;
      }

      // Set canvas dimensions
      [this.canvasA, this.canvasB, this.canvasSlider, this.canvasDiff].forEach(
        (canvas) => {
          if (canvas) {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
          }
        }
      );

      // Draw images
      const ctxA = this.canvasA.getContext("2d");
      const ctxB = this.canvasB.getContext("2d");

      ctxA.drawImage(imgA, 0, 0, canvasWidth, canvasHeight);
      ctxB.drawImage(imgB, 0, 0, canvasWidth, canvasHeight);

      return true;
    } catch (error) {
      console.error("Error setting up canvases:", error);
      return false;
    }
  }

  async performOCRAnalysis() {
    if (!this.ocrWorker || this.currentMode !== "image") return;

    try {
      const [resultA, resultB] = await Promise.all([
        this.ocrWorker.recognize(this.canvasA),
        this.ocrWorker.recognize(this.canvasB),
      ]);

      this.ocrDataA = resultA;
      this.ocrDataB = resultB;
    } catch (error) {
      console.warn("OCR analysis failed:", error);
    }
  }

  async performVisualAnalysis() {
    if (this.currentMode !== "image") return;

    console.log("Starting visual analysis...");

    try {
      // Generate pixel difference analysis with timeout (reduced to 10 seconds)
      const pixelDiffPromise = this.generatePixelDifference();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Pixel difference analysis timed out")),
          10000
        )
      );

      await Promise.race([pixelDiffPromise, timeoutPromise]);
      console.log("Pixel difference analysis completed");

      // Extract color palettes
      console.log("Extracting color palettes...");
      this.colorAnalysis = {
        paletteA: this.extractColorPalette(this.canvasA),
        paletteB: this.extractColorPalette(this.canvasB),
      };
      console.log("Color palette extraction completed");
    } catch (error) {
      console.error("Visual analysis failed:", error);
      // Create fallback data
      this.pixelDifference = {
        error: "Visual analysis failed: " + error.message,
        percentage: 0,
        differentPixels: 0,
        totalPixels: 0,
      };
      this.colorAnalysis = {
        paletteA: [],
        paletteB: [],
      };
    }
  }

  async generatePixelDifference() {
    console.log("generatePixelDifference called");

    try {
      const ctxA = this.canvasA.getContext("2d");
      const ctxB = this.canvasB.getContext("2d");
      const ctxDiff = this.canvasDiff.getContext("2d");

      console.log("Canvas contexts:", { ctxA, ctxB, ctxDiff });

      if (!ctxA || !ctxB || !ctxDiff) {
        console.error("Unable to get canvas contexts");
        return;
      }

      const width = this.canvasA.width;
      const height = this.canvasA.height;

      console.log("Canvas dimensions:", { width, height });

      if (width === 0 || height === 0) {
        console.error("Invalid canvas dimensions");
        return;
      }

      // For large images, sample pixels instead of processing every pixel
      const maxPixels = 200000; // Reduced for better performance
      const totalPixels = width * height;
      const skipFactor =
        totalPixels > maxPixels ? Math.ceil(totalPixels / maxPixels) : 1;

      console.log("Processing settings:", { totalPixels, skipFactor });

      const imageDataA = ctxA.getImageData(0, 0, width, height);
      const imageDataB = ctxB.getImageData(0, 0, width, height);
      const diffImageData = ctxDiff.createImageData(width, height);

      let differentPixels = 0;
      let sampledPixels = 0;
      const threshold = 30;
      const maxSamples = Math.floor(imageDataA.data.length / (4 * skipFactor));

      console.log("Starting pixel processing, max samples:", maxSamples);

      // Process pixels with optional skipping for performance
      for (
        let i = 0;
        i < imageDataA.data.length && sampledPixels < maxSamples;
        i += 4 * skipFactor
      ) {
        const rA = imageDataA.data[i] || 0;
        const gA = imageDataA.data[i + 1] || 0;
        const bA = imageDataA.data[i + 2] || 0;

        const rB = imageDataB.data[i] || 0;
        const gB = imageDataB.data[i + 1] || 0;
        const bB = imageDataB.data[i + 2] || 0;

        const diff = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB);

        if (diff > threshold) {
          // Fill skipped pixels with difference color
          for (
            let j = 0;
            j < skipFactor && i + j * 4 < imageDataA.data.length;
            j++
          ) {
            const idx = i + j * 4;
            diffImageData.data[idx] = 255; // R
            diffImageData.data[idx + 1] = 0; // G
            diffImageData.data[idx + 2] = 0; // B
            diffImageData.data[idx + 3] = 255; // A
          }
          differentPixels++;
        } else {
          const gray = (rA + gA + bA) / 3;
          // Fill skipped pixels with gray
          for (
            let j = 0;
            j < skipFactor && i + j * 4 < imageDataA.data.length;
            j++
          ) {
            const idx = i + j * 4;
            diffImageData.data[idx] = gray;
            diffImageData.data[idx + 1] = gray;
            diffImageData.data[idx + 2] = gray;
            diffImageData.data[idx + 3] = 255;
          }
        }
        sampledPixels++;

        // Yield control less frequently to prevent hanging
        if (sampledPixels % 5000 === 0) {
          console.log(`Processed ${sampledPixels} samples...`);
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      console.log(
        `Pixel processing complete. Processed ${sampledPixels} samples, found ${differentPixels} different pixels`
      );

      ctxDiff.putImageData(diffImageData, 0, 0);

      this.pixelDifference = {
        differentPixels: differentPixels * skipFactor,
        totalPixels: totalPixels,
        percentage: ((differentPixels * skipFactor) / totalPixels) * 100,
        samplingFactor: skipFactor,
      };

      console.log("Pixel difference result:", this.pixelDifference);

      // Update diff stats if we're in diff mode
      if (this.comparisonMode === "diff") {
        console.log("Calling updateDiffStats from generatePixelDifference");
        this.updateDiffStats();
      }
    } catch (error) {
      console.error("Error generating pixel difference:", error);
      this.pixelDifference = {
        error: "Failed to analyze pixel differences: " + error.message,
      };

      // Update diff stats to show error if we're in diff mode
      if (this.comparisonMode === "diff") {
        this.updateDiffStats();
      }
    }
  }
  extractColorPalette(canvas) {
    try {
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      const colorMap = new Map();

      // Sample pixels for performance - take every 16th pixel instead of every 4th
      const sampleRate = Math.max(16, Math.floor(data.length / 40000)); // Limit to ~10k samples

      for (let i = 0; i < data.length; i += sampleRate) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];

        // Skip transparent pixels
        if (alpha < 128) continue;

        const color = `rgb(${r},${g},${b})`;
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }

      return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([color, count]) => ({ color, count }));
    } catch (error) {
      console.error("Error extracting color palette:", error);
      return [];
    }
  }

  generateEnhancedResults() {
    this.enhancedResults = {
      type: this.currentMode,
      timestamp: new Date().toISOString(),
    };

    if (this.currentMode === "image") {
      this.enhancedResults.visual = {
        pixelDifference: this.pixelDifference,
        colorAnalysis: this.colorAnalysis,
      };

      if (this.ocrDataA && this.ocrDataB) {
        this.enhancedResults.text = this.compareOCRResults();
      }
    }
  }

  compareOCRResults() {
    const textA = this.ocrDataA.data.text.trim();
    const textB = this.ocrDataB.data.text.trim();

    return {
      textA,
      textB,
      similarity: this.calculateTextSimilarity(textA, textB),
      wordsA: this.ocrDataA.data.words?.length || 0,
      wordsB: this.ocrDataB.data.words?.length || 0,
      changes: this.detectTextChanges(textA, textB),
    };
  }

  calculateTextSimilarity(textA, textB) {
    const maxLength = Math.max(textA.length, textB.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(textA, textB);
    return 1 - distance / maxLength;
  }

  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
      .fill()
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  detectTextChanges(textA, textB) {
    const wordsA = textA.split(/\s+/);
    const wordsB = textB.split(/\s+/);
    const changes = [];

    const maxLength = Math.max(wordsA.length, wordsB.length);

    for (let i = 0; i < maxLength; i++) {
      const wordA = wordsA[i] || "";
      const wordB = wordsB[i] || "";

      if (wordA !== wordB) {
        changes.push({
          position: i,
          from: wordA,
          to: wordB,
          type: !wordA ? "added" : !wordB ? "removed" : "changed",
        });
      }
    }

    return changes;
  }

  showComparisonResults() {
    const comparisonSection = document.getElementById("comparisonSection");
    comparisonSection.style.display = "block";
    comparisonSection.classList.add("fade-in");

    this.updateComparisonView();
    this.displayEnhancedResults();

    comparisonSection.scrollIntoView({ behavior: "smooth" });
  }

  updateComparisonView() {
    console.log("updateComparisonView called, mode:", this.comparisonMode);

    // Hide all views first
    const views = ["sideBySideView", "sliderView", "diffView"];
    views.forEach((viewId) => {
      const element = document.getElementById(viewId);
      if (element) element.style.display = "none";
    });

    // Show selected view for image mode
    if (this.currentMode === "image" && this.comparisonMode !== "enhanced") {
      const viewMap = {
        sideBySide: "sideBySideView",
        slider: "sliderView",
        diff: "diffView",
      };

      const viewId = viewMap[this.comparisonMode];
      console.log("Showing view:", viewId);

      if (viewId) {
        const element = document.getElementById(viewId);
        if (element) {
          element.style.display = "block";
          console.log("Element displayed:", element);

          // Update diff stats if diff view is selected
          if (this.comparisonMode === "diff") {
            console.log("Updating diff stats...");
            this.updateDiffStats();
          }

          // Setup slider if slider view is selected
          if (this.comparisonMode === "slider") {
            console.log("Setting up slider view...");
            this.setupSliderView();
          }
        } else {
          console.error("Element not found:", viewId);
        }
      }
    } else {
      console.log(
        "Conditions not met - currentMode:",
        this.currentMode,
        "comparisonMode:",
        this.comparisonMode
      );
    }
  }

  updateDiffStats() {
    console.log("updateDiffStats called");

    const diffStatsElement = document.getElementById("diffStats");
    console.log("diffStatsElement:", diffStatsElement);
    console.log("pixelDifference:", this.pixelDifference);

    if (!diffStatsElement || !this.pixelDifference) {
      console.log("Early return - missing element or data");
      return;
    }

    let statsHTML = "";

    if (this.pixelDifference.error) {
      statsHTML = `<p style="color: #dc3545;">${this.pixelDifference.error}</p>`;
    } else {
      const percentage = this.pixelDifference.percentage || 0;
      const differentPixels = this.pixelDifference.differentPixels || 0;
      const totalPixels = this.pixelDifference.totalPixels || 0;

      let colorClass = "excellent";
      let statusText = "Nearly Identical";

      if (percentage > 10) {
        colorClass = "needs-attention";
        statusText = "Significantly Different";
      } else if (percentage > 2) {
        colorClass = "good";
        statusText = "Some Differences";
      }

      statsHTML = `
        <div class="metric ${colorClass}">
          <label>Difference Percentage:</label>
          <span>${percentage.toFixed(2)}%</span>
        </div>
        <div class="metric">
          <label>Different Pixels:</label>
          <span>${differentPixels.toLocaleString()} / ${totalPixels.toLocaleString()}</span>
        </div>
        <div class="metric ${colorClass}">
          <label>Status:</label>
          <span>${statusText}</span>
        </div>
        ${
          this.pixelDifference.samplingFactor > 1
            ? `<p style="font-size: 0.9rem; color: #6c757d; margin-top: 10px;">
            <em>Note: Analysis used ${this.pixelDifference.samplingFactor}x sampling for performance</em>
          </p>`
            : ""
        }
      `;
    }

    console.log("Setting innerHTML:", statsHTML);
    diffStatsElement.innerHTML = statsHTML;
  }

  setupSliderView() {
    console.log("setupSliderView called");

    if (!this.canvasA || !this.canvasB || !this.canvasSlider) {
      console.error("Canvas elements not available for slider view");
      return;
    }

    const ctxSlider = this.canvasSlider.getContext("2d");
    const ctxA = this.canvasA.getContext("2d");
    const ctxB = this.canvasB.getContext("2d");

    if (!ctxSlider || !ctxA || !ctxB) {
      console.error("Cannot get canvas contexts for slider");
      return;
    }

    // Set slider canvas dimensions to match other canvases
    this.canvasSlider.width = this.canvasA.width;
    this.canvasSlider.height = this.canvasA.height;

    // Initially show the blend at 50%
    this.updateSliderView(50);

    console.log("Slider view setup complete");
  }

  updateSliderView(value) {
    if (!this.canvasA || !this.canvasB || !this.canvasSlider) {
      return;
    }

    const ctxSlider = this.canvasSlider.getContext("2d");
    const ctxA = this.canvasA.getContext("2d");
    const ctxB = this.canvasB.getContext("2d");

    if (!ctxSlider || !ctxA || !ctxB) {
      return;
    }

    const width = this.canvasSlider.width;
    const height = this.canvasSlider.height;

    // Clear the slider canvas
    ctxSlider.clearRect(0, 0, width, height);

    // Calculate the split position based on slider value (0-100)
    const splitPosition = (value / 100) * width;

    // Draw image A on the left side
    const imageDataA = ctxA.getImageData(0, 0, width, height);
    ctxSlider.putImageData(imageDataA, 0, 0);

    // Draw image B on the right side (clipped)
    if (splitPosition < width) {
      const imageDataB = ctxB.getImageData(
        splitPosition,
        0,
        width - splitPosition,
        height
      );
      ctxSlider.putImageData(imageDataB, splitPosition, 0);
    }

    // Update the slider divider position
    const sliderDivider = document.getElementById("sliderDivider");
    if (sliderDivider) {
      sliderDivider.style.left = `${value}%`;
    }

    console.log(`Slider updated to ${value}%`);
  }

  displayEnhancedResults() {
    if (!this.enhancedResults) return;

    // Remove existing results
    const existingResults = document.querySelector(".enhanced-results");
    if (existingResults) existingResults.remove();

    // Create results panel
    const resultsPanel = document.createElement("div");
    resultsPanel.className = "enhanced-results fade-in";
    resultsPanel.innerHTML = this.generateResultsHTML();

    // Insert after comparison section
    const comparisonSection = document.getElementById("comparisonSection");
    comparisonSection.parentNode.insertBefore(
      resultsPanel,
      comparisonSection.nextSibling
    );
  }

  generateResultsHTML() {
    const results = this.enhancedResults;

    let html = `
            <div class="enhanced-analysis-panel">
                <h2>🔍 Enhanced Analysis Results</h2>
                <div class="analysis-grid">
        `;

    switch (results.type) {
      case "image":
        html += this.generateImageAnalysisHTML(results);
        break;
      case "css":
        html += this.generateCSSAnalysisHTML(results);
        break;
      case "html":
        html += this.generateHTMLAnalysisHTML(results);
        break;
      case "website":
        html += this.generateWebsiteAnalysisHTML(results);
        break;
    }

    html += `
                </div>
            </div>
        `;

    return html;
  }

  generateImageAnalysisHTML(results) {
    let html = "";

    // Visual analysis
    if (results.visual) {
      html += `
                <div class="analysis-card">
                    <h3>🎨 Visual Analysis</h3>
                    <div class="metric">
                        <label>Pixel Difference:</label>
                        <span>${results.visual.pixelDifference.percentage.toFixed(
                          2
                        )}%</span>
                    </div>
                    <div class="metric">
                        <label>Different Pixels:</label>
                        <span>${results.visual.pixelDifference.differentPixels.toLocaleString()}</span>
                    </div>
                </div>
            `;

      // Color analysis
      if (results.visual.colorAnalysis) {
        html += this.generateColorAnalysisHTML(results.visual.colorAnalysis);
      }
    }

    // Text analysis
    if (results.text) {
      html += this.generateTextAnalysisHTML(results.text);
    }

    return html;
  }

  generateColorAnalysisHTML(colorAnalysis) {
    return `
            <div class="analysis-card">
                <h3>🎨 Color Analysis</h3>
                <div class="color-palettes">
                    <div class="palette">
                        <h4>Image A Palette</h4>
                        <div class="color-swatches">
                            ${colorAnalysis.paletteA
                              .map(
                                (color) => `
                                <div class="color-swatch" style="background: ${color.color}" title="${color.color} (${color.count} pixels)"></div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                    <div class="palette">
                        <h4>Image B Palette</h4>
                        <div class="color-swatches">
                            ${colorAnalysis.paletteB
                              .map(
                                (color) => `
                                <div class="color-swatch" style="background: ${color.color}" title="${color.color} (${color.count} pixels)"></div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  generateTextAnalysisHTML(textResults) {
    const similarity = Math.round(textResults.similarity * 100);
    const statusClass =
      similarity > 90
        ? "excellent"
        : similarity > 70
        ? "good"
        : "needs-attention";

    return `
            <div class="analysis-card">
                <h3>📝 Text Analysis (OCR)</h3>
                <div class="metric ${statusClass}">
                    <label>Text Similarity:</label>
                    <span>${similarity}%</span>
                </div>
                <div class="metric">
                    <label>Words A/B:</label>
                    <span>${textResults.wordsA} / ${textResults.wordsB}</span>
                </div>
                ${
                  textResults.changes.length > 0
                    ? `
                    <div class="changes-list">
                        <h4>Text Changes:</h4>
                        ${textResults.changes
                          .slice(0, 5)
                          .map(
                            (change) => `
                            <div class="change-item ${change.type}">
                                <span class="change-type">${change.type}</span>
                                <span class="change-text">"${change.from}" → "${change.to}"</span>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  generateCSSAnalysisHTML(results) {
    let html = "";

    // Design tokens
    if (results.tokens) {
      html += this.generateDesignTokensHTML(results.tokens);
    }

    // CSS properties
    if (results.properties) {
      html += this.generateCSSPropertiesHTML(results.properties);
    }

    // CSS structure
    if (results.structure) {
      html += this.generateCSSStructureHTML(results.structure);
    }

    return html;
  }

  generateDesignTokensHTML(tokens) {
    return `
            <div class="analysis-card">
                <h3>🎨 Design Tokens</h3>
                <div class="design-tokens">
                    ${Object.entries(tokens)
                      .map(
                        ([category, data]) => `
                        <div class="token-category">
                            <h5>${
                              category.charAt(0).toUpperCase() +
                              category.slice(1)
                            }</h5>
                            <div class="token-list">
                                ${data.common
                                  .map(
                                    (token) => `
                                    <span class="token-item">${token}</span>
                                `
                                  )
                                  .join("")}
                            </div>
                            ${
                              data.added.length > 0
                                ? `
                                <div class="token-changes">
                                    <strong>Added:</strong> ${data.added.join(
                                      ", "
                                    )}
                                </div>
                            `
                                : ""
                            }
                            ${
                              data.removed.length > 0
                                ? `
                                <div class="token-changes">
                                    <strong>Removed:</strong> ${data.removed.join(
                                      ", "
                                    )}
                                </div>
                            `
                                : ""
                            }
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  generateCSSPropertiesHTML(properties) {
    return `
            <div class="analysis-card">
                <h3>📋 CSS Properties</h3>
                <div class="css-properties">
                    ${
                      properties.changed.length > 0
                        ? `
                        <div class="property-group">
                            <h5>Changed Properties</h5>
                            ${properties.changed
                              .slice(0, 10)
                              .map(
                                (prop) => `
                                <div class="property-item">
                                    <span class="property-name">${prop.property}</span>
                                    <div class="token-comparison">
                                        <span class="token-value">${prop.from}</span>
                                        <span class="token-arrow">→</span>
                                        <span class="token-value changed">${prop.to}</span>
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    `
                        : ""
                    }
                    
                    <div class="metric">
                        <label>Added Properties:</label>
                        <span>${properties.added.length}</span>
                    </div>
                    <div class="metric">
                        <label>Removed Properties:</label>
                        <span>${properties.removed.length}</span>
                    </div>
                    <div class="metric">
                        <label>Unchanged Properties:</label>
                        <span>${properties.unchanged.length}</span>
                    </div>
                </div>
            </div>
        `;
  }

  generateCSSStructureHTML(structure) {
    return `
            <div class="analysis-card">
                <h3>🏗️ CSS Structure</h3>
                <div class="metric">
                    <label>Selectors A/B:</label>
                    <span>${structure.selectorsA} / ${
      structure.selectorsB
    }</span>
                </div>
                <div class="metric">
                    <label>Common Selectors:</label>
                    <span>${structure.commonSelectors}</span>
                </div>
                ${
                  structure.uniqueToA.length > 0
                    ? `
                    <div class="changes-list">
                        <h4>Unique to A:</h4>
                        ${structure.uniqueToA
                          .slice(0, 5)
                          .map(
                            (selector) => `
                            <div class="change-item removed">${selector}</div>
                        `
                          )
                          .join("")}
                    </div>
                `
                    : ""
                }
                ${
                  structure.uniqueToB.length > 0
                    ? `
                    <div class="changes-list">
                        <h4>Unique to B:</h4>
                        ${structure.uniqueToB
                          .slice(0, 5)
                          .map(
                            (selector) => `
                            <div class="change-item added">${selector}</div>
                        `
                          )
                          .join("")}
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  generateHTMLAnalysisHTML(results) {
    let html = "";

    // DOM structure
    if (results.dom) {
      html += this.generateDOMStructureHTML(results.dom);
    }

    // Semantic elements
    if (results.semantics) {
      html += this.generateSemanticsHTML(results.semantics);
    }

    // Accessibility
    if (results.accessibility) {
      html += this.generateAccessibilityHTML(results.accessibility);
    }

    return html;
  }

  generateDOMStructureHTML(dom) {
    return `
            <div class="analysis-card">
                <h3>🏗️ DOM Structure</h3>
                <div class="metric">
                    <label>Max Depth A/B:</label>
                    <span>${dom.depthA} / ${dom.depthB}</span>
                </div>
                <div class="metric">
                    <label>Elements A/B:</label>
                    <span>${dom.elementsA} / ${dom.elementsB}</span>
                </div>
                <div class="dom-structure">
                    <h5>Tag Distribution Changes:</h5>
                    ${Object.entries(dom.tagComparison)
                      .slice(0, 10)
                      .map(
                        ([tag, data]) => `
                        <div class="property-item">
                            <span class="property-name">&lt;${tag}&gt;</span>
                            <span class="property-value">${data.countA} → ${
                          data.countB
                        } (${data.difference > 0 ? "+" : ""}${
                          data.difference
                        })</span>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  generateSemanticsHTML(semantics) {
    return `
            <div class="analysis-card">
                <h3>📄 Semantic Elements</h3>
                ${Object.entries(semantics)
                  .map(([element, data]) => {
                    if (element === "headings") {
                      return `
                            <div class="property-group">
                                <h5>Headings</h5>
                                ${Object.entries(data)
                                  .map(
                                    ([heading, info]) => `
                                    <div class="property-item">
                                        <span class="property-name">&lt;${heading}&gt;</span>
                                        <span class="property-value">${info.countA} → ${info.countB}</span>
                                    </div>
                                `
                                  )
                                  .join("")}
                            </div>
                        `;
                    } else {
                      return `
                            <div class="metric">
                                <label>&lt;${element}&gt;:</label>
                                <span>${data.countA} → ${data.countB} (${
                        data.difference > 0 ? "+" : ""
                      }${data.difference})</span>
                            </div>
                        `;
                    }
                  })
                  .join("")}
            </div>
        `;
  }

  generateAccessibilityHTML(accessibility) {
    return `
            <div class="analysis-card">
                <h3>♿ Accessibility</h3>
                <div class="metric">
                    <label>Alt Texts:</label>
                    <span>${accessibility.altTexts.countA} → ${
      accessibility.altTexts.countB
    } (${accessibility.altTexts.difference > 0 ? "+" : ""}${
      accessibility.altTexts.difference
    })</span>
                </div>
                <div class="metric">
                    <label>ARIA Labels:</label>
                    <span>${accessibility.ariaLabels.countA} → ${
      accessibility.ariaLabels.countB
    } (${accessibility.ariaLabels.difference > 0 ? "+" : ""}${
      accessibility.ariaLabels.difference
    })</span>
                </div>
                <div class="metric">
                    <label>Landmarks:</label>
                    <span>${accessibility.landmarks.countA} → ${
      accessibility.landmarks.countB
    } (${accessibility.landmarks.difference > 0 ? "+" : ""}${
      accessibility.landmarks.difference
    })</span>
                </div>
            </div>
        `;
  }

  generateWebsiteAnalysisHTML(results) {
    return (
      this.generateHTMLAnalysisHTML(results) +
      this.generateCSSAnalysisHTML(results)
    );
  }

  resetComparison() {
    // Reset all data
    this.dataA = null;
    this.dataB = null;
    this.enhancedResults = null;

    // Reset UI based on current mode
    switch (this.currentMode) {
      case "image":
        this.resetImageMode();
        break;
      case "css":
        this.resetCodeMode("css");
        break;
      case "html":
        this.resetCodeMode("html");
        break;
      case "url":
        this.resetURLMode();
        break;
    }

    // Hide sections
    document.getElementById("controlsSection").style.display = "none";
    document.getElementById("comparisonSection").style.display = "none";

    // Remove results
    const existingResults = document.querySelector(".enhanced-results");
    if (existingResults) existingResults.remove();

    // Reset comparison mode
    document.querySelector('input[value="diff"]').checked = true;
    this.comparisonMode = "diff";

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  resetImageMode() {
    document.getElementById("imageA").value = "";
    document.getElementById("imageB").value = "";
    document.getElementById("previewA").style.display = "none";
    document.getElementById("previewB").style.display = "none";
    document.querySelector('[data-target="imageA"]').style.display = "flex";
    document.querySelector('[data-target="imageB"]').style.display = "flex";
  }

  resetCodeMode(type) {
    document.getElementById(`${type}CodeA`).value = "";
    document.getElementById(`${type}CodeB`).value = "";
  }

  resetURLMode() {
    document.getElementById("urlA").value = "";
    document.getElementById("urlB").value = "";
  }

  showError(message) {
    // Simple error display - could be enhanced with toast notifications
    alert(message);
  }
}

// Initialize the enhanced application
document.addEventListener("DOMContentLoaded", () => {
  window.enhancedComparator = new EnhancedDesignComparator();

  // Add entrance animation
  document.querySelector(".container").classList.add("fade-in");
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "r":
        e.preventDefault();
        if (window.enhancedComparator) {
          window.enhancedComparator.resetComparison();
        }
        break;
      case "Enter":
        e.preventDefault();
        if (window.enhancedComparator) {
          window.enhancedComparator.performComparison();
        }
        break;
    }
  }
});

// Export for global access
window.EnhancedDesignComparator = EnhancedDesignComparator;
