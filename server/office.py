"""Bounded recognition of Office Open XML attachments: Word (.docx) and Excel (.xlsx).

ARA Map only stores and returns these files; nothing here converts, renders or
imports them. Recognition is structural, never by name or browser type:

- the bytes are a ZIP package whose central directory is walked with the same
  bounded check KMZ packages get (kmz.MAX_ENTRADAS members at most);
- ``[Content_Types].xml`` and ``_rels/.rels`` are each decompressed under a
  small cap and parsed with expat, refusing any DTD or entity declaration;
- the package relationship ``officeDocument`` must point at a member that
  exists and whose declared content type is exactly the Word document or the
  Excel workbook main part. Macro-enabled, template and legacy variants are
  refused, as is any package carrying a VBA project.

No other member is decompressed. Anything malformed, oversized or hostile is
an ``OfficeError`` with a plain-language Spanish message.
"""

from __future__ import annotations

import io
import posixpath
import struct
import xml.parsers.expat
import zipfile
import zlib

from .kmz import KmzError, es_paquete, revisar_directorio

TIPO_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
TIPOS = {"docx": TIPO_DOCX, "xlsx": TIPO_XLSX}
NOMBRES = {"docx": "Word (.docx)", "xlsx": "Excel (.xlsx)"}

# The one main-part content type each accepted format declares.
_PRINCIPAL = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": "xlsx",
}
_OFFICE_DOCUMENT = ("http://schemas.openxmlformats.org/officeDocument/2006/"
                    "relationships/officeDocument")
_CONTENT_TYPES = "[Content_Types].xml"
_RELS = "_rels/.rels"
MAX_PARTE_BYTES = 1024 * 1024       # each of the two small parts read, decompressed
_TROZO = 64 * 1024


class OfficeError(Exception):
    """The bytes are not an accepted Word or Excel package."""

    def __init__(self, mensaje: str) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje


def formato_office(datos: bytes) -> str:
    """'docx' or 'xlsx' when the bytes are that package, else OfficeError."""
    if not es_paquete(datos):
        raise OfficeError("El contenido no es un archivo de Office (no es un paquete comprimido).")
    try:
        revisar_directorio(datos)
        with zipfile.ZipFile(io.BytesIO(datos)) as zf:
            miembros = {m.filename: m for m in zf.infolist() if not m.is_dir()}
            if any(posixpath.basename(n).lower() == "vbaproject.bin" for n in miembros):
                raise OfficeError("Los archivos de Office con macros no se admiten.")
            tipos = _sobrescrituras(_leer(zf, miembros, _CONTENT_TYPES))
            principal = _parte_principal(_leer(zf, miembros, _RELS))
            if principal not in miembros:
                raise _no_office()
            formato = _PRINCIPAL.get(tipos.get(principal.lower(), ""))
            if formato is None:
                raise OfficeError("El archivo de Office no es un documento Word (.docx) "
                                  "ni un libro Excel (.xlsx) admitido.")
            return formato
    except OfficeError:
        raise
    except KmzError as exc:
        raise _no_office() from exc
    except (zipfile.BadZipFile, zipfile.LargeZipFile, zlib.error, EOFError, OSError,
            ValueError, struct.error, NotImplementedError, RuntimeError) as exc:
        raise _no_office() from exc


def _no_office() -> OfficeError:
    return OfficeError("El contenido no es un archivo de Office válido o está dañado.")


def _leer(zf: zipfile.ZipFile, miembros: dict[str, zipfile.ZipInfo], nombre: str) -> bytes:
    info = miembros.get(nombre)
    if info is None:
        raise _no_office()
    if info.flag_bits & 0x1:
        raise OfficeError("El archivo de Office está protegido con contraseña.")
    if info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED) \
            or info.file_size > MAX_PARTE_BYTES:
        raise _no_office()
    buf = bytearray()
    with zf.open(info) as fh:
        while True:
            trozo = fh.read(_TROZO)
            if not trozo:
                break
            buf.extend(trozo)
            if len(buf) > MAX_PARTE_BYTES:      # the declared size is not trusted
                raise _no_office()
    return bytes(buf)


def _elementos(xml_bytes: bytes, local: str) -> list[dict[str, str]]:
    """The attributes of every element named `local` (any namespace); no DTD allowed."""
    encontrados: list[dict[str, str]] = []

    def inicio(nombre: str, atributos: dict[str, str]) -> None:
        if nombre.rsplit("}", 1)[-1] == local:
            encontrados.append(atributos)

    def rechazar(*_args: object) -> None:
        raise _no_office()

    def rechazar_externa(_contexto: str, _base: str | None, _sistema: str | None,
                         _publico: str | None) -> int:
        raise _no_office()

    parser = xml.parsers.expat.ParserCreate(namespace_separator="}")
    parser.SetParamEntityParsing(xml.parsers.expat.XML_PARAM_ENTITY_PARSING_NEVER)
    parser.StartDoctypeDeclHandler = rechazar
    parser.EntityDeclHandler = rechazar
    parser.ExternalEntityRefHandler = rechazar_externa
    parser.StartElementHandler = inicio
    try:
        parser.Parse(xml_bytes, True)
    except (xml.parsers.expat.ExpatError, LookupError, ValueError) as exc:
        raise _no_office() from exc
    return encontrados


def _sobrescrituras(xml_bytes: bytes) -> dict[str, str]:
    """Part name (lower case, no leading slash) -> its declared content type."""
    return {a.get("PartName", "").lstrip("/").lower(): a.get("ContentType", "").strip()
            for a in _elementos(xml_bytes, "Override")}


def _parte_principal(xml_bytes: bytes) -> str:
    """The member the package's single officeDocument relationship targets."""
    destinos = [a.get("Target", "") for a in _elementos(xml_bytes, "Relationship")
                if a.get("Type") == _OFFICE_DOCUMENT and a.get("TargetMode") != "External"]
    if len(destinos) != 1 or not destinos[0]:
        raise _no_office()
    destino = posixpath.normpath(destinos[0].lstrip("/"))
    if destino.startswith(".."):
        raise _no_office()
    return destino
