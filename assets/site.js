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

  /* 6 · Interesse-Formular
     Versand über den Lechcode-Worker (Route /contact, Schema unverändert —
     der Worker bedient auch andere Kunden, deshalb wandern die Zusatzfelder
     in den message-Block statt in eigene Keys).

     SCHARF bleibt false, solange Postfach und Domain nicht feststehen.
     Dann wird nichts gesendet und nichts gespeichert, und der Leser erfährt
     das auch — lieber ein ehrlicher Hinweis als eine Nachricht ins Leere.
     Zum Scharfschalten: Postfach klären, Worker deployen, hier true setzen. */
  var SCHARF = false;
  var WORKER = 'https://lechcode-api.nameless-waterfall-55e5.workers.dev';
  var SITE   = 'alexander-faubel';

  var form = document.querySelector('form[data-apply]');
  if (!form) return;

  var msg = document.getElementById('form-msg');
  var btn = form.querySelector('button[type="submit"]');

  var say = function (text) {
    msg.textContent = text;
    msg.hidden = false;
    msg.focus();
  };
  var val = function (id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (document.getElementById('website').value) return; /* Honeypot */

    var text = [
      'Telefon: ' + (val('tel') || '—'),
      '',
      'Was er mitgeben möchte:',
      val('thema') || '(keine Angabe)'
    ].join('\n');

    if (!SCHARF) {
      say('Dieses Formular ist im Entwurf noch nicht scharf geschaltet — es wird nichts gesendet und nichts gespeichert. Sobald Postfach und Domain stehen, landet deine Nachricht direkt bei Alexander und Dorje.');
      return;
    }

    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Wird gesendet …';

    fetch(WORKER + '/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        site: SITE,
        name: val('name'),
        email: val('email'),
        thema: 'Interesse Leading Legends',
        message: text
      })
    }).then(function (r) {
      return r.json();
    }).then(function (d) {
      if (d && d.ok) {
        form.reset();
        say('Dein Interesse ist angekommen. Alexander und Dorje melden sich persönlich bei dir.');
        btn.textContent = 'Gesendet';
      } else {
        say((d && d.meldung) || 'Das ist gerade nicht durchgegangen. Schreib direkt — die Adresse steht im Impressum, dann geht nichts verloren.');
        btn.disabled = false;
        btn.textContent = label;
      }
    }).catch(function () {
      say('Das ist gerade nicht durchgegangen. Schreib direkt — die Adresse steht im Impressum, dann geht nichts verloren.');
      btn.disabled = false;
      btn.textContent = label;
    });
  });
})();
