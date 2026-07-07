/**
 * CV Download utilities — TXT and PDF
 */

export function downloadAsTxt(text: string, filename = 'my-cv.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAsPdf(text: string, filename = 'my-cv.pdf') {
  const { jsPDF } = await import('jspdf');

  // Create standard A4 document
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;
  const lineHeight = 5.2;

  // Professional color palette
  const COLOR_PRIMARY = [30, 41, 59];    // Slate 800 (Headers)
  const COLOR_SECONDARY = [71, 85, 105]; // Slate 600 (Subheaders & Lines)
  const COLOR_TEXT = [15, 23, 42];      // Slate 900 (Main text)
  const COLOR_ACCENT = [79, 70, 229];    // Indigo 600 (Highlights/[IMPROVED] indicators)

  // Split lines and clean them
  const rawLines = text.split('\n');
  const lines: string[] = [];
  
  // Clean up excessive empty lines
  let lastWasEmpty = false;
  for (let line of rawLines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (!lastWasEmpty) {
        lines.push('');
        lastWasEmpty = true;
      }
    } else {
      lines.push(trimmed);
      lastWasEmpty = false;
    }
  }

  // Find candidate name and contact details (assume first 2-4 lines are headers)
  let nameLine = '';
  let contactLines: string[] = [];
  let startIndex = 0;

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (line === '') continue;

    // Clean markdown links and headers out of the name/contact section check
    const cleanedLine = line
      .replace(/^#+\s*/, '') // Strip heading #
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Strip markdown links
      .replace(/\*\*/g, '') // Strip bold markdown
      .replace('[IMPROVED]', '')
      .trim();

    if (!nameLine) {
      nameLine = cleanedLine;
      startIndex = i + 1;
    } else if (
      cleanedLine.includes('@') || // email
      cleanedLine.includes('|') || // dividers
      cleanedLine.match(/\+?\d[\d-\s()]{7,}\d/) || // phone numbers
      cleanedLine.toLowerCase().includes('linkedin.com') ||
      cleanedLine.toLowerCase().includes('github.com')
    ) {
      contactLines.push(cleanedLine);
      startIndex = i + 1;
    } else {
      break;
    }
  }

  // --- Draw Professional Header ---
  if (nameLine) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(nameLine, pageWidth / 2, y, { align: 'center' });
    y += 6.5;

    if (contactLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      
      const mergedContacts = contactLines.join('  |  ');
      const contactWords = doc.splitTextToSize(mergedContacts, maxWidth);
      for (const w of contactWords) {
        doc.text(w, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
    }
    y += 2; // Spacer
    
    // Draw thin elegant line below header
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  } else {
    startIndex = 0;
  }

  // --- Render Remaining Sections ---
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      y += 2.5; 
      continue;
    }

    // 1. Check for Horizontal Rule (e.g. ---)
    if (trimmed.match(/^---+$/)) {
      y += 2.5;
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      continue;
    }

    // 2. Check for Markdown Headers (starts with #)
    let isHeader = false;
    let cleanLineText = trimmed;
    if (trimmed.startsWith('#')) {
      isHeader = true;
      cleanLineText = trimmed.replace(/^#+\s*/, '');
    }

    // Standard detection if it's all uppercase and short (backup check)
    const isSectionHeader = isHeader || 
      (cleanLineText === cleanLineText.toUpperCase() && cleanLineText.length > 2 && /[A-Z]/.test(cleanLineText) && cleanLineText.length < 45) ||
      (cleanLineText.endsWith(':') && cleanLineText.length < 35);

    const isImproved = cleanLineText.startsWith('[IMPROVED]');
    const contentText = cleanLineText.replace('[IMPROVED]', '').trim();

    if (isSectionHeader) {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margin;
      }

      y += 3.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      
      if (isImproved) {
        doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
      } else {
        doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
      }

      doc.text(contentText, margin, y);

      // Underline section
      y += 1.5;
      doc.setDrawColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
      doc.setLineWidth(0.25);
      doc.line(margin, y, pageWidth - margin, y);
      
      y += 5;
    } else {
      // 3. Normal paragraph lines with Markdown features (Bold, links)
      // Strip markdown link URL structures: e.g. [text](url) -> text
      let processedLine = contentText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

      // Check if it's a list item
      const isBullet = processedLine.startsWith('•') || processedLine.startsWith('-') || processedLine.startsWith('*');
      if (isBullet) {
        // Strip out the start bullet tag so we can render it aligned
        processedLine = processedLine.substring(1).trim();
      }

      // Left margins based on bullet points
      const leftIndent = isBullet ? margin + 4.5 : margin;
      const textWidth = isBullet ? maxWidth - 4.5 : maxWidth;

      // Helper to split a styled markdown line into spans: { text, bold }
      const parseBoldSpans = (textSpan: string) => {
        const parts = textSpan.split('**');
        return parts.map((part, index) => ({
          text: part,
          bold: index % 2 !== 0 // Odd indices are surrounded by **
        }));
      };

      // Split the current line into words/spaces while preserving styled spans
      const spans = parseBoldSpans(processedLine);
      const wordTokens: { text: string; bold: boolean; spaceAfter: boolean }[] = [];

      for (const span of spans) {
        const words = span.text.split(' ');
        for (let wIdx = 0; wIdx < words.length; wIdx++) {
          const word = words[wIdx];
          const spaceAfter = wIdx < words.length - 1;
          wordTokens.push({
            text: word,
            bold: span.bold,
            spaceAfter
          });
        }
      }

      // Render tokens with wrapping logic
      let currentX = leftIndent;

      // Render bullet point marker
      if (isBullet) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.2);
        if (isImproved) {
          doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
        } else {
          doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
        }
        doc.text('•', margin + 1, y);
      }

      // Render words token-by-token
      for (const token of wordTokens) {
        if (token.text === '' && !token.spaceAfter) continue;

        doc.setFontSize(9.2);
        if (isImproved) {
          doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
          doc.setTextColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
        } else {
          doc.setFont('helvetica', token.bold ? 'bold' : 'normal');
          doc.setTextColor(token.bold ? COLOR_PRIMARY[0] : COLOR_TEXT[0], token.bold ? COLOR_PRIMARY[1] : COLOR_TEXT[1], token.bold ? COLOR_PRIMARY[2] : COLOR_TEXT[2]);
        }

        const tokenText = token.text + (token.spaceAfter ? ' ' : '');
        const tokenWidth = doc.getTextWidth(tokenText);

        // Word wrap check
        if (currentX + tokenWidth > margin + textWidth) {
          y += lineHeight;
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          currentX = leftIndent;
        }

        doc.text(token.text, currentX, y);
        currentX += doc.getTextWidth(token.text);
        if (token.spaceAfter) {
          currentX += doc.getTextWidth(' ');
        }
      }

      y += lineHeight; // Advance line
    }
  }

  // --- Clean footers ---
  const pagesCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pagesCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pagesCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  doc.save(filename);
}
