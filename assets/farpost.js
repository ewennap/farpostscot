(function() {
  var ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd';
  var SANITY_PROJECT_ID = 't11tx9if';
  var SANITY_DATASET = 'production';

  function resolveElement(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target;
  }

  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initials(name, fallback) {
    if (!name) return fallback || 'FP';
    var parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return fallback || 'FP';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(value, options) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', options || {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function categoryLabel(category) {
    return ({
      opinion: 'Opinion',
      analysis: 'Analysis',
      news: 'News',
      interview: 'Interview',
      feature: 'Feature'
    }[category] || 'Article');
  }

  function sanityImageUrl(ref) {
    if (!ref) return null;
    var parts = String(ref).replace('image-', '').split('-');
    var ext = parts.pop();
    var id = parts.join('-');
    return 'https://cdn.sanity.io/images/' + SANITY_PROJECT_ID + '/' + SANITY_DATASET + '/' + id + '.' + ext;
  }

  function readTime(blocks) {
    if (!Array.isArray(blocks) || !blocks.length) return '';
    var words = blocks
      .flatMap(function(block) { return (block && block.children) || []; })
      .map(function(child) { return child && child.text ? child.text : ''; })
      .join(' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    if (!words) return '';
    return Math.max(1, Math.round(words / 200)) + ' min read';
  }

  function storyCardMarkup(post, options) {
    var config = options || {};
    var classes = {
      card: config.cardClass || 'news-card',
      image: config.imageClass || 'news-card-image',
      placeholder: config.placeholderClass || 'news-card-image-placeholder',
      body: config.bodyClass || 'news-card-body',
      label: config.labelClass || 'news-label',
      title: config.titleClass || 'news-headline',
      excerpt: config.excerptClass || 'news-excerpt',
      author: config.authorClass || 'news-author',
      avatar: config.avatarClass || 'author-avatar',
      name: config.nameClass || 'author-name'
    };

    var href = config.href || ('article.html?id=' + encodeURIComponent(post._id || ''));
    var imgRef = post && post.mainImage && post.mainImage.asset ? post.mainImage.asset._ref : null;
    var imgUrl = imgRef ? sanityImageUrl(imgRef) : null;
    var imageParams = config.imageParams || '?w=600&h=400&fit=crop&auto=format';
    var showExcerpt = config.showExcerpt !== false;
    var showMeta = config.showMeta !== false;
    var excerpt = showExcerpt && post && post.excerpt ? '<p class="' + classes.excerpt + '">' + escHtml(post.excerpt) + '</p>' : '';
    var date = formatDate(post && post.publishedAt);
    var extraMeta = config.metaSuffix ? ' · ' + escHtml(config.metaSuffix) : '';
    var metaHtml = showMeta
      ? '<div class="' + classes.author + '">'
        + '<div class="' + classes.avatar + '">' + escHtml(initials(post && post.author, 'FP')) + '</div>'
        + '<div class="' + classes.name + '">' + escHtml((post && post.author) || 'Far Post') + (date ? ' · ' + escHtml(date) : '') + extraMeta + '</div>'
        + '</div>'
      : '';

    return '<a class="' + classes.card + '" href="' + href + '">'
      + (imgUrl
        ? '<img class="' + classes.image + '" src="' + escHtml(imgUrl + imageParams) + '" alt="' + escHtml((post && post.title) || '') + '" loading="lazy" data-fallback="hide">'
        : '<div class="' + classes.placeholder + '"></div>')
      + '<div class="' + classes.body + '">'
      + '<div class="' + classes.label + '">' + escHtml(categoryLabel(post && post.category)) + '</div>'
      + '<div class="' + classes.title + '">' + escHtml((post && post.title) || 'Untitled') + '</div>'
      + excerpt
      + metaHtml
      + '</div>'
      + '</a>';
  }

  function formatDuration(raw) {
    if (!raw) return '';
    var total;
    if (String(raw).indexOf(':') !== -1) {
      var parts = String(raw).split(':').map(Number);
      total = parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];
    } else {
      total = parseInt(raw, 10);
    }
    if (!total) return '';
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    return h > 0 ? h + 'h ' + m + 'm' : m + ' min';
  }

  function getItunesImage(el) {
    if (!el || !el.children) return '';
    for (var i = 0; i < el.children.length; i += 1) {
      var child = el.children[i];
      if (child.localName === 'image' && child.namespaceURI === ITUNES_NS) {
        return child.getAttribute('href') || '';
      }
    }
    return '';
  }

  function podcastPlayMarkup() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e84040" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="#e84040" stroke="none"/></svg>';
  }

  function podcastArtFrame(url, alt) {
    if (!url) {
      return '<div class="pod-art pod-art--fallback">' + podcastPlayMarkup() + '</div>';
    }
    return '<div class="pod-art"><img src="' + escHtml(url) + '" alt="' + escHtml(alt || '') + '" loading="lazy" data-fallback="podcast-art"></div>';
  }

  function stateMarkup(type, options) {
    var config = options || {};
    var classes = ['fp-state', 'fp-state--' + type];
    if (config.compact) classes.push('fp-state--compact');
    if (config.fullSpan) classes.push('fp-state--full-span');
    if (config.className) classes.push(config.className);

    var eyebrow = config.eyebrow
      ? '<div class="fp-state__eyebrow">' + escHtml(config.eyebrow) + '</div>'
      : '';
    var title = config.title
      ? '<div class="fp-state__title">' + escHtml(config.title) + '</div>'
      : '';
    var copy = config.message
      ? '<div class="fp-state__copy">' + escHtml(config.message) + '</div>'
      : '';
    var content = '';

    if (type === 'loading') {
      content = '<div class="fp-loading-dots" aria-hidden="true"><span></span><span></span><span></span></div>';
    }

    return '<div class="' + classes.join(' ') + '">' + content + eyebrow + title + copy + '</div>';
  }

  function bindImageFallbacks(scope) {
    var root = scope || document;
    root.querySelectorAll('img[data-fallback]').forEach(function(img) {
      if (img.dataset.fpBound === 'true') return;
      img.dataset.fpBound = 'true';
      img.addEventListener('error', function() {
        var mode = img.dataset.fallback || 'hide';
        if (mode === 'podcast-art') {
          var frame = img.closest('.pod-art');
          if (frame) {
            frame.classList.add('pod-art--fallback');
            frame.innerHTML = podcastPlayMarkup();
          }
          return;
        }
        if (mode === 'remove') {
          img.remove();
          return;
        }
        img.style.display = 'none';
      }, { once: true });
    });
  }

  function setHTML(target, html) {
    var element = resolveElement(target);
    if (!element) return;
    element.innerHTML = html;
    bindImageFallbacks(element);
  }

  function renderState(target, type, options) {
    setHTML(target, stateMarkup(type, options));
  }

  async function fetchJson(url, options) {
    var config = options || {};
    var response = await fetch(url, config.fetchOptions);
    var payload;

    try {
      payload = await response.json();
    } catch (error) {
      if (!response.ok) {
        throw new Error(config.errorMessage || ('Request failed (' + response.status + ')'));
      }
      throw error;
    }

    if (!response.ok) {
      throw new Error(
        (payload && payload.error)
        || config.errorMessage
        || ('Request failed (' + response.status + ')')
      );
    }

    return payload;
  }

  function initNav() {
    var nav = document.querySelector('#main-nav, .nav');
    var mobileMenu = document.getElementById('mobile-menu') || document.getElementById('mobileMenu');
    var toggle = document.querySelector('[data-nav-toggle]');
    var threshold = nav && nav.dataset.navScroll ? parseInt(nav.dataset.navScroll, 10) : 24;

    if (nav) {
      var syncNav = function() {
        nav.classList.toggle('scrolled', window.scrollY > threshold);
      };
      syncNav();
      window.addEventListener('scroll', syncNav, { passive: true });
    }

    if (toggle && mobileMenu) {
      toggle.addEventListener('click', function() {
        mobileMenu.classList.toggle('open');
      });

      mobileMenu.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          mobileMenu.classList.remove('open');
        });
      });
    }

    var currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(function(link) {
      var href = link.getAttribute('href') || '';
      var targetPath = href.split('/').pop();
      if (targetPath && targetPath === currentPath) {
        link.classList.add('active');
      }
    });
  }

  function init() {
    initNav();
    bindImageFallbacks(document);
  }

  window.FarPost = {
    categoryLabel: categoryLabel,
    bindImageFallbacks: bindImageFallbacks,
    escHtml: escHtml,
    fetchJson: fetchJson,
    formatDate: formatDate,
    formatDuration: formatDuration,
    getItunesImage: getItunesImage,
    initials: initials,
    podcastArtFrame: podcastArtFrame,
    readTime: readTime,
    renderState: renderState,
    sanityImageUrl: sanityImageUrl,
    setHTML: setHTML,
    stateMarkup: stateMarkup,
    storyCardMarkup: storyCardMarkup
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
