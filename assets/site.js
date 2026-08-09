/* Executive Reset — genau zwei Bewegungen und ein Formular. Sonst nichts.
   Kein Tracker, kein Cookie, keine externe Abhängigkeit. */
(function () {
  'use strict';

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  if (calm || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(items, function (el) { el.classList.add('in'); });
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
  }

  /* 3 · Bewerbungsformular
     Versand über den Lechcode-Worker (Route /contact, Schema unverändert —
     der Worker bedient auch andere Kunden, deshalb wandern die Zusatzfelder
     in den message-Block statt in eigene Keys).

     SCHARF bleibt false, solange Postfach und Domain nicht feststehen.
     Dann wird nichts gesendet und nichts gespeichert, und der Leser erfährt
     das auch — lieber ein ehrlicher Hinweis als eine Bewerbung ins Leere.
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
      'Unternehmen und Rolle: ' + (val('rolle') || '—'),
      'Telefon: ' + (val('tel') || '—'),
      '',
      'Worum es gerade geht:',
      val('thema') || '(keine Angabe)'
    ].join('\n');

    if (!SCHARF) {
      say('Dieses Formular ist im Entwurf noch nicht scharf geschaltet — es wird nichts gesendet und nichts gespeichert. Sobald Postfach und Domain stehen, landet deine Bewerbung direkt bei Alexander.');
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
        thema: 'Bewerbung Executive Reset',
        message: text
      })
    }).then(function (r) {
      return r.json();
    }).then(function (d) {
      if (d && d.ok) {
        form.reset();
        say('Deine Bewerbung liegt bei Alexander. Er liest sie selbst. Bis dahin musst du nichts tun.');
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
