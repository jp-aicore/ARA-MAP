"""Bounded recognition of Word (.docx) and Excel (.xlsx) attachments."""

from __future__ import annotations

import io
import unittest
import zipfile

import server  # noqa: F401 - enables the bundled openpyxl, used to write a real workbook
from server import kmz, office
from tests import office_paquetes as op


def real_xlsx() -> bytes:
    """A workbook written by openpyxl (vendored), not by hand."""
    from openpyxl import Workbook

    libro = Workbook()
    libro.active["A1"] = "Terreno ficticio"
    salida = io.BytesIO()
    libro.save(salida)
    return salida.getvalue()


class OfficeRecognition(unittest.TestCase):
    def refused(self, data: bytes, fragment: str = "") -> None:
        with self.assertRaises(office.OfficeError) as caught:
            office.formato_office(data)
        self.assertIn(fragment, caught.exception.mensaje)

    def test_docx_and_xlsx_are_told_apart_by_their_structure(self):
        self.assertEqual(office.formato_office(op.docx()), "docx")
        self.assertEqual(office.formato_office(op.xlsx()), "xlsx")
        self.assertEqual(office.formato_office(real_xlsx()), "xlsx")

    def test_a_renamed_zip_kmz_pdf_or_legacy_file_is_not_office(self):
        kmz_data = op.paquete({"doc.kml": b"<kml/>"})
        for data in (op.zip_cualquiera(), kmz_data, b"%PDF-1.4\n%%EOF",
                     b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + bytes(504),   # .doc/.xls (OLE)
                     b"", b"PK\x03\x04 truncado"):
            with self.subTest(data[:8]):
                self.refused(data)

    def test_macro_template_and_unknown_main_parts_are_refused(self):
        for main in (op.DOCM_MAIN, op.XLSM_MAIN,
                     "application/vnd.openxmlformats-officedocument.wordprocessingml."
                     "template.main+xml", "application/xml"):
            with self.subTest(main):
                data = op.docx(**{"[Content_Types].xml":
                                  op.content_types("word/document.xml", main)})
                self.refused(data, "ni un libro Excel")
        self.refused(op.docx(**{"word/vbaProject.bin": b"\x00"}), "macros")
        self.refused(op.xlsx(**{"xl/vbaProject.bin": b"\x00"}), "macros")

    def test_relationship_must_name_an_existing_main_part(self):
        for cambio in ({"_rels/.rels": op.rels("word/otro.xml")},
                       {"_rels/.rels": op.rels("../fuera.xml")},
                       {"_rels/.rels": b"<Relationships/>"}):
            with self.subTest(cambio):
                self.refused(op.docx(**cambio))
        sin_rels = op.paquete({"[Content_Types].xml":
                               op.content_types("word/document.xml", op.DOCX_MAIN),
                               "word/document.xml": b"<w/>"})
        self.refused(sin_rels)
        # A Word main part declared under the workbook's name is still Word, not Excel.
        mezcla = op.xlsx(**{"[Content_Types].xml":
                            op.content_types("xl/workbook.xml", op.DOCX_MAIN)})
        self.assertEqual(office.formato_office(mezcla), "docx")

    def test_dtd_entities_and_oversized_parts_are_refused_unparsed(self):
        bomba = (b'<?xml version="1.0"?><!DOCTYPE t [<!ENTITY a "aaaa">]>'
                 b'<Types>&a;</Types>')
        self.refused(op.docx(**{"[Content_Types].xml": bomba}))
        grande = b"<Types>" + b" " * (office.MAX_PARTE_BYTES + 1) + b"</Types>"
        self.refused(op.docx(**{"[Content_Types].xml": grande}))

    def test_member_count_is_bounded_like_a_kmz(self):
        extra = {f"relleno/{i}.xml": b"" for i in range(kmz.MAX_ENTRADAS)}
        self.refused(op.docx(**extra))

    def test_encrypted_member_is_reported(self):
        data = bytearray(op.docx())
        # Flag the [Content_Types].xml entry as encrypted in its central header.
        central = data.find(b"PK\x01\x02")
        while central >= 0:
            largo = int.from_bytes(data[central + 28:central + 30], "little")
            if data[central + 46:central + 46 + largo] == b"[Content_Types].xml":
                data[central + 8] |= 0x1
            central = data.find(b"PK\x01\x02", central + 4)
        with zipfile.ZipFile(io.BytesIO(bytes(data))) as zf:
            self.assertTrue(zf.getinfo("[Content_Types].xml").flag_bits & 0x1)
        self.refused(bytes(data), "contraseña")


if __name__ == "__main__":
    unittest.main()
