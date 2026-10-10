import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

# Project root (three levels up from this file)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GENERATED_DIR = os.path.join(BASE_DIR, "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

# Brand colors
NAVY = colors.HexColor("#102F55")
GOLD = colors.HexColor("#C49A36")
IVORY = colors.HexColor("#FFFDF6")
MUTED = colors.HexColor("#526176")


def generate_certificate(
    recipient_name: str,
    event_name: str,
    completion_date: str,
    certificate_id: str,
    company_name: str,
) -> str:
    filename = f"{certificate_id}.pdf"
    file_path = os.path.join(GENERATED_DIR, filename)

    page_width, page_height = landscape(A4)
    pdf = canvas.Canvas(file_path, pagesize=landscape(A4))

    # Background
    pdf.setFillColor(IVORY)
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)

    # Outer navy border
    pdf.setStrokeColor(NAVY)
    pdf.setLineWidth(5)
    pdf.rect(22, 22, page_width - 44, page_height - 44)

    # Inner gold border
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(1.5)
    pdf.rect(32, 32, page_width - 64, page_height - 64)

    center = page_width / 2

    # Decorative corner triangles
    pdf.setFillColor(NAVY)

    # Top-left
    path = pdf.beginPath()
    path.moveTo(35, page_height - 35)
    path.lineTo(155, page_height - 35)
    path.lineTo(35, page_height - 110)
    path.close()
    pdf.drawPath(path, fill=1, stroke=0)

    # Bottom-right
    path = pdf.beginPath()
    path.moveTo(page_width - 35, 35)
    path.lineTo(page_width - 155, 35)
    path.lineTo(page_width - 35, 110)
    path.close()
    pdf.drawPath(path, fill=1, stroke=0)

    # Company name
    pdf.setFillColor(NAVY)
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawCentredString(center, page_height - 75, company_name[:70])

    # Small gold divider under company name
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(2)
    pdf.line(center - 70, page_height - 88, center + 70, page_height - 88)

    # Main heading
    pdf.setFillColor(NAVY)
    pdf.setFont("Times-Bold", 32)
    pdf.drawCentredString(center, page_height - 145, "CERTIFICATE")

    pdf.setFillColor(GOLD)
    pdf.setFont("Times-Roman", 18)
    pdf.drawCentredString(center, page_height - 174, "OF COMPLETION")

    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(center, page_height - 210, "THIS IS TO CERTIFY THAT")

    # Recipient name – shrink font a bit if the name is long
    name = recipient_name.strip()[:65]
    name_font = 30 if len(name) <= 28 else 22

    pdf.setFillColor(NAVY)
    pdf.setFont("Times-Italic", name_font)
    pdf.drawCentredString(center, page_height - 255, name)

    # Gold line under the name
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(1)
    pdf.line(100, page_height - 268, page_width - 100, page_height - 268)

    # Completion text
    pdf.setFillColor(MUTED)
    pdf.setFont("Times-Roman", 13)
    pdf.drawCentredString(center, page_height - 300, "has successfully completed")

    event = event_name.strip()
    event_font = 19 if len(event) <= 38 else 14

    pdf.setFillColor(NAVY)
    pdf.setFont("Helvetica-Bold", event_font)
    pdf.drawCentredString(center, page_height - 329, event[:90])

    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 10)
    pdf.drawCentredString(
        center,
        page_height - 350,
        "In recognition of dedication, effort, and successful completion.",
    )

    # Date section (bottom left)
    pdf.setFillColor(NAVY)
    pdf.setFont("Times-Roman", 12)
    pdf.drawCentredString(155, 95, str(completion_date))

    pdf.setStrokeColor(GOLD)
    pdf.line(90, 85, 220, 85)

    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawCentredString(155, 70, "COMPLETION DATE")

    # Certificate ID
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(center, 48, f"Certificate ID: {certificate_id}")

    # Gold achievement seal (bottom right)
    seal_x = page_width - 145
    seal_y = 105

    pdf.setFillColor(GOLD)
    pdf.circle(seal_x, seal_y, 35, fill=1, stroke=0)

    pdf.setStrokeColor(IVORY)
    pdf.setLineWidth(1.5)
    pdf.circle(seal_x, seal_y, 29, fill=0, stroke=1)

    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawCentredString(seal_x, seal_y + 7, "EXCELLENCE")
    pdf.drawCentredString(seal_x, seal_y - 4, "RECOGNIZED")

    pdf.showPage()
    pdf.save()

    return file_path