// Coste de un viaje en coche: ruta con Nominatim + OSRM y precio medio por provincia (precios.json).
var PRECIOS = null, minutos = 0, nombres = '';
function $(id) { return document.getElementById(id); }
function eur(x, d) { return x.toLocaleString('es-ES', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + ' €'; }

function lugar(q) {
  return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=' + encodeURIComponent(q))
    .then(function (r) { return r.json(); })
    .then(function (j) { if (!j.length) throw new Error('No encuentro "' + q + '"'); return j[0]; });
}

function ruta(e) {
  e.preventDefault();
  var o = $('origen').value.trim(), d = $('destino').value.trim();
  if (!o || !d) return;
  $('estado').textContent = 'Buscando la ruta…';
  $('bCalcular').disabled = true;
  lugar(o).then(function (a) {
    return lugar(d).then(function (b) {
      return fetch('https://router.project-osrm.org/route/v1/driving/' + a.lon + ',' + a.lat + ';' + b.lon + ',' + b.lat + '?overview=false')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.routes || !j.routes.length) throw new Error('No hay ruta en coche entre esos dos sitios');
          $('km').value = Math.round(j.routes[0].distance / 1000);
          minutos = j.routes[0].duration / 60;
          nombres = o + ' a ' + d;
          $('estado').textContent = 'Ruta de ' + a.display_name.split(',')[0] + ' a ' + b.display_name.split(',')[0] + '.';
          calcular();
        });
    });
  }).catch(function (err) {
    $('estado').textContent = (err.message || 'No se ha podido calcular la ruta') + '. Puedes escribir los kilómetros a mano.';
  }).then(function () { $('bCalcular').disabled = false; });
}

function precioSeleccionado() {
  if (!PRECIOS) return null;
  var p = $('provincia').value ? PRECIOS.provincias[$('provincia').value] : PRECIOS.espana;
  return p && p[$('tipo').value];
}

function calcular() {
  var km = (+$('km').value || 0) * ($('vuelta').checked ? 2 : 1);
  var litros = km * (+$('consumo').value || 0) / 100;
  var precio = +$('precioL').value || 0;
  var total = litros * precio + (+$('peajes').value || 0);
  var personas = Math.max(1, +$('personas').value || 1);
  $('total').textContent = eur(total);
  $('porPersona').textContent = personas > 1 ? eur(total / personas) + ' por persona' : '';
  $('dist').textContent = Math.round(km).toLocaleString('es-ES') + ' km';
  var t = minutos * ($('vuelta').checked ? 2 : 1);
  $('tiempo').textContent = minutos ? Math.floor(t / 60) + ' h ' + Math.round(t % 60) + ' min al volante' : '';
  $('litros').textContent = litros.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  $('cien').textContent = eur((+$('consumo').value || 0) * precio);
}

function compartir() {
  var txt = '🚗 El viaje' + (nombres ? ' de ' + nombres : '') + ' sale por ' + $('total').textContent +
    ($('porPersona').textContent ? ', ' + $('porPersona').textContent : '') + '\n' + location.href;
  if (navigator.share) navigator.share({ text: txt }).catch(function () {});
  else navigator.clipboard.writeText(txt).then(function () { $('compartir').textContent = 'Copiado'; });
}

$('form').addEventListener('submit', ruta);
['km', 'consumo', 'precioL', 'personas', 'peajes', 'vuelta'].forEach(function (id) { $(id).addEventListener('input', calcular); });
['tipo', 'provincia'].forEach(function (id) {
  $(id).addEventListener('change', function () { var p = precioSeleccionado(); if (p) $('precioL').value = p; calcular(); });
});
$('compartir').addEventListener('click', compartir);

fetch('precios.json').then(function (r) { return r.json(); }).then(function (d) {
  PRECIOS = d;
  Object.keys(d.provincias).forEach(function (n) { var o = document.createElement('option'); o.value = o.textContent = n; $('provincia').appendChild(o); });
  $('precioL').value = precioSeleccionado();
  $('fechaPrecios').textContent = 'Precios del ' + d.fecha + '. Media de España: gasolina 95 a ' + eur(d.espana.g95, 3) + ' y diésel a ' + eur(d.espana.diesel, 3) + ' el litro.';
  calcular();
}).catch(calcular);
