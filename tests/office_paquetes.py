"""Synthetic Office Open XML packages for tests: fictional, minimal, built in memory."""

from __future__ import annotations

import io
import zipfile

_CT = "http://schemas.openxmlformats.org/package/2006/content-types"
_RELS = "http://schemas.openxmlformats.org/package/2006/relationships"
OFFICE_DOCUMENT = ("http://schemas.openxmlformats.org/officeDocument/2006/"
                   "relationships/officeDocument")
DOCX_MAIN = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
XLSX_MAIN = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
DOCM_MAIN = "application/vnd.ms-word.document.macroEnabled.main+xml"
XLSM_MAIN = "application/vnd.ms-excel.sheet.macroEnabled.main+xml"


def content_types(part: str, main_type: str) -> bytes:
    return (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'<Types xmlns="{_CT}">'
            f'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.'
            f'relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
            f'<Override PartName="/{part}" ContentType="{main_type}"/></Types>').encode()


def rels(target: str) -> bytes:
    return (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'<Relationships xmlns="{_RELS}">'
            f'<Relationship Id="rId1" Type="{OFFICE_DOCUMENT}" Target="{target}"/>'
            f'</Relationships>').encode()


def paquete(miembros: dict[str, bytes]) -> bytes:
    salida = io.BytesIO()
    with zipfile.ZipFile(salida, "w", zipfile.ZIP_DEFLATED) as zf:
        for nombre, datos in miembros.items():
            zf.writestr(nombre, datos)
    return salida.getvalue()


def docx(texto: str = "Documento ficticio", **cambios: bytes) -> bytes:
    miembros = {
        "[Content_Types].xml": content_types("word/document.xml", DOCX_MAIN),
        "_rels/.rels": rels("word/document.xml"),
        "word/document.xml": (
            '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.'
            'openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'
            f'{texto}</w:t></w:r></w:p></w:body></w:document>').encode(),
    }
    miembros.update(cambios)
    return paquete(miembros)


def xlsx(**cambios: bytes) -> bytes:
    miembros = {
        "[Content_Types].xml": content_types("xl/workbook.xml", XLSX_MAIN),
        "_rels/.rels": rels("/xl/workbook.xml"),
        "xl/workbook.xml": (
            b'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.'
            b'openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>'),
    }
    miembros.update(cambios)
    return paquete(miembros)


def zip_cualquiera() -> bytes:
    """A plain ZIP with an unrelated member: what a renamed archive looks like."""
    return paquete({"notas.txt": b"Contenido ficticio."})
