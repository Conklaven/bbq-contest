import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { DatabaseService, Team, Item } from '@/lib/db';

export async function generateQRPackPDF(): Promise<Uint8Array> {
  try {
    // Get all teams
    const teams = await DatabaseService.getTeams();
    console.log(`Found ${teams.length} teams`);

    // Create items for each team's categories if they don't exist
    await createItemsForTeams(teams);

    // Get updated items (including newly created ones)
    const items = await DatabaseService.getItems();
    console.log(`Total items for PDF generation: ${items.length}`);

    // Log each item being processed
    items.forEach((item, index) => {
      const team = teams.find(t => t.id === item.teamId);
      console.log(
        `Item ${index + 1}: ${item.itemCode} - ${team?.name || 'Unknown'} - ${item.category}`
      );
    });

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    console.log(`Starting PDF generation with ${items.length} items`);

    // Group items by team
    const itemsByTeam = items.reduce(
      (acc, item) => {
        const team = teams.find(t => t.id === item.teamId);
        if (team) {
          if (!acc[team.id]) {
            acc[team.id] = { team, items: [] };
          }
          acc[team.id].items.push(item);
        }
        return acc;
      },
      {} as Record<string, { team: Team; items: Item[] }>
    );

    console.log(`Grouped items by ${Object.keys(itemsByTeam).length} teams`);

    // Create a page for each team
    for (const [, teamData] of Object.entries(itemsByTeam)) {
      const { team, items: teamItems } = teamData;

      console.log(
        `Creating page for team: ${team.name} with ${teamItems.length} items`
      );

      const currentPage = pdfDoc.addPage([612, 792]); // US Letter size
      let yPosition = 750;

      // Add team header
      currentPage.drawText(`Team: ${team.name}`, {
        x: 50,
        y: yPosition,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      yPosition -= 50;

      // Add each item for this team
      for (let i = 0; i < teamItems.length; i++) {
        const item = teamItems[i];

        console.log(
          `Adding item ${i + 1}/${teamItems.length} for ${team.name}: ${item.itemCode} - ${item.category}`
        );

        // Calculate grid position (2x2 grid)
        const gridRow = Math.floor(i / 2);
        const gridCol = i % 2;

        // Calculate positions for 2x2 grid
        const qrX = 50 + gridCol * 280; // 50px margin + 280px spacing between columns
        const qrY = yPosition - gridRow * 300 - 100; // Start 100px below header, 300px between rows
        const textX = qrX + 120; // Text starts 120px to the right of QR code

        // Generate QR code
        const qrCodeDataURL = await QRCode.toDataURL(item.itemCode, {
          width: 100,
          margin: 2,
        });

        // Convert data URL to image
        const qrCodeImageBytes = Uint8Array.from(
          atob(qrCodeDataURL.split(',')[1]),
          c => c.charCodeAt(0)
        );
        const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);

        // Add QR code to page
        currentPage.drawImage(qrCodeImage, {
          x: qrX,
          y: qrY,
          width: 100,
          height: 100,
        });

        // Add text information
        currentPage.drawText(`Category: ${item.category}`, {
          x: textX,
          y: qrY + 80,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        currentPage.drawText(`Item Code: ${item.itemCode}`, {
          x: textX,
          y: qrY + 60,
          size: 14,
          font: boldFont,
          color: rgb(0.2, 0.4, 0.8),
        });

        console.log(
          `Added item ${i + 1} to ${team.name}'s page at grid position (${gridRow}, ${gridCol})`
        );
      }
    }

    console.log(
      `PDF generation complete. Total items in PDF: ${items.length}, Total pages: ${pdfDoc.getPageCount()}`
    );
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating QR pack:', error);
    throw error;
  }
}

async function createItemsForTeams(teams: Team[]): Promise<void> {
  try {
    const existingItems = await DatabaseService.getItems();
    console.log(`Found ${existingItems.length} existing items`);
    console.log(`Processing ${teams.length} teams`);

    let createdCount = 0;

    for (const team of teams) {
      console.log(
        `Processing team: ${team.name} with categories: ${team.categories.join(', ')}`
      );

      for (const category of team.categories) {
        // Check if item already exists for this team and category
        const existingItem = existingItems.find(
          item => item.teamId === team.id && item.category === category
        );

        if (!existingItem) {
          // Generate unique item code
          const itemCode = generateUniqueItemCode(existingItems);

          // Create new item
          await DatabaseService.createItem({
            teamId: team.id,
            category: category,
            itemCode: itemCode,
          });

          // Add to existing items array for next iteration
          existingItems.push({
            id: '', // Will be set by Firestore
            teamId: team.id,
            category: category,
            itemCode: itemCode,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          createdCount++;
          console.log(
            `Created item: ${itemCode} for ${team.name} - ${category}`
          );
        } else {
          console.log(
            `Item already exists for ${team.name} - ${category}: ${existingItem.itemCode}`
          );
        }
      }
    }

    console.log(`Total items created: ${createdCount}`);
    console.log(`Total items after creation: ${existingItems.length}`);
  } catch (error) {
    console.error('Error creating items for teams:', error);
    throw error;
  }
}

function generateUniqueItemCode(existingItems: Item[]): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code is unique
    if (!existingItems.some(item => item.itemCode === result)) {
      return result;
    }

    attempts++;
  }

  throw new Error('Unable to generate unique item code after 100 attempts');
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
