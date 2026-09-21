function _normalizarBusqueda(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita tildes para que "tazon" encuentre "tazon" (con o sin acento)
}

// Construye un matcher(texto) a partir de una consulta estilo SQL:
// "&" combina terminos (todos deben cumplirse), "%" y "*" son comodines
// (cero o mas caracteres), igual que LIKE. Sin comodines, se busca como
// substring normal (equivalente a "%termino%").
function _construirMatcherBusqueda(qNormalizada) {
  const partes = qNormalizada.split("&").map((p) => p.trim()).filter((p) => p.length > 0);
  if (partes.length === 0) return null;

  const matchers = partes.map((parte) => {
    if (parte.includes("%") || parte.includes("*")) {
      const escapado = parte.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      const patron = escapado.replace(/[%*]/g, ".*");
      try {
        const re = new RegExp(patron);
        return (texto) => re.test(texto);
      } catch (e) {
        return (texto) => texto.includes(parte);
      }
    }
    return (texto) => texto.includes(parte);
  });

  return (texto) => matchers.every((m) => m(texto));
}

function initTablaFiltrable(rowsSelector) {
  const buscar = document.getElementById("f-buscar");
  const proveedor = document.getElementById("f-proveedor");
  const categoria = document.getElementById("f-categoria");
  const stock = document.getElementById("f-stock");
  const contador = document.getElementById("f-contador");
  const filas = Array.from(document.querySelectorAll(rowsSelector));
  filas.forEach((fila) => {
    fila.dataset.buscarNorm = _normalizarBusqueda(fila.dataset.buscar);
  });

  function aplicar() {
    const q = _normalizarBusqueda(buscar.value).trim();
    const matcherQ = q ? _construirMatcherBusqueda(q) : null;
    const prov = proveedor ? proveedor.value : "";
    const cat = categoria.value;
    const st = stock.value;
    let visibles = 0;
    filas.forEach((fila) => {
      const texto = fila.dataset.buscarNorm || "";
      const matchQ = !matcherQ || matcherQ(texto);
      const matchProv = !prov || fila.dataset.proveedor === prov;
      const matchCat = !cat || fila.dataset.categoria === cat;
      const matchStock = !st || fila.dataset.stock === st;
      const mostrar = matchQ && matchProv && matchCat && matchStock;
      fila.style.display = mostrar ? "" : "none";
      if (mostrar) visibles++;
    });
    if (contador) contador.textContent = visibles + " de " + filas.length + " productos";
  }

  [buscar, proveedor, categoria, stock].forEach((el) => el && el.addEventListener("input", aplicar));
  aplicar();
}

function initTablaOrdenable(theadSelector, tbodySelector) {
  const thead = document.querySelector(theadSelector);
  const tbody = document.querySelector(tbodySelector);
  if (!thead || !tbody) return;
  const ths = Array.from(thead.querySelectorAll("th[data-key]"));
  let ordenActual = null;

  function valorCelda(fila, indice, tipo) {
    const celda = fila.children[indice];
    if (!celda) return null;
    const raw = celda.dataset.sort !== undefined ? celda.dataset.sort : celda.textContent;
    const texto = raw.trim();
    if (tipo === "numero") {
      if (texto === "") return null;
      const n = parseFloat(texto);
      return isNaN(n) ? null : n;
    }
    return texto === "" ? null : texto.toLowerCase();
  }

  ths.forEach((th, indice) => {
    th.classList.add("th-ordenable");
    th.addEventListener("click", () => {
      const tipo = th.dataset.tipo || "texto";
      const asc = !(ordenActual && ordenActual.indice === indice && ordenActual.asc);
      ordenActual = { indice, asc };
      ths.forEach((h) => h.classList.remove("orden-asc", "orden-desc"));
      th.classList.add(asc ? "orden-asc" : "orden-desc");

      const filas = Array.from(tbody.querySelectorAll("tr"));
      filas.sort((a, b) => {
        const va = valorCelda(a, indice, tipo);
        const vb = valorCelda(b, indice, tipo);
        // sin valor siempre al final, sin importar la direccion
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        if (tipo === "numero") return asc ? va - vb : vb - va;
        return asc ? va.localeCompare(vb, "es") : vb.localeCompare(va, "es");
      });
      filas.forEach((fila) => tbody.appendChild(fila));
    });
  });
}
