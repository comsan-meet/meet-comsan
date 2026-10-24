/**
 * COMSAN Meeting System - Lucide Icons & DiceBear Avatars Utility
 * Unified standard matching Comsan Choice Design System:
 * - Lucide Icons with automatic font-size adaptive scaling & utility class override
 * - DiceBear Gaze style avatars with Bold Pop vibrant saturated color palette
 * - Auto-conversion for dynamically rendered elements and backward-compatibility with FontAwesome
 */

(function (window, document) {
  'use strict';

  // =============================================================================
  // 1. INJECT ADAPTIVE CSS FOR LUCIDE ICONS & AVATARS
  // =============================================================================
  const styleEl = document.createElement('style');
  styleEl.id = 'comsan-icons-and-avatars-style';
  styleEl.textContent = `
    /* Baseline Lucide sizing: scales with font-size (1em) like original UI icons */
    :where(svg.lucide) {
      width: 1em;
      height: 1em;
      display: inline-block;
      vertical-align: -0.15em;
      stroke-width: 2px;
      stroke: currentColor;
      flex-shrink: 0;
    }

    /* Reset vertical alignment for buttons and centered flex wrappers */
    button > svg.lucide,
    a > svg.lucide,
    .btn > svg.lucide,
    .inline-flex > svg.lucide,
    .flex > svg.lucide {
      vertical-align: middle;
    }

    /* Smooth transition for theme and active icon state changes */
    svg.lucide {
      transition: transform 0.15s ease, opacity 0.15s ease, color 0.15s ease;
    }

    /* DiceBear Avatar Standard Styling */
    .comsan-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      user-select: none;
      pointer-events: none;
      border-radius: inherit;
    }
  `;
  if (document.head) {
    document.head.appendChild(styleEl);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(styleEl));
  }

  // =============================================================================
  // 2. DICEBEAR AVATARS (GAZE - BOLD POP PALETTE)
  // =============================================================================
  // Bold Pop Palette: Vibrant, saturated background tones that pop crisply
  // ff5d8f (Pink), ffb703 (Amber/Gold), 43aa8b (Teal/Green), 4d96ff (Sky Blue), b57bff (Bright Purple)
  const BOLD_POP_PALETTE = 'ff5d8f,ffb703,43aa8b,4d96ff,b57bff';

  /**
   * Generates a deterministic DiceBear Gaze - Bold Pop avatar URL
   * @param {string|object} userOrSeed
   * @returns {string} avatar SVG URL
   */
  function getUserAvatarUrl(userOrSeed) {
    let seed = 'comsan-user';
    if (typeof userOrSeed === 'string' && userOrSeed.trim()) {
      seed = userOrSeed.trim();
    } else if (userOrSeed && typeof userOrSeed === 'object') {
      seed = userOrSeed.nickname || userOrSeed.id || userOrSeed.username || userOrSeed.firstName || userOrSeed.name || 'comsan-user';
    }
    return `https://api.dicebear.com/10.x/gaze/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${BOLD_POP_PALETTE}`;
  }

  /**
   * Generates an inline <img> HTML string for template literals
   * @param {string|object} userOrSeed
   * @param {string} extraClass
   * @returns {string}
   */
  function getAvatarImageHtml(userOrSeed, extraClass = '') {
    const url = getUserAvatarUrl(userOrSeed);
    let initial = 'U';
    let alt = 'avatar';
    if (typeof userOrSeed === 'string' && userOrSeed.trim()) {
      initial = userOrSeed.trim().charAt(0);
      alt = userOrSeed.trim();
    } else if (userOrSeed && typeof userOrSeed === 'object') {
      initial = (userOrSeed.nickname || userOrSeed.firstName || userOrSeed.id || 'U').charAt(0);
      alt = userOrSeed.nickname || userOrSeed.firstName || userOrSeed.id || 'avatar';
    }
    const safeAlt = String(alt).replace(/"/g, '&quot;');
    const safeInitial = String(initial).replace(/'/g, "\\'").replace(/"/g, '&quot;');

    return `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" class="comsan-avatar-img ${extraClass}" src="${url}" alt="${safeAlt}" onerror="this.onerror=null; if(this.parentElement) this.parentElement.textContent='${safeInitial}';" />`;
  }

  /**
   * Updates an existing DOM element to show a DiceBear Gaze avatar
   * @param {HTMLElement} element
   * @param {string|object} userOrSeed
   */
  function updateAvatarElement(element, userOrSeed) {
    if (!element) return;
    const url = getUserAvatarUrl(userOrSeed);

    // If an img with this exact src is already present, avoid unnecessary DOM thrashing
    const currentImg = element.querySelector('img.comsan-avatar-img');
    if (currentImg && currentImg.getAttribute('src') === url) {
      return;
    }

    let initial = 'U';
    let alt = 'avatar';
    if (typeof userOrSeed === 'string' && userOrSeed.trim()) {
      initial = userOrSeed.trim().charAt(0);
      alt = userOrSeed.trim();
    } else if (userOrSeed && typeof userOrSeed === 'object') {
      initial = (userOrSeed.nickname || userOrSeed.firstName || userOrSeed.id || 'U').charAt(0);
      alt = userOrSeed.nickname || userOrSeed.firstName || userOrSeed.id || 'avatar';
    }

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.className = 'comsan-avatar-img';
    img.src = url;
    img.alt = alt;
    img.onerror = function () {
      element.textContent = initial;
    };

    element.innerHTML = '';
    element.appendChild(img);
  }

  // =============================================================================
  // 3. FONTAWESOME TO LUCIDE ICON MAPPING DICTIONARY
  // =============================================================================
  const FA_TO_LUCIDE_MAP = {
    // Theme & Navigation
    'fa-sun': 'sun',
    'fa-moon': 'moon',
    'fa-gear': 'settings',
    'fa-gears': 'settings',
    'fa-sliders': 'sliders',
    'fa-power-off': 'log-out',
    'fa-door-open': 'door-open',
    'fa-circle-check': 'circle-check',
    'fa-circle-xmark': 'circle-x',
    'fa-circle-exclamation': 'circle-alert',
    'fa-triangle-exclamation': 'triangle-alert',
    'fa-circle-info': 'info',
    'fa-info': 'info',
    'fa-bell': 'bell',
    'fa-xmark': 'x',
    'fa-check': 'check',
    'fa-check-to-slot': 'vote',
    'fa-ban': 'ban',
    'fa-eye': 'eye',
    'fa-eye-slash': 'eye-off',
    'fa-trash': 'trash-2',
    'fa-trash-can': 'trash-2',
    'fa-pen': 'pen',
    'fa-pen-to-square': 'pen',
    'fa-spinner': 'loader-2',

    // Chevrons & Arrows
    'fa-chevron-down': 'chevron-down',
    'fa-chevron-up': 'chevron-up',
    'fa-chevron-left': 'chevron-left',
    'fa-chevron-right': 'chevron-right',
    'fa-arrow-right': 'arrow-right',
    'fa-arrow-left': 'arrow-left',
    'fa-arrow-up': 'arrow-up',
    'fa-arrow-down': 'arrow-down',

    // Voting & Interactions
    'fa-thumbs-up': 'thumbs-up',
    'fa-thumbs-down': 'thumbs-down',
    'fa-minus': 'minus',
    'fa-plus': 'plus',
    'fa-circle-dot': 'circle-dot',
    'fa-magnifying-glass-plus': 'zoom-in',
    'fa-magnifying-glass': 'search',
    'fa-search': 'search',
    'fa-hand': 'hand',
    'fa-hand-holding': 'hand',

    // Media & Meeting
    'fa-video': 'video',
    'fa-microphone': 'mic',
    'fa-microphone-slash': 'mic-off',
    'fa-desktop': 'monitor',
    'fa-users': 'users',
    'fa-users-rectangle': 'users',
    'fa-user': 'user',
    'fa-user-check': 'user-check',
    'fa-user-clock': 'clock',
    'fa-user-xmark': 'user-x',
    'fa-user-gear': 'user-cog',
    'fa-clipboard-user': 'clipboard-check',
    'fa-globe': 'globe',
    'fa-discord': 'message-square',
    'fa-note-sticky': 'sticky-note',
    'fa-file-pdf': 'file-text',
    'fa-file-excel': 'file-spreadsheet',
    'fa-file-lines': 'file-text',
    'fa-file-text': 'file-text',
    'fa-file': 'file',
    'fa-file-arrow-up': 'upload',
    'fa-file-import': 'upload',
    'fa-cloud-arrow-down': 'download',
    'fa-download': 'download',
    'fa-image': 'image',
    'fa-camera': 'camera',
    'fa-stop': 'square',
    'fa-folder-open': 'folder-open',
    'fa-location-dot': 'map-pin',
    'fa-wave-square': 'activity',
    'fa-clock': 'clock',
    'fa-clock-rotate-left': 'clock',
    'fa-calendar': 'calendar',
    'fa-calendar-days': 'calendar-days',
    'fa-calendar-plus': 'calendar-plus',
    'fa-calendar-minus': 'calendar-minus',
    'fa-calendar-xmark': 'calendar-x',
    'fa-calendar-grid': 'calendar-days',
    'fa-calendar-arrow-down': 'download',
    'fa-list-ul': 'list',
    'fa-star': 'star',
    'fa-laptop-code': 'laptop',
    'fa-google': 'calendar-plus'
  };

  /**
   * Converts kebab-case to PascalCase (e.g. 'check-circle-2' -> 'CheckCircle2')
   */
  function toPascalCase(str) {
    if (!str) return '';
    return str
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  // =============================================================================
  // 4. LUCIDE SVG BUILDER & CONVERSION LOGIC
  // =============================================================================

  /**
   * Generates a Lucide SVG string directly
   * @param {string} iconName Kebab-case icon name (e.g. 'check-circle-2')
   * @param {string} classNames Additional CSS classes
   * @param {object} attrs Additional attributes
   * @returns {string} SVG markup
   */
  function getLucideSvg(iconName, classNames = '', attrs = {}) {
    if (!window.lucide) {
      // Fallback element if lucide script is still pending
      const extraAttrs = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
      return `<i data-lucide="${iconName}" class="${classNames}" ${extraAttrs}></i>`;
    }

    const pascal = toPascalCase(iconName);
    const iconDef = (window.lucide.icons && window.lucide.icons[pascal]) || window.lucide[pascal];

    if (iconDef && typeof window.lucide.createElement === 'function') {
      const mergedAttrs = {
        class: `lucide lucide-${iconName} ${classNames}`.trim(),
        ...attrs
      };
      const svgEl = window.lucide.createElement(iconDef, mergedAttrs);
      return svgEl.outerHTML;
    }

    return `<i data-lucide="${iconName}" class="${classNames}"></i>`;
  }

  /**
   * Replaces an element or updates its icon to a Lucide icon
   * @param {HTMLElement} element
   * @param {string} iconName
   * @param {string} classNames
   */
  function updateIcon(element, iconName, classNames = '') {
    if (!element) return;
    const existingId = element.id || '';
    const svgHtml = getLucideSvg(iconName, classNames, existingId ? { id: existingId } : {});

    if (element.tagName.toLowerCase() === 'svg' && element.classList.contains('lucide')) {
      const temp = document.createElement('div');
      temp.innerHTML = svgHtml;
      const newSvg = temp.firstElementChild;
      if (newSvg && element.parentNode) {
        element.parentNode.replaceChild(newSvg, element);
      }
    } else {
      element.outerHTML = svgHtml;
    }
  }

  /**
   * Converts any legacy FontAwesome classes to Lucide icons
   * @param {HTMLElement|Document} root
   */
  function convertFaToLucide(root = document) {
    if (!root || !root.querySelectorAll) return;

    const faElements = root.querySelectorAll('i[class*="fa-"], span[class*="fa-"]');
    faElements.forEach(el => {
      // If element already has data-lucide or is already an svg, skip
      if (el.hasAttribute('data-lucide') || el.tagName.toLowerCase() === 'svg') return;

      const classes = Array.from(el.classList);
      let matchedLucide = null;

      for (const cls of classes) {
        if (FA_TO_LUCIDE_MAP[cls]) {
          matchedLucide = FA_TO_LUCIDE_MAP[cls];
          break;
        }
      }

      if (matchedLucide) {
        // Clean out FontAwesome classes while preserving sizing, color, margin, and animation
        const isSpin = classes.includes('fa-spin');
        const remainingClasses = classes
          .filter(c => !c.startsWith('fa-') && c !== 'fas' && c !== 'far' && c !== 'fab')
          .join(' ');

        const finalClass = (remainingClasses + (isSpin ? ' animate-spin' : '')).trim();
        el.className = finalClass;
        el.setAttribute('data-lucide', matchedLucide);
      }
    });
  }

  /**
   * Renders all Lucide icons under root
   * @param {HTMLElement|Document} root
   */
  function renderLucideIcons(root = document) {
    if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
    convertFaToLucide(root);
    try {
      window.lucide.createIcons({
        root: root === document ? document.body : root
      });
    } catch (e) {
      console.warn('Lucide icon rendering warning:', e);
    }
  }

  // =============================================================================
  // 5. AUTOMATIC MUTATION OBSERVER FOR DYNAMICALLY INSERTED ICONS
  // =============================================================================
  let renderScheduled = false;

  function scheduleIconRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderLucideIcons(document.body);
    });
  }

  function initObserver() {
    if (!window.MutationObserver || !document.body) return;

    const observer = new MutationObserver((mutations) => {
      let needsRender = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // ELEMENT_NODE
              if (
                node.hasAttribute?.('data-lucide') ||
                node.className?.includes?.('fa-') ||
                node.querySelector?.('[data-lucide]:not(svg), [class*="fa-"]')
              ) {
                needsRender = true;
                break;
              }
            }
          }
        }
        if (needsRender) break;
      }

      if (needsRender) {
        scheduleIconRender();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // =============================================================================
  // 6. INITIALIZATION & GLOBAL EXPOSURE
  // =============================================================================
  function init() {
    renderLucideIcons(document);
    initObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Window Attachments
  window.getUserAvatarUrl = getUserAvatarUrl;
  window.getAvatarImageHtml = getAvatarImageHtml;
  window.updateAvatarElement = updateAvatarElement;
  window.getLucideSvg = getLucideSvg;
  window.updateIcon = updateIcon;
  window.convertFaToLucide = convertFaToLucide;
  window.renderLucideIcons = renderLucideIcons;

})(window, document);
