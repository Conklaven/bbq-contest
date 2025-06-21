import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DatabaseService, Item } from './db';

export async function generateQRPackPDF(): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // US Letter size
  const { height } = page.getSize();

  // Get all items and teams
  const items = await DatabaseService.getItems();
  const teams = await DatabaseService.getTeams();

  // Create a map of team names for easy lookup
  const teamMap = new Map(teams.map(team => [team.id, team.name]));

  // Group items by team
  const itemsByTeam = new Map<string, Item[]>();
  items.forEach(item => {
    if (!itemsByTeam.has(item.teamId)) {
      itemsByTeam.set(item.teamId, []);
    }
    itemsByTeam.get(item.teamId)!.push(item);
  });

  let yOffset = height - 50; // Start from top with margin
  const qrSize = 100;
  const margin = 20;
  const itemsPerRow = 2;
  const rowHeight = qrSize + 60; // QR code + text

  // Add title
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('BBQ Contest QR Codes', {
    x: 50,
    y: yOffset,
    size: 24,
    font: titleFont,
    color: rgb(0, 0, 0),
  });
  yOffset -= 40;

  for (const [teamId, teamItems] of itemsByTeam) {
    const teamName = teamMap.get(teamId) || 'Unknown Team';

    // Check if we need a new page
    if (yOffset < 100) {
      page = pdfDoc.addPage([612, 792]);
      yOffset = height - 50;
    }

    // Add team header
    const teamFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    page.drawText(teamName, {
      x: 50,
      y: yOffset,
      size: 16,
      font: teamFont,
      color: rgb(0.2, 0.2, 0.8),
    });
    yOffset -= 30;

    // Add items for this team
    for (let i = 0; i < teamItems.length; i += itemsPerRow) {
      // Check if we need a new page
      if (yOffset < 150) {
        page = pdfDoc.addPage([612, 792]);
        yOffset = height - 50;
      }

      const rowItems = teamItems.slice(i, i + itemsPerRow);

      for (let j = 0; j < rowItems.length; j++) {
        const item = rowItems[j];
        const x = 50 + j * (qrSize + margin + 200); // 200 for text area

        // Generate QR code
        const qrDataURL = await QRCode.toDataURL(item.itemCode, {
          width: qrSize,
          margin: 1,
        });

        // Convert data URL to image
        const qrImageBytes = Uint8Array.from(atob(qrDataURL.split(',')[1]), c =>
          c.charCodeAt(0)
        );
        const qrImage = await pdfDoc.embedPng(qrImageBytes);

        // Draw QR code
        page.drawImage(qrImage, {
          x,
          y: yOffset - qrSize,
          width: qrSize,
          height: qrSize,
        });

        // Draw item details
        const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(`Code: ${item.itemCode}`, {
          x: x + qrSize + 10,
          y: yOffset - 20,
          size: 12,
          font: textFont,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Category: ${item.category}`, {
          x: x + qrSize + 10,
          y: yOffset - 40,
          size: 12,
          font: textFont,
          color: rgb(0, 0, 0),
        });
      }

      yOffset -= rowHeight + 20;
    }

    yOffset -= 20; // Extra space between teams
  }

  // Save the PDF
  return await pdfDoc.save();
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
