import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Student } from '../types';

export interface GenerateCardParams {
  schoolName: string;
  student: Student;
  className: string;
  headmasterName?: string;
  academicYear?: string;
}

/**
 * Generates and triggers the direct download of a professional, print-ready
 * PDF Student ID Card with the school name, student photo, father's name,
 * class, roll number (leading zeros preserved), address, and scannable QR code.
 */
export async function downloadStudentIDCardPDF({
  schoolName,
  student,
  className,
  headmasterName = 'Headmaster',
  academicYear = '2026-2027',
}: GenerateCardParams): Promise<{ success: boolean; fileName: string }> {
  // CR80 Standard ID Card dimensions: 85.6mm x 54mm (landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 54],
    compress: true,
  });

  const cardWidth = 85.6;
  const cardHeight = 54;

  // Background card base
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(0, 0, cardWidth, cardHeight, 2, 2, 'F');

  // Outer border line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.roundedRect(0.5, 0.5, cardWidth - 1, cardHeight - 1, 2, 2, 'D');

  // Top Header Banner (Deep Navy #0B192C)
  doc.setFillColor(11, 25, 44);
  doc.rect(0.5, 0.5, cardWidth - 1, 10.5, 'F');

  // Emerald accent stripe
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0.5, 11, cardWidth - 1, 0.8, 'F');

  // School Name text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const cleanSchool = (schoolName || 'SchoolSync Academy').toUpperCase();
  doc.text(cleanSchool, cardWidth / 2, 5.5, { align: 'center', maxWidth: 78 });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(209, 250, 229); // emerald-100
  doc.text(`STUDENT IDENTITY CARD  |  SESSION ${academicYear}`, cardWidth / 2, 9, { align: 'center' });

  // 1. Student Photo (Left column: x: 4, y: 13.5, w: 21, h: 25)
  const photoX = 4;
  const photoY = 13.5;
  const photoW = 21;
  const photoH = 25;

  let photoAdded = false;
  if (student.photoUrl && student.photoUrl.startsWith('data:image/')) {
    try {
      const format = student.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(student.photoUrl, format, photoX, photoY, photoW, photoH);
      photoAdded = true;
    } catch (err) {
      console.warn('Failed to render student photo in PDF, using avatar fallback:', err);
    }
  }

  if (!photoAdded) {
    // Placeholder photo box
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(photoX, photoY, photoW, photoH, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(photoX, photoY, photoW, photoH, 'D');

    // Initials in center
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    const initials = student.fullName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ST';
    doc.text(initials, photoX + photoW / 2, photoY + photoH / 2 + 2, { align: 'center' });
  } else {
    // Photo border
    doc.setDrawColor(203, 213, 225);
    doc.rect(photoX, photoY, photoW, photoH, 'D');
  }

  // Roll Number Badge under Photo
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(photoX, 39.5, photoW, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.text(`ROLL: ${student.rollNumber}`, photoX + photoW / 2, 43, { align: 'center' });

  // 2. Middle Column: Student Information Details
  const infoX = 27.5;
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(student.fullName, infoX, 17, { maxWidth: 33 });

  // Class & Section
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`Class: ${className}`, infoX, 21.5);

  // Father's Name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Father:', infoX, 25.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(student.guardianName || '—', infoX + 9, 25.8, { maxWidth: 24 });

  // Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Address:', infoX, 29.8);
  doc.setTextColor(30, 41, 59);
  const addressText = student.address || '—';
  doc.text(addressText, infoX, 33.2, { maxWidth: 32 });

  // Status
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Status: Active Student', infoX, 43);

  // 3. Right Column: High-Resolution Scannable QR Code
  const qrX = 61.5;
  const qrY = 13.5;
  const qrSize = 20;

  try {
    const qrDataUrl = await QRCode.toDataURL(student.qrCodeToken, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0B192C',
        light: '#FFFFFF',
      },
    });
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  } catch (err) {
    console.error('Failed to generate QR code for PDF:', err);
  }

  // QR Frame & Scan Label
  doc.setDrawColor(226, 232, 240);
  doc.rect(qrX, qrY, qrSize, qrSize, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('OFFICIAL PASS', qrX + qrSize / 2, 35.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.text('SCAN TO ATTEND', qrX + qrSize / 2, 38, { align: 'center' });

  // 4. Bottom Footer Strip (Divider line, Headmaster name & Authorized signature)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(4, 45.5, cardWidth - 4, 45.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Headmaster: ${headmasterName}`, 4, 49.5);

  // Signature line on right
  doc.line(58, 49, cardWidth - 4, 49);
  doc.setFontSize(4.5);
  doc.text('Authorized Signature', cardWidth - 4, 51.5, { align: 'right' });

  // Save / Trigger Download
  const safeName = student.fullName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeName}_Roll_${student.rollNumber}_ID_Card.pdf`;
  doc.save(fileName);

  return { success: true, fileName };
}
