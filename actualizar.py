"""Genera precios.json: precio medio de gasolina 95 y diésel por provincia (Ministerio de Industria).

Uso: python actualizar.py [ruta/estaciones.json]. Si la descarga falla, no toca precios.json.
"""
import json, sys, os, urllib.request, statistics

URL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/"


def num(s):
    s = (s or "").replace(",", ".").strip()
    return float(s) if s else None


def main():
    if len(sys.argv) > 1:
        datos = json.load(open(sys.argv[1], encoding="utf-8-sig"))
    else:
        req = urllib.request.Request(URL, headers={"Accept": "application/json"})
        datos = json.loads(urllib.request.urlopen(req, timeout=180).read().decode("utf-8-sig"))
    prov = {}
    for e in datos["ListaEESSPrecio"]:
        p = prov.setdefault(e["Provincia"].title(), {"g95": [], "diesel": []})
        for clave, campo in (("g95", "Precio Gasolina 95 E5"), ("diesel", "Precio Gasoleo A")):
            v = num(e.get(campo))
            if v:
                p[clave].append(v)
    salida = {"fecha": datos["Fecha"][:10], "provincias": {}}
    todos = {"g95": [], "diesel": []}
    for nombre, p in sorted(prov.items()):
        salida["provincias"][nombre] = {k: round(statistics.mean(v), 3) for k, v in p.items() if v}
        for k in todos:
            todos[k] += p[k]
    salida["espana"] = {k: round(statistics.mean(v), 3) for k, v in todos.items()}
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "precios.json"), "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))
    print(salida["fecha"], salida["espana"], len(salida["provincias"]))


if __name__ == "__main__":
    main()
