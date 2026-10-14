"""Arma cada master prompt juntando su parte propia con las funciones comunes.
Uso: python3 propuestas-ui/prompts/build.py"""
from pathlib import Path

here = Path(__file__).parent
funciones = (here / "partes" / "funciones.md").read_text().strip()
salidas = {"p1.md": "master-prompt-1-mando.md", "p2.md": "master-prompt-2-pauta.md", "p3.md": "master-prompt-3-foco.md"}
for fuente, destino in salidas.items():
    src = here / "partes" / fuente
    if src.exists():
        (here / destino).write_text(src.read_text().replace("{{FUNCIONES}}", funciones))
        print(destino)
