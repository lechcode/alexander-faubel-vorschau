/* Leading Legends — wenige Bewegungen und ein Formular. Sonst nichts.
   Kein Tracker, kein Cookie, keine externe Abhängigkeit. */
(function () {
  'use strict';

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hatIO = 'IntersectionObserver' in window;
  if (!hatIO) document.documentElement.classList.add('no-io');

  /* 1 · Haarlinie unter der Kopfzeile ab 12 px Scroll */
  var head = document.querySelector('.head');
  if (head) {
    var onScroll = function () {
      head.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* 1b · Handy-Menue: Knopf auf/zu, schliesst bei Klick auf ein Ziel,
     ausserhalb (Schleier = ::after der Kopfzeile) oder mit Esc. Das
     hidden-Attribut haelt den Zustand fuer Screenreader, das CSS animiert. */
  var menuBtn = document.querySelector('[data-menu-btn]');
  var menu = document.querySelector('[data-menu]');
  if (menuBtn && menu && head) {
    var label = menuBtn.querySelector('[data-menu-label]');
    var setMenu = function (offen) {
      menuBtn.setAttribute('aria-expanded', offen ? 'true' : 'false');
      if (label) label.textContent = offen ? 'Menü schließen' : 'Menü öffnen';
      head.classList.toggle('menu-open', offen);
      if (offen) {
        menu.hidden = false;
        requestAnimationFrame(function () { menu.classList.add('is-open'); });
      } else {
        menu.classList.remove('is-open');
        setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 320);
      }
    };
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('click', function (e) {
      /* Der Schleier ist ein ::after der Kopfzeile — ein Klick darauf trifft .head selbst.
         Offen bleibt das Menue nur bei Klicks auf den Knopf oder in die Liste. */
      if (menuBtn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.menu-btn') && !e.target.closest('.menu')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
    /* Wird das Fenster breit, verschwindet das Menue ohnehin — Zustand zuruecksetzen */
    window.matchMedia('(min-width:901px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* 2 · Fade-up beim Scrollen, gestaffelt um 70 ms, jedes Element genau einmal */
  var items = document.querySelectorAll('[data-reveal]');
  var alleZeigen = function () {
    Array.prototype.forEach.call(items, function (el) { el.classList.add('in'); });
  };

  if (calm || !hatIO) {
    alleZeigen();
  } else {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--d', (n++ * 70) + 'ms');
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });

    /* Notbremse: Wenn der Observer nach 2,5 s nichts gemeldet hat — weil die
       Umgebung ihn nicht bedient, weil die Seite in einem nicht gezeichneten
       Tab liegt, weil ein Reader sie umbaut —, wird alles sichtbar gemacht.
       Lieber ohne Animation als unsichtbar. */
    setTimeout(function () {
      if (!document.querySelector('[data-reveal].in')) {
        alleZeigen();
        /* Dann bedient die Umgebung auch den Spiegel-Observer nicht —
           alle Saetze hell, sonst blieben sie grau. */
        document.documentElement.classList.add('no-io');
      }
    }, 2500);
  }

  /* 3 · Der Spiegel: der Satz in der Bildschirmmitte ist hell, die anderen
     zurueckgenommen. Ein schmales Band um die Mitte — ein Satz nach dem
     anderen, wie Alexander es wollte. Ohne Observer (oder bei reduzierter
     Bewegung) sind alle Saetze hell, das regelt das CSS. */
  var spiegel = document.querySelector('[data-mirror]');
  if (spiegel && hatIO && !calm) {
    var saetze = spiegel.querySelectorAll('p');
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle('now', e.isIntersecting);
      });
    }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
    Array.prototype.forEach.call(saetze, function (p) { mio.observe(p); });

    /* Aufklappen (wirkt nur auf Handy/Tablet, das CSS regelt die Breite):
       ein Satz oeffnet sich, sobald er ueber das untere Fuenftel des
       Bildschirms steigt, und schliesst sich wieder, wenn man zurueckscrollt
       und er darunter verschwindet. Saetze, die schon oben aus dem Bild
       gescrollt sind, bleiben offen — sonst klappten sie beim Hochscrollen
       von oben her ein zweites Mal auf. */
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle('open', e.isIntersecting || e.boundingClientRect.top < 0);
      });
    }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });
    Array.prototype.forEach.call(saetze, function (p) { fio.observe(p); });
  }

  /* 4 · Video-Vorschaubilder erst holen, wenn die Stimmen naeherkommen.
     Ein poster-Attribut wird sofort geladen, auch bei preload="none".
     Ohne IntersectionObserver werden sie gleich gesetzt; die Flaeche ist
     ueber aspect-ratio ohnehin reserviert, es springt nichts. */
  var stimmen = document.querySelectorAll('video[data-poster]');
  if (stimmen.length) {
    var posterSetzen = function (v) {
      if (v.getAttribute('data-poster')) {
        v.setAttribute('poster', v.getAttribute('data-poster'));
        v.removeAttribute('data-poster');
      }
    };
    if (!hatIO) {
      Array.prototype.forEach.call(stimmen, posterSetzen);
    } else {
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          posterSetzen(e.target);
          pio.unobserve(e.target);
        });
      }, { rootMargin: '400px 0px' });
      Array.prototype.forEach.call(stimmen, function (v) { pio.observe(v); });
      /* Notbremse: nach 3 s werden die Bilder auf jeden Fall gesetzt. */
      setTimeout(function () {
        Array.prototype.forEach.call(stimmen, posterSetzen);
      }, 3000);
    }
    /* Spielt eines, halten die anderen an — vier Stimmen gleichzeitig
       waeren keine Begegnung. */
    Array.prototype.forEach.call(stimmen, function (v) {
      v.addEventListener('play', function () {
        Array.prototype.forEach.call(stimmen, function (o) { if (o !== v && !o.paused) o.pause(); });
      });
    });
    /* Eigene Abspielmarke: erst beim Klick bekommt das Video seine
       Browser-Leiste und startet. Faellt JavaScript aus, bleibt die Marke
       ein stummer Knopf — deshalb setzt der Notfallpfad unten controls. */
    Array.prototype.forEach.call(document.querySelectorAll('.voice-frame'), function (frame) {
      var v = frame.querySelector('video');
      var b = frame.querySelector('.play');
      if (!v || !b) return;
      b.addEventListener('click', function () {
        posterSetzen(v);
        v.setAttribute('controls', '');
        frame.classList.add('is-playing');
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll('.voice-frame video'), function (v) { v.setAttribute('controls', ''); });
  }

  /* 5 · Fragen: immer nur eine offen. Native <details>, kein Eigenbau. */
  var fragen = document.querySelectorAll('.faq-list details');
  Array.prototype.forEach.call(fragen, function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      Array.prototype.forEach.call(fragen, function (o) { if (o !== d) o.open = false; });
    });
  });

  /* 5b · Location-Slider
     Gewischt wird nativ (scroll-snap). Hier nur: Pfeile, Zaehler, Linie und
     das Weiterlaufen — alle 5 s ein Bild, am Ende zurueck zum ersten. Es
     laeuft nur, solange der Slider im Bild ist, die Maus nicht darauf liegt
     und er keinen Fokus hat; nach jedem Wischen oder Klick 8 s Ruhe.
     Bei reduzierter Bewegung laeuft nichts von selbst. */
  var slider = document.querySelector('[data-slider]');
  if (slider) {
    var spur = slider.querySelector('.slider-track');
    var bilder = spur.children;
    var anzahl = bilder.length;
    var fill = slider.querySelector('.slider-fill');
    var jetzt = 0;
    var ruheBis = 0;
    var imBild = !hatIO;
    var maus = false;
    var fokus = false;

    var schritt = function () {
      return anzahl > 1 ? bilder[1].offsetLeft - bilder[0].offsetLeft : spur.clientWidth;
    };
    /* Keine Zahlen (Michi, 28.09.) — nur die Goldlinie zeigt den Fortschritt */
    var setze = function (i) {
      jetzt = i;
      fill.style.width = ((i + 1) / anzahl * 100) + '%';
    };
    /* Auf dem Desktop stehen mehrere Bilder nebeneinander: dann erreicht die
       Spur ihr Ende, bevor das letzte Bild an der linken Kante steht. „Am
       Ende“ zaehlt deshalb als letztes Bild, und „weiter“ springt von dort
       zurueck zum ersten. */
    var amEnde = function () {
      return spur.scrollLeft >= spur.scrollWidth - spur.clientWidth - 2;
    };
    var zeigen = function (i) {
      i = (i + anzahl) % anzahl;
      setze(i);
      spur.scrollTo({ left: i * schritt(), behavior: calm ? 'auto' : 'smooth' });
    };
    var weiter = function () { zeigen(amEnde() ? 0 : jetzt + 1); };
    /* Beim Wischen: das Bild, das gerade am naechsten an der Kante steht */
    var stand = function () {
      setze(amEnde() ? anzahl - 1 : Math.max(0, Math.min(anzahl - 1, Math.round(spur.scrollLeft / schritt()))));
    };
    var warte = null;
    spur.addEventListener('scroll', function () {
      if (warte) return;
      warte = requestAnimationFrame(function () { warte = null; stand(); });
    }, { passive: true });
    var ruhe = function () { ruheBis = Date.now() + 8000; };
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (t) {
      spur.addEventListener(t, ruhe, { passive: true });
    });
    slider.querySelector('[data-prev]').addEventListener('click', function () { ruhe(); zeigen(jetzt - 1); });
    slider.querySelector('[data-next]').addEventListener('click', function () { ruhe(); weiter(); });
    slider.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') maus = true; });
    slider.addEventListener('pointerleave', function () { maus = false; });
    slider.addEventListener('focusin', function (e) { fokus = e.target.matches(':focus-visible'); });
    slider.addEventListener('focusout', function () { fokus = false; });
    if (hatIO) {
      new IntersectionObserver(function (entries) {
        imBild = entries[0].isIntersecting;
        if (imBild) ruheBis = Math.max(ruheBis, Date.now() + 2500);
      }, { threshold: 0.4 }).observe(spur);
    }
    stand();
    if (!calm && anzahl > 1) {
      setInterval(function () {
        if (!imBild || maus || fokus || document.hidden || Date.now() < ruheBis) return;
        weiter();
        ruheBis = Date.now() + 5000;
      }, 500);
    }
  }

  /* 6 · (Formular seit 30.09. gestrichen — Interesse laeuft ueber einen Calendly-Link) */
})();
